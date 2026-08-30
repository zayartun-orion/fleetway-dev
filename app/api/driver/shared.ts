import { env } from "cloudflare:workers";
import { cookies } from "next/headers";

export const DRIVER_COOKIE = "fleetway_driver_session";

export async function sha256(value:string){
  const bytes=new TextEncoder().encode(value);
  const digest=await crypto.subtle.digest("SHA-256",bytes);
  return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");
}

export async function ensureDriverTables(){
  const db=env.DB;
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS driver_sessions (id INTEGER PRIMARY KEY AUTOINCREMENT, driver_id INTEGER NOT NULL, token_hash TEXT NOT NULL UNIQUE, expires_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS attendance_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, driver_id INTEGER NOT NULL, work_date TEXT NOT NULL, check_in_at TEXT NOT NULL, check_in_latitude REAL, check_in_longitude REAL, check_out_at TEXT, check_out_latitude REAL, check_out_longitude REAL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_attendance_driver_date ON attendance_logs(driver_id,work_date)"),
    db.prepare("CREATE TABLE IF NOT EXISTS driver_trip_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, schedule_id INTEGER NOT NULL UNIQUE, driver_id INTEGER NOT NULL, loading_started_at TEXT, departed_at TEXT, unloading_started_at TEXT, completed_at TEXT, start_odometer_km INTEGER, end_odometer_km INTEGER, fuel_litres REAL, fuel_cost REAL, last_latitude REAL, last_longitude REAL, last_location_at TEXT, notes TEXT)"),
    db.prepare("CREATE TABLE IF NOT EXISTS driver_location_updates (id INTEGER PRIMARY KEY AUTOINCREMENT, trip_log_id INTEGER NOT NULL, recorded_at TEXT NOT NULL, latitude REAL NOT NULL, longitude REAL NOT NULL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_driver_locations_trip_time ON driver_location_updates(trip_log_id,recorded_at)"),
    db.prepare("CREATE TABLE IF NOT EXISTS driver_checkpoints (id INTEGER PRIMARY KEY AUTOINCREMENT, trip_log_id INTEGER NOT NULL, driver_id INTEGER NOT NULL, checkpoint_type TEXT NOT NULL, recorded_at TEXT NOT NULL, latitude REAL NOT NULL, longitude REAL NOT NULL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_driver_checkpoints_trip_type_time ON driver_checkpoints(trip_log_id,checkpoint_type,recorded_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_driver_checkpoints_driver_time ON driver_checkpoints(driver_id,recorded_at)"),
    db.prepare("CREATE TABLE IF NOT EXISTS driver_trip_photos (id INTEGER PRIMARY KEY AUTOINCREMENT, trip_log_id INTEGER NOT NULL, photo_type TEXT NOT NULL, object_key TEXT NOT NULL UNIQUE, file_name TEXT NOT NULL, content_type TEXT NOT NULL, uploaded_at TEXT NOT NULL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_driver_trip_photos_trip ON driver_trip_photos(trip_log_id)"),
  ]);
  const checkpointIndexes=await db.prepare("PRAGMA index_list(driver_checkpoints)").all<{name:string}>();
  if(checkpointIndexes.results.some(i=>i.name==="idx_driver_checkpoints_trip_type"))await db.prepare("DROP INDEX idx_driver_checkpoints_trip_type").run();
  const columns=await db.prepare("PRAGMA table_info(people)").all<{name:string}>();
  if(!columns.results.some(c=>c.name==="driver_pin_hash")) await db.prepare("ALTER TABLE people ADD COLUMN driver_pin_hash TEXT").run();
  return db;
}

export async function currentDriver(){
  const db=await ensureDriverTables();
  const token=(await cookies()).get(DRIVER_COOKIE)?.value;
  if(!token)return null;
  const tokenHash=await sha256(token);
  return db.prepare("SELECT p.id,p.name,p.phone,p.driving_license FROM driver_sessions s JOIN people p ON p.id=s.driver_id WHERE s.token_hash=? AND s.expires_at>? AND p.role='Driver'").bind(tokenHash,new Date().toISOString()).first<{id:number;name:string;phone:string;driving_license:string}>();
}
