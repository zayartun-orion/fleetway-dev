import { currentDriver, ensureDriverTables } from "./shared";

const today=()=>new Date().toISOString().slice(0,10);
export async function GET(){
  const driver=await currentDriver();if(!driver)return Response.json({error:"Unauthorized"},{status:401});
  const db=await ensureDriverTables();
  const [attendance,schedules]=await Promise.all([
    db.prepare("SELECT * FROM attendance_logs WHERE driver_id=? AND work_date=? ORDER BY id DESC LIMIT 1").bind(driver.id,today()).first(),
    db.prepare("SELECT s.*,r.code route_code,r.origin,r.destination,r.estimated_departure,r.estimated_arrival,v.plate,v.type vehicle_type,(SELECT GROUP_CONCAT(rg.customer || ': ' || rg.goods,' • ') FROM route_goods rg WHERE rg.route_id=r.id) cargo_summary,t.id trip_log_id,t.loading_started_at,t.departed_at,t.unloading_started_at,t.completed_at,t.start_odometer_km,t.end_odometer_km,t.fuel_litres,t.fuel_cost,t.last_latitude,t.last_longitude,t.last_location_at,(SELECT recorded_at FROM driver_checkpoints c WHERE c.trip_log_id=t.id AND c.checkpoint_type='going_to_loading') going_to_loading_at,(SELECT recorded_at FROM driver_checkpoints c WHERE c.trip_log_id=t.id AND c.checkpoint_type='arrived_loading') arrived_loading_at,(SELECT recorded_at FROM driver_checkpoints c WHERE c.trip_log_id=t.id AND c.checkpoint_type='waiting_loading') waiting_loading_at,(SELECT recorded_at FROM driver_checkpoints c WHERE c.trip_log_id=t.id AND c.checkpoint_type='arrived_unloading') arrived_unloading_at,(SELECT recorded_at FROM driver_checkpoints c WHERE c.trip_log_id=t.id AND c.checkpoint_type='waiting_unloading') waiting_unloading_at FROM schedules s JOIN routes r ON r.id=s.route_id JOIN vehicles v ON v.id=s.vehicle_id LEFT JOIN driver_trip_logs t ON t.schedule_id=s.id WHERE s.driver_id=? ORDER BY s.date,s.time").bind(driver.id).all(),
  ]);
  return Response.json({driver,attendance,schedules:schedules.results});
}

