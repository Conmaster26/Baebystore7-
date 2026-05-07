import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Customers table for Baeby dropshipping orders
 * Stores customer information for order fulfillment
 */
export const customers = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  firstName: varchar("firstName", { length: 100 }).notNull(),
  lastName: varchar("lastName", { length: 100 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;

/**
 * Orders table for tracking Baeby dropshipping orders
 * Each order represents a customer purchase
 */
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull(),
  orderNumber: varchar("orderNumber", { length: 50 }).notNull().unique(),
  status: mysqlEnum("status", ["pending", "processing", "shipped", "delivered", "cancelled"]).default("pending").notNull(),
  
  // Delivery Information
  deliveryFirstName: varchar("deliveryFirstName", { length: 100 }).notNull(),
  deliveryLastName: varchar("deliveryLastName", { length: 100 }).notNull(),
  deliveryEmail: varchar("deliveryEmail", { length: 320 }).notNull(),
  deliveryPhone: varchar("deliveryPhone", { length: 20 }).notNull(),
  deliveryAddress: text("deliveryAddress").notNull(),
  deliveryCity: varchar("deliveryCity", { length: 100 }).notNull(),
  deliveryProvince: varchar("deliveryProvince", { length: 100 }).notNull(),
  deliveryPostalCode: varchar("deliveryPostalCode", { length: 20 }).notNull(),
  
  // Financial Information
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  profitMargin: decimal("profitMargin", { precision: 10, scale: 2 }).notNull(),
  shippingCost: decimal("shippingCost", { precision: 10, scale: 2 }).default("0"),
  tax: decimal("tax", { precision: 10, scale: 2 }).default("0"),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).notNull(),
  
  // Payment Information
  paymentMethod: varchar("paymentMethod", { length: 50 }).notNull(),
  paymentStatus: mysqlEnum("paymentStatus", ["pending", "completed", "failed", "refunded"]).default("pending").notNull(),
  paymentReference: varchar("paymentReference", { length: 100 }),
  
  // Supplier Information
  supplierOrderId: varchar("supplierOrderId", { length: 100 }),
  supplierName: varchar("supplierName", { length: 50 }),
  
  // Profit Tracking
  profitTransferred: int("profitTransferred").default(0),
  profitTransferDate: timestamp("profitTransferDate"),
  profitTransferReference: varchar("profitTransferReference", { length: 100 }),
  
  // Metadata
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

/**
 * Order Items table for tracking individual products in each order
 */
export const orderItems = mysqlTable("orderItems", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  productId: varchar("productId", { length: 100 }).notNull(),
  productName: varchar("productName", { length: 255 }).notNull(),
  productPrice: decimal("productPrice", { precision: 10, scale: 2 }).notNull(),
  quantity: int("quantity").default(1).notNull(),
  totalPrice: decimal("totalPrice", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

/**
 * Profit Ledger for tracking all profit transfers
 */
export const profitLedger = mysqlTable("profitLedger", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  profitAmount: decimal("profitAmount", { precision: 10, scale: 2 }).notNull(),
  bankAccount: varchar("bankAccount", { length: 50 }).notNull(),
  transferStatus: mysqlEnum("transferStatus", ["pending", "completed", "failed"]).default("pending").notNull(),
  transferDate: timestamp("transferDate"),
  transferReference: varchar("transferReference", { length: 100 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProfitLedger = typeof profitLedger.$inferSelect;
export type InsertProfitLedger = typeof profitLedger.$inferInsert;