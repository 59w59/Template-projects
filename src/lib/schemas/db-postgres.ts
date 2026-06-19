import { pgTable, varchar, timestamp, boolean, text, integer } from "drizzle-orm/pg-core"

export const users = pgTable("users", {
  id: varchar("id", { length: 255 }).primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash"),
  role: varchar("role", { length: 50 }).notNull().default("user"),
  emailVerified: boolean("email_verified").notNull().default(false),
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  twoFactorCode: varchar("two_factor_code", { length: 100 }),
  twoFactorExpiresAt: timestamp("two_factor_expires_at"),
  resetTokenHash: text("reset_token_hash"),
  resetTokenExpiresAt: timestamp("reset_token_expires_at"),
  provider: varchar("provider", { length: 100 }),
  providerId: varchar("provider_id", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const sessions = pgTable("sessions", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: varchar("ip_address", { length: 100 }).notNull(),
  userAgent: text("user_agent").notNull(),
  isValid: boolean("is_valid").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).references(() => users.id, { onDelete: "set null" }),
  action: varchar("action", { length: 255 }).notNull(),
  status: varchar("status", { length: 100 }).notNull(),
  ipAddress: varchar("ip_address", { length: 100 }).notNull(),
  userAgent: text("user_agent").notNull(),
  details: text("details"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

export const organizations = pgTable("organizations", {
  id: varchar("id", { length: 255 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const organizationMembers = pgTable("organization_members", {
  id: varchar("id", { length: 255 }).primaryKey(),
  organizationId: varchar("organization_id", { length: 255 }).notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 50 }).notNull().default("member"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

export const organizationInvitations = pgTable("organization_invitations", {
  id: varchar("id", { length: 255 }).primaryKey(),
  organizationId: varchar("organization_id", { length: 255 }).notNull().references(() => organizations.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("member"),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

export const subscriptions = pgTable("subscriptions", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  organizationId: varchar("organization_id", { length: 255 }).references(() => organizations.id, { onDelete: "set null" }),
  gateway: varchar("gateway", { length: 100 }).notNull(),
  gatewayCustomerId: varchar("gateway_customer_id", { length: 255 }),
  gatewaySubscriptionId: varchar("gateway_subscription_id", { length: 255 }),
  status: varchar("status", { length: 100 }).notNull(),
  planId: varchar("plan_id", { length: 100 }).notNull(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const storedFiles = pgTable("stored_files", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  organizationId: varchar("organization_id", { length: 255 }).references(() => organizations.id, { onDelete: "set null" }),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileKey: text("file_key").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  storageProvider: varchar("storage_provider", { length: 50 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

export const notifications = pgTable("notifications", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  type: varchar("type", { length: 50 }).notNull().default("info"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

export const systemSettings = pgTable("system_settings", {
  key: varchar("key", { length: 255 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})