export async function POST(request:Request){
  const driver=await currentDriver();if(!driver)return Response.json({error:"Unauthorized"},{status:401});
  const db=await ensureDriverTables();const p=await request.json() as Record<string,string|number|null>;const now=new Date().toISOString();
  const lat=p.latitude==null?null:Number(p.latitude),lng=p.longitude==null?null:Number(p.longitude);
  if(p.action==="checkIn"){if(lat===null||lng===null)return Response.json({error:"GPS location is required to start work. Enable location access and try again."},{status:400});const existing=await db.prepare("SELECT id FROM attendance_logs WHERE driver_id=? AND work_date=? AND check_out_at IS NULL").bind(driver.id,today()).first();if(!existing)await db.prepare("INSERT INTO attendance_logs (driver_id,work_date,check_in_at,check_in_latitude,check_in_longitude) VALUES (?,?,?,?,?)").bind(driver.id,today(),now,lat,lng).run();}
  else if(p.action==="checkOut"){if(lat===null||lng===null)return Response.json({error:"GPS location is required to end work. Enable location access and try again."},{status:400});await db.prepare("UPDATE attendance_logs SET check_out_at=?,check_out_latitude=?,check_out_longitude=? WHERE driver_id=? AND work_date=? AND check_out_at IS NULL").bind(now,lat,lng,driver.id,today()).run();}
  else {
    const scheduleId=Number(p.scheduleId);const schedule=await db.prepare("SELECT id,vehicle_id FROM schedules WHERE id=? AND driver_id=?").bind(scheduleId,driver.id).first<{id:number;vehicle_id:number}>();if(!schedule)return Response.json({error:"Assigned trip not found"},{status:404});
    await db.prepare("INSERT OR IGNORE INTO driver_trip_logs (schedule_id,driver_id) VALUES (?,?)").bind(scheduleId,driver.id).run();
    const trip=await db.prepare("SELECT * FROM driver_trip_logs WHERE schedule_id=? AND driver_id=?").bind(scheduleId,driver.id).first<Record<string,string|number|null>>();if(!trip)return Response.json({error:"Trip report unavailable"},{status:500});
    const checkpoint=async(type:string)=>{if(lat===null||lng===null)return false;await db.batch([db.prepare("INSERT OR IGNORE INTO driver_checkpoints (trip_log_id,driver_id,checkpoint_type,recorded_at,latitude,longitude) VALUES (?,?,?,?,?,?)").bind(trip.id,driver.id,type,now,lat,lng),db.prepare("UPDATE driver_trip_logs SET last_latitude=?,last_longitude=?,last_location_at=? WHERE id=?").bind(lat,lng,now,trip.id),db.prepare("INSERT INTO driver_location_updates (trip_log_id,recorded_at,latitude,longitude) VALUES (?,?,?,?)").bind(trip.id,now,lat,lng)]);return true};
    const checkpointActions:Record<string,string>={goToLoading:"going_to_loading",arriveLoading:"arrived_loading",waitingLoading:"waiting_loading",arriveUnloading:"arrived_unloading",waitingUnloading:"waiting_unloading"};
    if(checkpointActions[String(p.action)]){if(p.action==="goToLoading"&&(!p.odometerKm||Number(p.odometerKm)<0))return Response.json({error:"Starting mileage is required"},{status:400});if(!await checkpoint(checkpointActions[String(p.action)]))return Response.json({error:"GPS location is required for this check-in. Enable location access and try again."},{status:400});if(p.action==="goToLoading")await db.prepare("UPDATE driver_trip_logs SET start_odometer_km=COALESCE(start_odometer_km,?) WHERE id=?").bind(Number(p.odometerKm),trip.id).run();}
    else if(p.action==="startLoading"){if(!await checkpoint("loading_started"))return Response.json({error:"GPS location is required for this check-in. Enable location access and try again."},{status:400});await db.prepare("UPDATE driver_trip_logs SET loading_started_at=COALESCE(loading_started_at,?) WHERE id=?").bind(now,trip.id).run();}
    else if(p.action==="depart"){if(!await checkpoint("departed_loading"))return Response.json({error:"GPS location is required for this check-in. Enable location access and try again."},{status:400});await db.prepare("UPDATE driver_trip_logs SET departed_at=COALESCE(departed_at,?) WHERE id=?").bind(now,trip.id).run();}
    else if(p.action==="startUnloading"){if(!await checkpoint("unloading_started"))return Response.json({error:"GPS location is required for this check-in. Enable location access and try again."},{status:400});await db.prepare("UPDATE driver_trip_logs SET unloading_started_at=COALESCE(unloading_started_at,?) WHERE id=?").bind(now,trip.id).run();}
    else if(p.action==="complete"){
      const endKm=Number(p.odometerKm),litres=Number(p.fuelLitres||0),cost=Number(p.fuelCost||0);if(trip.start_odometer_km===null||endKm<Number(trip.start_odometer_km))return Response.json({error:"Final mileage must be at least the starting mileage"},{status:400});if(!await checkpoint("completed"))return Response.json({error:"GPS location is required for this check-in. Enable location access and try again."},{status:400});
      await db.prepare("UPDATE driver_trip_logs SET completed_at=?,end_odometer_km=?,fuel_litres=?,fuel_cost=?,notes=? WHERE id=?").bind(now,endKm,litres,cost,p.notes||null,trip.id).run();
      if(litres>0)await db.prepare("INSERT INTO mileage_fuel_logs (vehicle_id,recorded_at,odometer_km,petrol_litres,petrol_cost,station,notes) VALUES (?,?,?,?,?,?,?)").bind(schedule.vehicle_id,today(),endKm,litres,cost,"Route report",`Driver route ${scheduleId}`).run();
    } else if(p.action==="location"){
      if(!trip.completed_at&&lat!==null&&lng!==null){await db.batch([db.prepare("UPDATE driver_trip_logs SET last_latitude=?,last_longitude=?,last_location_at=? WHERE id=?").bind(lat,lng,now,trip.id),db.prepare("INSERT INTO driver_location_updates (trip_log_id,recorded_at,latitude,longitude) VALUES (?,?,?,?)").bind(trip.id,now,lat,lng)]);}
    } else return Response.json({error:"Invalid action"},{status:400});
  }
  return Response.json({ok:true});
}
