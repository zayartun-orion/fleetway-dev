import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const vehicles = sqliteTable("vehicles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  plate: text("plate").notNull().unique(),
  type: text("type").notNull(),
  capacity: integer("capacity").notNull(),
  status: text("status").notNull().default("Available"),
});

export const people = sqliteTable("people", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  role: text("role").notNull(),
  phone: text("phone").notNull(),
  licenseClass: text("license_class"),
  drivingLicense: text("driving_license"),
  licenseExpiry: text("license_expiry"),
  address: text("address"),
  status: text("status").notNull().default("Available"),
});

export const routes = sqliteTable("routes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  origin: text("origin").notNull(),
  destination: text("destination").notNull(),
  distance: integer("distance").notNull(),
  estimatedDeparture: text("estimated_departure"),
  estimatedArrival: text("estimated_arrival"),
});

export const routeGoods = sqliteTable("route_goods", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  routeId: integer("route_id").notNull(),
  goods: text("goods").notNull(),
  customer: text("customer").notNull(),
});

export const mileageFuelLogs = sqliteTable("mileage_fuel_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  vehicleId: integer("vehicle_id").notNull(),
  recordedAt: text("recorded_at").notNull(),
  odometerKm: integer("odometer_km").notNull(),
  petrolLitres: real("petrol_litres").notNull(),
  petrolCost: real("petrol_cost").notNull(),
  station: text("station"),
  notes: text("notes"),
}, (table) => [index("idx_mileage_fuel_logs_vehicle_date").on(table.vehicleId, table.recordedAt)]);

export const maintenanceLogs = sqliteTable("maintenance_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  vehicleId: integer("vehicle_id").notNull(),
  serviceType: text("service_type").notNull(),
  completedDate: text("completed_date").notNull(),
  completedOdometerKm: integer("completed_odometer_km"),
  nextDueDate: text("next_due_date"),
  nextDueOdometerKm: integer("next_due_odometer_km"),
  workshop: text("workshop"),
  cost: real("cost").notNull().default(0),
  notes: text("notes"),
}, (table) => [index("idx_maintenance_logs_vehicle_due").on(table.vehicleId, table.nextDueDate)]);

export const schedules = sqliteTable("schedules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  routeId: integer("route_id").notNull(),
  vehicleId: integer("vehicle_id").notNull(),
  driverId: integer("driver_id").notNull(),
  assistantId: integer("assistant_id"),
  date: text("date").notNull(),
  time: text("time").notNull(),
  status: text("status").notNull().default("Scheduled"),
});
