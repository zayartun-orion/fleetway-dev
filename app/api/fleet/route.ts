import { env } from "cloudflare:workers";

async function ready() {
  const db = env.DB;
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS vehicles (id INTEGER PRIMARY KEY AUTOINCREMENT, plate TEXT NOT NULL UNIQUE, type TEXT NOT NULL, capacity INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'Available')"),
    db.prepare("CREATE TABLE IF NOT EXISTS people (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, role TEXT NOT NULL, phone TEXT NOT NULL, license_class TEXT, driving_license TEXT, license_expiry TEXT, address TEXT, status TEXT NOT NULL DEFAULT 'Available')"),
    db.prepare("CREATE TABLE IF NOT EXISTS routes (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL UNIQUE, origin TEXT NOT NULL, destination TEXT NOT NULL, distance INTEGER NOT NULL, estimated_departure TEXT, estimated_arrival TEXT)"),
    db.prepare("CREATE TABLE IF NOT EXISTS route_goods (id INTEGER PRIMARY KEY AUTOINCREMENT, route_id INTEGER NOT NULL, goods TEXT NOT NULL, customer TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS mileage_fuel_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, vehicle_id INTEGER NOT NULL, recorded_at TEXT NOT NULL, odometer_km INTEGER NOT NULL, petrol_litres REAL NOT NULL, petrol_cost REAL NOT NULL, station TEXT, notes TEXT)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_mileage_fuel_logs_vehicle_date ON mileage_fuel_logs(vehicle_id, recorded_at DESC)"),
    db.prepare("CREATE TABLE IF NOT EXISTS maintenance_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, vehicle_id INTEGER NOT NULL, service_type TEXT NOT NULL, completed_date TEXT NOT NULL, completed_odometer_km INTEGER, next_due_date TEXT, next_due_odometer_km INTEGER, workshop TEXT, cost REAL NOT NULL DEFAULT 0, notes TEXT)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_maintenance_logs_vehicle_due ON maintenance_logs(vehicle_id, next_due_date)"),
    db.prepare("CREATE TABLE IF NOT EXISTS financial_records (id INTEGER PRIMARY KEY AUTOINCREMENT, schedule_id INTEGER, record_date TEXT NOT NULL, revenue REAL NOT NULL DEFAULT 0, amount_received REAL NOT NULL DEFAULT 0, driver_expense REAL NOT NULL DEFAULT 0, assistant_expense REAL NOT NULL DEFAULT 0, other_expense REAL NOT NULL DEFAULT 0, notes TEXT)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_financial_records_date_schedule ON financial_records(record_date, schedule_id)"),
    db.prepare("CREATE TABLE IF NOT EXISTS driver_trip_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, schedule_id INTEGER NOT NULL UNIQUE, driver_id INTEGER NOT NULL, loading_started_at TEXT, departed_at TEXT, unloading_started_at TEXT, completed_at TEXT, start_odometer_km INTEGER, end_odometer_km INTEGER, fuel_litres REAL, fuel_cost REAL, last_latitude REAL, last_longitude REAL, last_location_at TEXT, notes TEXT)"),
    db.prepare("CREATE TABLE IF NOT EXISTS attendance_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, driver_id INTEGER NOT NULL, work_date TEXT NOT NULL, check_in_at TEXT NOT NULL, check_in_latitude REAL, check_in_longitude REAL, check_out_at TEXT, check_out_latitude REAL, check_out_longitude REAL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS driver_trip_photos (id INTEGER PRIMARY KEY AUTOINCREMENT, trip_log_id INTEGER NOT NULL, photo_type TEXT NOT NULL, object_key TEXT NOT NULL UNIQUE, file_name TEXT NOT NULL, content_type TEXT NOT NULL, uploaded_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS schedules (id INTEGER PRIMARY KEY AUTOINCREMENT, route_id INTEGER NOT NULL, vehicle_id INTEGER NOT NULL, driver_id INTEGER NOT NULL, assistant_id INTEGER, date TEXT NOT NULL, time TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Scheduled')"),
  ]);
  const peopleColumns = await db.prepare("PRAGMA table_info(people)").all<{name:string}>();
  const existingColumns = new Set(peopleColumns.results.map((column) => column.name));
  const missingColumns = [
    ["license_class", "ALTER TABLE people ADD COLUMN license_class TEXT"],
    ["driving_license", "ALTER TABLE people ADD COLUMN driving_license TEXT"],
    ["license_expiry", "ALTER TABLE people ADD COLUMN license_expiry TEXT"],
    ["address", "ALTER TABLE people ADD COLUMN address TEXT"],
  ] as const;
  for (const [column, statement] of missingColumns) {
    if (!existingColumns.has(column)) await db.prepare(statement).run();
  }
  const routeColumns = await db.prepare("PRAGMA table_info(routes)").all<{name:string}>();
  const existingRouteColumns = new Set(routeColumns.results.map((column) => column.name));
  if (!existingRouteColumns.has("estimated_departure")) await db.prepare("ALTER TABLE routes ADD COLUMN estimated_departure TEXT").run();
  if (!existingRouteColumns.has("estimated_arrival")) await db.prepare("ALTER TABLE routes ADD COLUMN estimated_arrival TEXT").run();
  const count = await db.prepare("SELECT COUNT(*) total FROM vehicles").first<{total:number}>();
  if (!count?.total) {
    await db.batch([
      db.prepare("INSERT INTO vehicles (plate,type,capacity,status) VALUES ('SGK 4821','Coach',44,'On route'),('GBH 2934','Mini bus',18,'Available'),('SLA 7612','Coach',52,'Maintenance'),('GBC 1408','Van',12,'Available')"),
      db.prepare("INSERT INTO people (name,role,phone,license_class,driving_license,license_expiry,address,status) VALUES ('Marcus Tan','Driver','9123 8841','Class 4','D-20481','2028-09-18','12 Jurong West Street 41','On duty'),('Aisha Rahman','Driver','8891 2044','Class 3','D-19832','2027-06-30','85 Tampines Avenue 4','Available'),('Daniel Lim','Driver','9782 1109','Class 4A','D-22104','2029-01-12','21 Woodlands Drive 16','Available'),('Mei Chen','Assistant','9012 6743',NULL,NULL,NULL,'44 Bedok North Road','On duty'),('Ravi Kumar','Assistant','8122 9104',NULL,NULL,NULL,'7 Yishun Ring Road','Available')"),
      db.prepare("INSERT INTO routes (code,origin,destination,distance,estimated_departure,estimated_arrival) VALUES ('RT-104','Jurong Hub','Changi Logistics Park',38,'2026-07-15T08:30','2026-07-15T10:00'),('RT-207','Woodlands Depot','Tuas South',34,'2026-07-15T11:15','2026-07-15T12:35'),('RT-312','Punggol Interchange','Seletar Aerospace',17,'2026-07-15T15:00','2026-07-15T15:45')"),
      db.prepare("INSERT INTO route_goods (route_id,goods,customer) VALUES (1,'Chilled food cartons','Fresh Harvest Pte Ltd'),(1,'Packaging materials','Atlas Supply Co'),(2,'Machine components','Westline Engineering'),(3,'Aviation consumables','AeroServe Asia')"),
    ]);
    const today = new Date().toISOString().slice(0,10);
    await db.prepare("INSERT INTO schedules (route_id,vehicle_id,driver_id,assistant_id,date,time,status) VALUES (1,1,1,4,?, '08:30','On route'),(2,2,2,5,?, '11:15','Scheduled'),(3,4,3,NULL,?, '15:00','Scheduled')").bind(today,today,today).run();
  }
  return db;
}

