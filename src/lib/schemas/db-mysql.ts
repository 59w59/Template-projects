import { mysqlTable, varchar, datetime, boolean, text, int } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

export const users = mysqlTable("users", {
  id: varchar("id", { length: 255 }).primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash"),
  role: varchar("role", { length: 50 }).notNull().default("user"),
  emailVerified: boolean("email_verified").notNull().default(false),
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  twoFactorCode: varchar("two_factor_code", { length: 100 }),
  twoFactorExpiresAt: datetime("two_factor_expires_at", { mode: "date" }),
  resetTokenHash: text("reset_token_hash"),
  resetTokenExpiresAt: datetime("reset_token_expires_at", { mode: "date" }),
  provider: varchar("provider", { length: 100 }),
  providerId: varchar("provider_id", { length: 255 }),
  createdAt: datetime("created_at", { mode: "date" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updated_at", { mode: "date" }).notNull().default(sql`CURRENT_TIMESTAMP`),
})

export const sessions = mysqlTable("sessions", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  tokenHash: varchar("token_hash", { length: 255 }).notNull().unique(),
  expiresAt: datetime("expires_at", { mode: "date" }).notNull(),
  ipAddress: varchar("ip_address", { length: 100 }).notNull(),
  userAgent: text("user_agent").notNull(),
  isValid: boolean("is_valid").notNull().default(true),
  createdAt: datetime("created_at", { mode: "date" }).notNull().default(sql`CURRENT_TIMESTAMP`),
})

export const auditLogs = mysqlTable("audit_logs", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }),
  action: varchar("action", { length: 255 }).notNull(),
  status: varchar("status", { length: 100 }).notNull(),
  ipAddress: varchar("ip_address", { length: 100 }).notNull(),
  userAgent: text("user_agent").notNull(),
  details: text("details"),
  createdAt: datetime("created_at", { mode: "date" }).notNull().default(sql`CURRENT_TIMESTAMP`),
})

export const organizations = mysqlTable("organizations", {
  id: varchar("id", { length: 255 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  createdAt: datetime("created_at", { mode: "date" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updated_at", { mode: "date" }).notNull().default(sql`CURRENT_TIMESTAMP`),
})

export const organizationMembers = mysqlTable("organization_members", {
  id: varchar("id", { length: 255 }).primaryKey(),
  organizationId: varchar("organization_id", { length: 255 }).notNull(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("member"),
  createdAt: datetime("created_at", { mode: "date" }).notNull().default(sql`CURRENT_TIMESTAMP`),
})

export const organizationInvitations = mysqlTable("organization_invitations", {
  id: varchar("id", { length: 255 }).primaryKey(),
  organizationId: varchar("organization_id", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("member"),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: datetime("expires_at", { mode: "date" }).notNull(),
  createdAt: datetime("created_at", { mode: "date" }).notNull().default(sql`CURRENT_TIMESTAMP`),
})

export const subscriptions = mysqlTable("subscriptions", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  organizationId: varchar("organization_id", { length: 255 }),
  gateway: varchar("gateway", { length: 100 }).notNull(),
  gatewayCustomerId: varchar("gateway_customer_id", { length: 255 }),
  gatewaySubscriptionId: varchar("gateway_subscription_id", { length: 255 }),
  status: varchar("status", { length: 100 }).notNull(),
  planId: varchar("plan_id", { length: 100 }).notNull(),
  expiresAt: datetime("expires_at", { mode: "date" }),
  createdAt: datetime("created_at", { mode: "date" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updated_at", { mode: "date" }).notNull().default(sql`CURRENT_TIMESTAMP`),
})

export const storedFiles = mysqlTable("stored_files", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  organizationId: varchar("organization_id", { length: 255 }),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileKey: text("file_key").notNull(),
  fileSize: int("file_size").notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  storageProvider: varchar("storage_provider", { length: 50 }).notNull(),
  createdAt: datetime("created_at", { mode: "date" }).notNull().default(sql`CURRENT_TIMESTAMP`),
})

export const notifications = mysqlTable("notifications", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  type: varchar("type", { length: 50 }).notNull().default("info"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: datetime("created_at", { mode: "date" }).notNull().default(sql`CURRENT_TIMESTAMP`),
})

export const systemSettings = mysqlTable("system_settings", {
  key: varchar("key", { length: 255 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: datetime("updated_at", { mode: "date" }).notNull().default(sql`CURRENT_TIMESTAMP`),
})
