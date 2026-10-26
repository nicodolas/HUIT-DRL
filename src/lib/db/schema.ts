import { pgTable, text, varchar, integer, numeric, boolean, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: varchar("id", { length: 64 }).primaryKey(),
  username: varchar("username", { length: 64 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  faculty: varchar("faculty", { length: 255 }),
  className: varchar("class_name", { length: 64 }),
  role: varchar("role", { length: 32 }).default("user").notNull(), // 'user' | 'admin'
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const semesters = pgTable("semesters", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("user_id", { length: 64 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 128 }).notNull(),
  isCurrent: boolean("is_current").default(true).notNull(),
  targetScore: integer("target_score").default(90).notNull(),
  disciplineLevel: varchar("discipline_level", { length: 32 }).default("none").notNull(), // 'none' | 'khien_trach' | 'canh_cao' | 'dinh_chi'
  submissionDeadline: varchar("submission_deadline", { length: 32 }), // e.g. '2026-11-20'
  status: varchar("status", { length: 32 }).default("active").notNull(), // 'active' | 'submitted' | 'locked'
  isSystem: boolean("is_system").default(false).notNull(), // true if official semester created by admin
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const drlCriteriaPresets = pgTable("drl_criteria_presets", {
  id: varchar("id", { length: 64 }).primaryKey(),
  category: integer("category").notNull(), // 1, 2, 3, 4, 5
  code: varchar("code", { length: 64 }).notNull().unique(),
  title: text("title").notNull(),
  type: varchar("type", { length: 16 }).notNull(), // 'default' | 'add' | 'deduct'
  points: numeric("points", { precision: 5, scale: 1 }).notNull(),
  maxPointsCategory: integer("max_points_category").notNull(),
  unit: varchar("unit", { length: 32 }).default("lần").notNull(),
  description: text("description"),
});

export const drlRecords = pgTable("drl_records", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("user_id", { length: 64 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  semesterId: varchar("semester_id", { length: 64 }).notNull().references(() => semesters.id, { onDelete: "cascade" }),
  presetId: varchar("preset_id", { length: 64 }),
  category: integer("category").notNull(), // 1, 2, 3, 4, 5
  title: text("title").notNull(),
  type: varchar("type", { length: 16 }).notNull(), // 'default' | 'add' | 'deduct'
  points: numeric("points", { precision: 5, scale: 1 }).notNull(),
  quantity: integer("quantity").default(1).notNull(),
  occurredAt: varchar("occurred_at", { length: 32 }),
  note: text("note"),
  evidenceUrl: text("evidence_url"),
  auditStatus: varchar("audit_status", { length: 32 }).default("pending_review").notNull(), // 'missing' | 'pending_review' | 'valid' | 'rejected'
  auditComment: text("audit_comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type Semester = typeof semesters.$inferSelect;
export type DrlCriteriaPreset = typeof drlCriteriaPresets.$inferSelect;
export type DrlRecord = typeof drlRecords.$inferSelect;

