import { env } from "cloudflare:workers";

async function ready() {
  const db = env.DB;
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS vehicles (id INTEGER PRIMARY KEY AUTOINCREMENT, plate TEXT NOT NULL UNIQUE, type TEXT NOT NULL, capacity INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'Available')"),
    db.prepare("CREATE TABLE IF NOT EXISTS people (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, role TEXT NOT NULL, phone TEXT NOT NULL, license_class TEXT, driving_license TEXT, license_expiry TEXT, address TEXT, status TEXT NOT NULL DEFAULT 'Available')"),
    db.prepare("CREATE TABLE IF NOT EXISTS routes (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL UNIQUE, origin TEXT NOT NULL, destination TEXT NOT NULL, distance INTEGER NOT NULL)"),
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
  const count = await db.prepare("SELECT COUNT(*) total FROM vehicles").first<{total:number}>();
  if (!count?.total) {
    await db.batch([
      db.prepare("INSERT INTO vehicles (plate,type,capacity,status) VALUES ('SGK 4821','Coach',44,'On route'),('GBH 2934','Mini bus',18,'Available'),('SLA 7612','Coach',52,'Maintenance'),('GBC 1408','Van',12,'Available')"),
      db.prepare("INSERT INTO people (name,role,phone,license_class,driving_license,license_expiry,address,status) VALUES ('Marcus Tan','Driver','9123 8841','Class 4','D-20481','2028-09-18','12 Jurong West Street 41','On duty'),('Aisha Rahman','Driver','8891 2044','Class 3','D-19832','2027-06-30','85 Tampines Avenue 4','Available'),('Daniel Lim','Driver','9782 1109','Class 4A','D-22104','2029-01-12','21 Woodlands Drive 16','Available'),('Mei Chen','Assistant','9012 6743',NULL,NULL,NULL,'44 Bedok North Road','On duty'),('Ravi Kumar','Assistant','8122 9104',NULL,NULL,NULL,'7 Yishun Ring Road','Available')"),
      db.prepare("INSERT INTO routes (code,origin,destination,distance) VALUES ('RT-104','Jurong Hub','Changi Logistics Park',38),('RT-207','Woodlands Depot','Tuas South',34),('RT-312','Punggol Interchange','Seletar Aerospace',17)"),
    ]);
    const today = new Date().toISOString().slice(0,10);
    await db.prepare("INSERT INTO schedules (route_id,vehicle_id,driver_id,assistant_id,date,time,status) VALUES (1,1,1,4,?, '08:30','On route'),(2,2,2,5,?, '11:15','Scheduled'),(3,4,3,NULL,?, '15:00','Scheduled')").bind(today,today,today).run();
  }
  return db;
}

export async function GET() {
  const db = await ready();
  const [vehicles, people, routes, schedules] = await Promise.all([
    db.prepare("SELECT * FROM vehicles ORDER BY id DESC").all(),
    db.prepare("SELECT * FROM people ORDER BY id DESC").all(),
    db.prepare("SELECT * FROM routes ORDER BY id DESC").all(),
    db.prepare("SELECT s.*, r.code route_code, r.origin, r.destination, v.plate, p.name driver_name, a.name assistant_name FROM schedules s JOIN routes r ON r.id=s.route_id JOIN vehicles v ON v.id=s.vehicle_id JOIN people p ON p.id=s.driver_id LEFT JOIN people a ON a.id=s.assistant_id ORDER BY s.date,s.time").all(),
  ]);
  return Response.json({vehicles:vehicles.results, people:people.results, routes:routes.results, schedules:schedules.results});
}

export async function POST(request: Request) {
  const db = await ready();
  const p = await request.json() as Record<string, string | number | null>;
  if (p.kind === "vehicle") await db.prepare("INSERT INTO vehicles (plate,type,capacity,status) VALUES (?,?,?,'Available')").bind(p.plate,p.type,p.capacity).run();
  else if (p.kind === "person") {
    if (p.role === "Driver" && (!p.licenseClass || !p.drivingLicense || !p.licenseExpiry || !p.address)) {
      return Response.json({error:"All driver licence and address fields are required"},{status:400});
    }
    await db.prepare("INSERT INTO people (name,role,phone,license_class,driving_license,license_expiry,address,status) VALUES (?,?,?,?,?,?,?,'Available')").bind(p.name,p.role,p.phone,p.licenseClass || null,p.drivingLicense || null,p.licenseExpiry || null,p.address || null).run();
  }
  else if (p.kind === "route") await db.prepare("INSERT INTO routes (code,origin,destination,distance) VALUES (?,?,?,?)").bind(p.code,p.origin,p.destination,p.distance).run();
  else if (p.kind === "schedule") await db.prepare("INSERT INTO schedules (route_id,vehicle_id,driver_id,assistant_id,date,time,status) VALUES (?,?,?,?,?,?,'Scheduled')").bind(p.routeId,p.vehicleId,p.driverId,p.assistantId || null,p.date,p.time).run();
  else return Response.json({error:"Invalid record type"},{status:400});
  return Response.json({ok:true},{status:201});
}
