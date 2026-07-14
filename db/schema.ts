import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
  license: text("license"),
  status: text("status").notNull().default("Available"),
});

export const routes = sqliteTable("routes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  origin: text("origin").notNull(),
  destination: text("destination").notNull(),
  distance: integer("distance").notNull(),
});

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