export async function GET() {
  const db = await ready();
  const [vehicles, people, routes, schedules, mileageFuelLogs, maintenanceLogs, driverActivity, driverAttendance, financialRecords] = await Promise.all([
    db.prepare("SELECT v.*, (SELECT m.odometer_km FROM mileage_fuel_logs m WHERE m.vehicle_id=v.id ORDER BY m.recorded_at DESC, m.id DESC LIMIT 1) latest_odometer_km, (SELECT ROUND(SUM(m.petrol_litres),2) FROM mileage_fuel_logs m WHERE m.vehicle_id=v.id) total_petrol_litres FROM vehicles v ORDER BY v.id DESC").all(),
    db.prepare("SELECT * FROM people ORDER BY id DESC").all(),
    db.prepare("SELECT r.*, (SELECT GROUP_CONCAT(rg.customer || ': ' || rg.goods, ' • ') FROM route_goods rg WHERE rg.route_id=r.id) cargo_summary FROM routes r ORDER BY r.id DESC").all(),
    db.prepare("SELECT s.*, r.code route_code, r.origin, r.destination, r.distance route_distance, v.plate, p.name driver_name, a.name assistant_name FROM schedules s JOIN routes r ON r.id=s.route_id JOIN vehicles v ON v.id=s.vehicle_id JOIN people p ON p.id=s.driver_id LEFT JOIN people a ON a.id=s.assistant_id ORDER BY s.date,s.time").all(),
    db.prepare("SELECT m.*, v.plate, v.type vehicle_type FROM mileage_fuel_logs m JOIN vehicles v ON v.id=m.vehicle_id ORDER BY m.recorded_at DESC, m.id DESC").all(),
    db.prepare("SELECT m.*, v.plate, v.type vehicle_type, (SELECT f.odometer_km FROM mileage_fuel_logs f WHERE f.vehicle_id=m.vehicle_id ORDER BY f.recorded_at DESC, f.id DESC LIMIT 1) current_odometer_km FROM maintenance_logs m JOIN vehicles v ON v.id=m.vehicle_id ORDER BY COALESCE(m.next_due_date,'9999-12-31'), m.id DESC").all(),
    db.prepare("SELECT t.*,s.date schedule_date,s.vehicle_id,p.name driver_name,r.code route_code,r.origin,r.destination,r.distance route_distance,v.plate,(SELECT COUNT(*) FROM driver_trip_photos ph WHERE ph.trip_log_id=t.id) photo_count,(SELECT ph.object_key FROM driver_trip_photos ph WHERE ph.trip_log_id=t.id AND ph.photo_type='mileage' ORDER BY ph.id DESC LIMIT 1) mileage_photo_key,(SELECT ph.object_key FROM driver_trip_photos ph WHERE ph.trip_log_id=t.id AND ph.photo_type='fuel' ORDER BY ph.id DESC LIMIT 1) fuel_photo_key FROM driver_trip_logs t JOIN people p ON p.id=t.driver_id JOIN schedules s ON s.id=t.schedule_id JOIN routes r ON r.id=s.route_id JOIN vehicles v ON v.id=s.vehicle_id ORDER BY COALESCE(t.completed_at,t.loading_started_at) DESC").all(),
    db.prepare("SELECT a.*,p.name driver_name FROM attendance_logs a JOIN people p ON p.id=a.driver_id ORDER BY a.work_date DESC,a.check_in_at DESC LIMIT 50").all(),
    db.prepare("SELECT f.*,s.date trip_date,r.code route_code,v.plate,p.name driver_name,a.name assistant_name FROM financial_records f LEFT JOIN schedules s ON s.id=f.schedule_id LEFT JOIN routes r ON r.id=s.route_id LEFT JOIN vehicles v ON v.id=s.vehicle_id LEFT JOIN people p ON p.id=s.driver_id LEFT JOIN people a ON a.id=s.assistant_id ORDER BY f.record_date DESC,f.id DESC").all(),
  ]);
  return Response.json({vehicles:vehicles.results, people:people.results, routes:routes.results, schedules:schedules.results, mileageFuelLogs:mileageFuelLogs.results, maintenanceLogs:maintenanceLogs.results, driverActivity:driverActivity.results, driverAttendance:driverAttendance.results, financialRecords:financialRecords.results});
}

