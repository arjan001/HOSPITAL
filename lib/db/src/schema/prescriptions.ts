import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import { z } from "zod/v4"
import { users } from "./users"
import { uploads } from "./uploads"

export type PrescriptionStatus = "pending" | "verified" | "dispensed" | "rejected"
export type PrescriptionPaymentMethod = "cash" | "insurance" | "unknown"

export type PrescriptionFile = {
  name: string
  size?: number
  type?: string
  url?: string
  key?: string
}

export const prescriptions = pgTable("prescriptions", {
  id: text("id").primaryKey(),
  rxNumber: text("rx_number").unique().notNull(),
  // Nullable because a guest visitor can upload an Rx before signing up.
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  // Set when a doctor issues this Rx from inside a live consultation, so the Rx
  // can be retrieved from the consultation record. No FK reference to avoid a
  // cross-module circular import; the value is a consultations.id.
  consultationId: text("consultation_id"),
  // Vestigial single-file FK — the model now supports multiple attachments,
  // stored in the `files` jsonb column below. Kept nullable for compatibility.
  uploadId: text("upload_id").references(() => uploads.id, { onDelete: "restrict" }),
  patientName: text("patient_name").notNull(),
  // Who the medicine is for (may differ from the account holder / patientName).
  recipient: text("recipient"),
  dob: text("dob"),
  patientPhone: text("patient_phone"),
  email: text("email"),
  notes: text("notes"),
  status: text("status").notNull().default("pending"),
  paymentMethod: text("payment_method").notNull().default("unknown"),
  pharmacistNotes: text("pharmacist_notes"),
  // Doctor's clinical note — populated when the Rx is linked to a consultation.
  doctorNotes: text("doctor_notes"),
  rejectedReason: text("rejected_reason"),
  reviewedBy: text("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  // Uploaded scans/PDFs ({ name, size?, type?, url?, key? }). Each `key` is an
  // owner-checked storage key (see uploads module).
  files: jsonb("files").$type<PrescriptionFile[]>().notNull().default([]),
  // Payment of the itemized approved-drug cart (set when the customer buys).
  // Amount is whole KSh; reference is the Paystack/M-PESA receipt. The unique
  // constraint gives DB-level idempotency so one charge can't be redeemed twice.
  paidAt: timestamp("paid_at"),
  paidAmount: integer("paid_amount"),
  paymentReference: text("payment_reference").unique(),
  // M-PESA receipt number returned by Paystack on a confirmed charge.
  paymentReceipt: text("payment_receipt"),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Approved medication line-items for a prescription. Each row is one drug the
// pharmacist approved, with the price the customer pays. `price` is per-unit in
// whole KSh and nullable — null means "not yet priced", and the storefront
// applies a sensible default at buy time.
export const prescriptionDrugs = pgTable("prescription_drugs", {
  id: text("id").primaryKey(),
  prescriptionId: text("prescription_id")
    .notNull()
    .references(() => prescriptions.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  dosage: text("dosage"),
  instructions: text("instructions"),
  price: integer("price"),
  quantity: integer("quantity").notNull().default(1),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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

export const insertPrescriptionDrugSchema = createInsertSchema(prescriptionDrugs).omit({ createdAt: true })
export const selectPrescriptionDrugSchema = createSelectSchema(prescriptionDrugs)
export type InsertPrescriptionDrug = z.infer<typeof insertPrescriptionDrugSchema>
export type PrescriptionDrug = typeof prescriptionDrugs.$inferSelect

export const insertPrescriptionTimelineSchema = createInsertSchema(prescriptionTimeline).omit({ createdAt: true })
export type InsertPrescriptionTimeline = z.infer<typeof insertPrescriptionTimelineSchema>
export type PrescriptionTimeline = typeof prescriptionTimeline.$inferSelect
