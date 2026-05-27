import { boolean, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core"
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

export const doctors = pgTable("doctors", {
  id: text("id").primaryKey(),
  clerkId: text("clerk_id").unique(),
  name: text("name").notNull(),
  specialty: text("specialty").notNull(),
  bio: text("bio"),
  photoUrl: text("photo_url"),
  consultationFee: integer("consultation_fee").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  availableHours: jsonb("available_hours").$type<{
    days: string[]
    start: string
    end: string
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const consultations = pgTable("consultations", {
  id: text("id").primaryKey(),
  // Nullable because consultations can be booked anonymously (phone only)
  // until the visitor signs up.
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
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
