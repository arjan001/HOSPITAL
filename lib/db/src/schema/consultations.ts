import { boolean, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import { z } from "zod/v4"
import { users } from "./users"

export type ConsultationStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"

export type ConsultationType = "chat" | "call" | "video"

export type DoctorAvailability = {
  monFri: boolean
  weekends: boolean
  hours: string
}

/** Verified clinicians — Postgres source of truth (replaces cmsStore `doctors`). */
export const doctors = pgTable(
  "doctors",
  {
    id: text("id").primaryKey(),
    clerkId: text("clerk_id").unique(),
    name: text("name").notNull(),
    title: text("title").notNull().default("MBChB"),
    specialty: text("specialty").notNull(),
    licenseNumber: text("license_number").notNull().default(""),
    bio: text("bio"),
    photoUrl: text("photo_url"),
    email: text("email").notNull().default(""),
    phone: text("phone").notNull().default(""),
    languages: jsonb("languages").$type<string[]>().notNull().default([]),
    availability: jsonb("availability").$type<DoctorAvailability>().notNull().default({
      monFri: true,
      weekends: false,
      hours: "08:00–18:00 EAT",
    }),
    yearsExperience: integer("years_experience").notNull().default(0),
    consultationFee: integer("consultation_fee").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    /** Legacy column — prefer `availability` jsonb. */
    availableHours: jsonb("available_hours").$type<{
      days: string[]
      start: string
      end: string
    }>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    emailIdx: uniqueIndex("doctors_email_uq").on(t.email),
  }),
)

/** Doctor portal logins — email + password (invite flow, same pattern as partners). */
export const doctorAccounts = pgTable("doctor_accounts", {
  id: text("id").primaryKey(),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash"),
  doctorId: text("doctor_id")
    .notNull()
    .references(() => doctors.id, { onDelete: "cascade" }),
  displayName: text("display_name").notNull(),
  status: text("status").notNull().default("invited"),
  // status: invited | active | suspended
  inviteToken: text("invite_token"),
  inviteExpiresAt: timestamp("invite_expires_at"),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const consultations = pgTable("consultations", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  threadId: text("thread_id"),
  doctorId: text("doctor_id").references(() => doctors.id, { onDelete: "set null" }),
  type: text("type").notNull(),
  specialty: text("specialty").notNull(),
  patientName: text("patient_name").notNull(),
  patientPhone: text("patient_phone").notNull(),
  status: text("status").notNull().default("pending"),
  paymentReference: text("payment_reference"),
  paymentStatus: text("payment_status").notNull().default("pending"),
  fee: integer("fee").notNull(),
  roomUrl: text("room_url"),
  scheduledAt: timestamp("scheduled_at"),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const insertDoctorSchema = createInsertSchema(doctors).omit({ createdAt: true, updatedAt: true })
export const selectDoctorSchema = createSelectSchema(doctors)
export type InsertDoctor = z.infer<typeof insertDoctorSchema>
export type Doctor = typeof doctors.$inferSelect

export const insertConsultationSchema = createInsertSchema(consultations).omit({ createdAt: true, updatedAt: true })
export const selectConsultationSchema = createSelectSchema(consultations)
export type InsertConsultation = z.infer<typeof insertConsultationSchema>
export type Consultation = typeof consultations.$inferSelect

export type DoctorAccount = typeof doctorAccounts.$inferSelect
