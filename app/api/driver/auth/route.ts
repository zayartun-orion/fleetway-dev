import { cookies } from "next/headers";
import { currentDriver, DRIVER_COOKIE, ensureDriverTables, sha256 } from "../shared";

export async function GET(){const db=await ensureDriverTables();const drivers=await db.prepare("SELECT id,name FROM people WHERE role='Driver' ORDER BY name").all();return Response.json({driver:await currentDriver(),drivers:drivers.results});}

export async function POST(request:Request){
  const db=await ensureDriverTables();
  const {driverId,pin}=await request.json() as {driverId?:number;pin?:string};
  if(!driverId||!/^\d{4,8}$/.test(pin||""))return Response.json({error:"Driver and 4–8 digit PIN are required"},{status:400});
  const driver=await db.prepare("SELECT id,name,driver_pin_hash FROM people WHERE id=? AND role='Driver'").bind(driverId).first<{id:number;name:string;driver_pin_hash:string|null}>();
  if(!driver)return Response.json({error:"Driver not found"},{status:404});
  const pinHash=await sha256(pin!);
  // Demo onboarding: existing drivers without a PIN may use 1234 once.
  if(!driver.driver_pin_hash){if(pin!=="1234")return Response.json({error:"For this demo, use initial PIN 1234"},{status:401});await db.prepare("UPDATE people SET driver_pin_hash=? WHERE id=?").bind(pinHash,driver.id).run();}
  else if(driver.driver_pin_hash!==pinHash)return Response.json({error:"Incorrect PIN"},{status:401});
  const token=crypto.randomUUID()+crypto.randomUUID(),tokenHash=await sha256(token),expires=new Date(Date.now()+30*24*60*60*1000).toISOString();
  await db.prepare("DELETE FROM driver_sessions WHERE expires_at<=?").bind(new Date().toISOString()).run();
  await db.prepare("INSERT INTO driver_sessions (driver_id,token_hash,expires_at) VALUES (?,?,?)").bind(driver.id,tokenHash,expires).run();
  (await cookies()).set(DRIVER_COOKIE,token,{httpOnly:true,secure:true,sameSite:"lax",path:"/",maxAge:30*24*60*60});
  return Response.json({driver:{id:driver.id,name:driver.name}});
}

export async function DELETE(){(await cookies()).delete(DRIVER_COOKIE);return Response.json({ok:true});}
