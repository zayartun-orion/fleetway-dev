import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { currentDriver, ensureDriverTables } from "../shared";

const allowed=new Set(["image/jpeg","image/png","image/webp"]),maxSize=8*1024*1024;

export async function POST(request:Request){
  const driver=await currentDriver();if(!driver)return Response.json({error:"Unauthorized"},{status:401});
  const db=await ensureDriverTables(),form=await request.formData(),file=form.get("photo"),scheduleId=Number(form.get("scheduleId")),photoType=String(form.get("photoType")||"");
  if(!(file instanceof File)||!scheduleId||!["mileage","fuel"].includes(photoType))return Response.json({error:"Photo, route and photo type are required"},{status:400});
  if(!allowed.has(file.type)||file.size>maxSize)return Response.json({error:"Use a JPG, PNG or WebP photo up to 8 MB"},{status:400});
  const schedule=await db.prepare("SELECT id FROM schedules WHERE id=? AND driver_id=?").bind(scheduleId,driver.id).first();if(!schedule)return Response.json({error:"Assigned route not found"},{status:404});
  await db.prepare("INSERT OR IGNORE INTO driver_trip_logs (schedule_id,driver_id) VALUES (?,?)").bind(scheduleId,driver.id).run();
  const trip=await db.prepare("SELECT id FROM driver_trip_logs WHERE schedule_id=? AND driver_id=?").bind(scheduleId,driver.id).first<{id:number}>();if(!trip)return Response.json({error:"Trip report unavailable"},{status:500});
  const ext=file.type==="image/png"?"png":file.type==="image/webp"?"webp":"jpg",key=`driver-trips/${trip.id}/${photoType}-${crypto.randomUUID()}.${ext}`;
  await env.FILES.put(key,file.stream(),{httpMetadata:{contentType:file.type,cacheControl:"private, max-age=3600"},customMetadata:{driverId:String(driver.id),scheduleId:String(scheduleId),photoType}});
  await db.prepare("INSERT INTO driver_trip_photos (trip_log_id,photo_type,object_key,file_name,content_type,uploaded_at) VALUES (?,?,?,?,?,?)").bind(trip.id,photoType,key,file.name,file.type,new Date().toISOString()).run();
  return Response.json({ok:true,type:photoType});
}

export async function GET(request:Request){
  const db=await ensureDriverTables(),key=new URL(request.url).searchParams.get("key");if(!key)return new Response("Missing photo",{status:400});
  const photo=await db.prepare("SELECT p.object_key,t.driver_id FROM driver_trip_photos p JOIN driver_trip_logs t ON t.id=p.trip_log_id WHERE p.object_key=?").bind(key).first<{object_key:string;driver_id:number}>();if(!photo)return new Response("Not found",{status:404});
  const driver=await currentDriver(),manager=driver?null:await getChatGPTUser();if((!driver||driver.id!==photo.driver_id)&&!manager)return new Response("Unauthorized",{status:401});
  const object=await env.FILES.get(key);if(!object)return new Response("Not found",{status:404});
  const headers=new Headers();object.writeHttpMetadata(headers);headers.set("Cache-Control","private, max-age=3600");return new Response(object.body,{headers});
}
