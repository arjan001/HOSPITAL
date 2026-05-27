import { pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import { z } from "zod/v4"
import { users } from "./users"
import { uploads } from "./uploads"

export type PrescriptionStatus = "pending" | "approved" | "rejected" | "info_requested"

export const prescriptions = pgTable("prescriptions", {
  id: text("id").primaryKey(),
  rxNumber: text("rx_number").unique().notNull(),
  // Nullable because a guest visitor can upload an Rx before signing up.
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  uploadId: text("upload_id")
    .notNull()
    .references(() => uploads.id, { onDelete: "restrict" }),
  patientName: text("patient_name").notNull(),
  patientPhone: text("patient_phone"),
  notes: text("notes"),
  status: text("status").notNull().default("pending"),
  pharmacistNotes: text("pharmacist_notes"),
  reviewedBy: text("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const prescriptionTimeline = pgTable("prescription_timeline", {
  id: text("id").primaryKey(),
  prescriptionId: text("prescription_id")
    .notNull()
    .references(() => prescriptions.id, { onDelete: "cascade" }),
  event: text("event").notNull(),
  note: text("note"),
  actor: text("actor"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const insertPrescriptionSchema = createInsertSchema(prescriptions).omit({
  submittedAt: true,
  updatedAt: true,
})
export const selectPrescriptionSchema = createSelectSchema(prescriptions)
export type InsertPrescription = z.infer<typeof insertPrescriptionSchema>
export type Prescription = typeof prescriptions.$inferSelect

export const insertPrescriptionTimelineSchema = createInsertSchema(prescriptionTimeline).omit({ createdAt: true })
export type InsertPrescriptionTimeline = z.infer<typeof insertPrescriptionTimelineSchema>
export type PrescriptionTimeline = typeof prescriptionTimeline.$inferSelect