export async function POST(request: Request) {
  const db = await ready();
  const p = await request.json() as Record<string, string | number | null | Array<{goods:string;customer:string}>>;
  if (p.kind === "vehicle") await db.prepare("INSERT INTO vehicles (plate,type,capacity,status) VALUES (?,?,?,'Available')").bind(p.plate,p.type,p.capacity).run();
  else if (p.kind === "person") {
    if (p.role === "Driver" && (!p.licenseClass || !p.drivingLicense || !p.licenseExpiry || !p.address)) {
      return Response.json({error:"All driver licence and address fields are required"},{status:400});
    }
    await db.prepare("INSERT INTO people (name,role,phone,license_class,driving_license,license_expiry,address,status) VALUES (?,?,?,?,?,?,?,'Available')").bind(p.name,p.role,p.phone,p.licenseClass || null,p.drivingLicense || null,p.licenseExpiry || null,p.address || null).run();
  }
  else if (p.kind === "route") {
    if (!p.estimatedDeparture || !p.estimatedArrival) return Response.json({error:"Estimated departure and arrival are required"},{status:400});
    if (String(p.estimatedArrival) <= String(p.estimatedDeparture)) return Response.json({error:"Estimated arrival must be after departure"},{status:400});
    const goods = Array.isArray(p.goodsItems) ? p.goodsItems : [];
    const items = goods.filter((item) => item.goods.trim() && item.customer.trim());
    if (!items.length) return Response.json({error:"At least one goods and customer entry is required"},{status:400});
    const result = await db.prepare("INSERT INTO routes (code,origin,destination,distance,estimated_departure,estimated_arrival) VALUES (?,?,?,?,?,?)").bind(p.code,p.origin,p.destination,p.distance,p.estimatedDeparture,p.estimatedArrival).run();
    const routeId = result.meta.last_row_id;
    await db.batch(items.map((item) => db.prepare("INSERT INTO route_goods (route_id,goods,customer) VALUES (?,?,?)").bind(routeId,item.goods.trim(),item.customer.trim())));
  }
  else if (p.kind === "schedule") await db.prepare("INSERT INTO schedules (route_id,vehicle_id,driver_id,assistant_id,date,time,status) VALUES (?,?,?,?,?,?,'Scheduled')").bind(p.routeId,p.vehicleId,p.driverId,p.assistantId || null,p.date,p.time).run();
  else if (p.kind === "fuelLog") {
    const vehicleId = Number(p.vehicleId), odometerKm = Number(p.odometerKm), petrolLitres = Number(p.petrolLitres), petrolCost = Number(p.petrolCost);
    if (!vehicleId || !p.recordedAt || odometerKm < 0 || petrolLitres <= 0 || petrolCost < 0) return Response.json({error:"Valid vehicle, date, mileage, petrol quantity and cost are required"},{status:400});
    const latest = await db.prepare("SELECT odometer_km FROM mileage_fuel_logs WHERE vehicle_id=? ORDER BY recorded_at DESC, id DESC LIMIT 1").bind(vehicleId).first<{odometer_km:number}>();
    if (latest && odometerKm < latest.odometer_km) return Response.json({error:`Odometer cannot be lower than the latest reading of ${latest.odometer_km} km`},{status:400});
    await db.prepare("INSERT INTO mileage_fuel_logs (vehicle_id,recorded_at,odometer_km,petrol_litres,petrol_cost,station,notes) VALUES (?,?,?,?,?,?,?)").bind(vehicleId,p.recordedAt,odometerKm,petrolLitres,petrolCost,p.station || null,p.notes || null).run();
  }
  else if (p.kind === "maintenance") {
    const vehicleId = Number(p.vehicleId), completedOdometerKm = p.completedOdometerKm ? Number(p.completedOdometerKm) : null, nextDueOdometerKm = p.nextDueOdometerKm ? Number(p.nextDueOdometerKm) : null, cost = Number(p.cost || 0);
    if (!vehicleId || !p.serviceType || !p.completedDate || (!p.nextDueDate && !nextDueOdometerKm)) return Response.json({error:"Vehicle, maintenance type, completed date, and a next due date or mileage are required"},{status:400});
    if (completedOdometerKm !== null && nextDueOdometerKm !== null && nextDueOdometerKm <= completedOdometerKm) return Response.json({error:"Next due mileage must be greater than completed mileage"},{status:400});
    if (p.nextDueDate && String(p.nextDueDate) <= String(p.completedDate)) return Response.json({error:"Next due date must be after completed date"},{status:400});
    await db.prepare("INSERT INTO maintenance_logs (vehicle_id,service_type,completed_date,completed_odometer_km,next_due_date,next_due_odometer_km,workshop,cost,notes) VALUES (?,?,?,?,?,?,?,?,?)").bind(vehicleId,p.serviceType,p.completedDate,completedOdometerKm,p.nextDueDate || null,nextDueOdometerKm,p.workshop || null,cost,p.notes || null).run();
  }
  else if (p.kind === "finance") {
    const scheduleId=p.scheduleId?Number(p.scheduleId):null,revenue=Number(p.revenue||0),received=Number(p.amountReceived||0),driver=Number(p.driverExpense||0),assistant=Number(p.assistantExpense||0),other=Number(p.otherExpense||0);
    if (!p.recordDate || [revenue,received,driver,assistant,other].some(value=>value<0)) return Response.json({error:"A date and non-negative financial amounts are required"},{status:400});
    if (received>revenue) return Response.json({error:"Amount received cannot exceed revenue"},{status:400});
    await db.prepare("INSERT INTO financial_records (schedule_id,record_date,revenue,amount_received,driver_expense,assistant_expense,other_expense,notes) VALUES (?,?,?,?,?,?,?,?)").bind(scheduleId,p.recordDate,revenue,received,driver,assistant,other,p.notes||null).run();
  }
  else return Response.json({error:"Invalid record type"},{status:400});
  return Response.json({ok:true},{status:201});
}
