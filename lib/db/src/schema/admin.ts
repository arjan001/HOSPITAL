import { boolean, integer, jsonb, pgTable, text, timestamp, index } from "drizzle-orm/pg-core"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import { z } from "zod/v4"

/**
 * admin_users — admin panel accounts, separate from Clerk customer accounts.
 * Passwords are stored as bcrypt hashes (cost ≥ 12) and are NEVER returned
 * in API responses. The built-in super-admin can be seeded from env vars
 * (ADMIN_EMAIL / ADMIN_PASSWORD) and upgraded to a DB-backed account later.
 */
export const adminUsers = pgTable("admin_users", {
  id: text("id").primaryKey(),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("pharmacist"),
  // role values: super_admin | pharmacist | doctor | fulfillment | marketing
  permissions: jsonb("permissions").$type<string[]>().default([]),
  active: boolean("active").notNull().default(true),
  requiresPasswordReset: boolean("requires_password_reset").notNull().default(false),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

/**
 * admin_password_resets — one-time tokens for the forgot-password flow.
 * Tokens expire after 1 hour; consumed tokens are deleted immediately.
 */
export const adminPasswordResets = pgTable("admin_password_resets", {
  id: text("id").primaryKey(),
  adminUserId: text("admin_user_id")
    .notNull()
    .references(() => adminUsers.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

/**
 * patient_notes — sticky notes written by admin staff against a patient record.
 * patientId links to users.id (Clerk); sessionId covers guest prescription cases.
 */
export const patientNotes = pgTable("patient_notes", {
  id: text("id").primaryKey(),
  patientId: text("patient_id"),
  sessionId: text("session_id"),
  prescriptionId: text("prescription_id"),
  consultationId: text("consultation_id"),
  note: text("note").notNull(),
  color: text("color").notNull().default("yellow"),
  // color values: yellow | blue | green | red | purple
  pinned: boolean("pinned").notNull().default(false),
  createdBy: text("created_by").notNull(),
  createdByName: text("created_by_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

/**
 * admin_orders — the pharmacy team's global view of every order placed on the
 * storefront. Kept distinct from the customer `orders` table on purpose: it
 * carries a richer, admin-facing shape (M-Pesa receipt/phone/message, ordered
 * via, special instructions) and its own status vocabulary
 * (pending | confirmed | dispatched | delivered | cancelled). Line items are
 * embedded as jsonb because they are display-only snapshots, not catalog FKs.
 */
export const adminOrders = pgTable("admin_orders", {
  id: text("id").primaryKey(),
  orderNo: text("order_no").unique().notNull(),
  customer: text("customer").notNull().default(""),
  phone: text("phone").notNull().default(""),
  email: text("email").notNull().default(""),
  items: jsonb("items")
    .$type<{ name: string; qty: number; price: number; variation?: string }[]>()
    .notNull()
    .default([]),
  subtotal: integer("subtotal").notNull().default(0),
  delivery: integer("delivery").notNull().default(0),
  total: integer("total").notNull().default(0),
  location: text("location").notNull().default(""),
  address: text("address").notNull().default(""),
  notes: text("notes").notNull().default(""),
  specialInstructions: text("special_instructions").notNull().default(""),
  status: text("status").notNull().default("pending"),
  // status values: pending | confirmed | dispatched | delivered | cancelled
  orderedVia: text("ordered_via").notNull().default("website"),
  paymentMethod: text("payment_method").notNull().default("cod"),
  mpesaCode: text("mpesa_code").notNull().default(""),
  mpesaPhone: text("mpesa_phone").notNull().default(""),
  mpesaMessage: text("mpesa_message").notNull().default(""),
  // Gateway transaction reference (Paystack reference for both M-Pesa-via-Paystack
  // and card payments). Distinct from mpesaCode, which is the M-Pesa receipt.
  paymentRef: text("payment_ref").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

/**
 * sourcing_requests — replenishment requests created by automation or manually.
 * Auto-created by the low-stock scan in PipelineModule.
 */
export const sourcingRequests = pgTable("sourcing_requests", {
  id: text("id").primaryKey(),
  sku: text("sku").notNull(),
  productName: text("product_name").notNull(),
  currentStock: integer("current_stock").notNull().default(0),
  reorderPoint: integer("reorder_point").notNull().default(0),
  quantityNeeded: integer("quantity_needed").notNull(),
  urgency: text("urgency").notNull().default("normal"),
  // urgency values: low | normal | high | critical
  status: text("status").notNull().default("open"),
  // status values: open | quoting | ordered | received | cancelled
  notes: text("notes"),
  assignedSupplierId: text("assigned_supplier_id"),
  expectedDeliveryAt: timestamp("expected_delivery_at"),
  fulfilledAt: timestamp("fulfilled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

/**
 * partner_quotes — quote submissions from supplier partners against sourcing requests.
 */
export const partnerQuotes = pgTable("partner_quotes", {
  id: text("id").primaryKey(),
  sourcingRequestId: text("sourcing_request_id").references(() => sourcingRequests.id, {
    onDelete: "cascade",
  }),
  supplierId: text("supplier_id").notNull(),
  supplierName: text("supplier_name").notNull(),
  supplierEmail: text("supplier_email"),
  unitPrice: integer("unit_price").notNull(),
  // stored in smallest currency unit (KES cents or just KES integers)
  quantity: integer("quantity").notNull(),
  leadTimeDays: integer("lead_time_days").notNull(),
  notes: text("notes"),
  status: text("status").notNull().default("pending"),
  // status values: pending | accepted | rejected | expired
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  respondedAt: timestamp("responded_at"),
})

/**
 * clinic_orders — orders placed by clinic partners through the clinic portal.
 * Separate from storefront orders (orders table) to preserve the partner context.
 */
export const clinicOrders = pgTable("clinic_orders", {
  id: text("id").primaryKey(),
  orderRef: text("order_ref").unique().notNull(),
  clinicId: text("clinic_id").notNull(),
  clinicName: text("clinic_name").notNull(),
  clinicEmail: text("clinic_email"),
  items: jsonb("items")
    .$type<{ name: string; qty: number; unitPrice: number; patient?: string }[]>()
    .notNull(),
  subtotal: integer("subtotal").notNull(),
  deliveryFee: integer("delivery_fee").notNull().default(0),
  total: integer("total").notNull(),
  status: text("status").notNull().default("pending"),
  // status values: pending | confirmed | shipped | delivered | cancelled
  notes: text("notes"),
  deliveryAddress: text("delivery_address"),
  creditLine: boolean("credit_line").notNull().default(false),
  placedAt: timestamp("placed_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

/**
 * delivery_jobs — logistics delivery assignments, linking orders to riders.
 * Covers both storefront orders and clinic orders.
 */
export const deliveryJobs = pgTable("delivery_jobs", {
  id: text("id").primaryKey(),
  jobRef: text("job_ref").unique().notNull(),
  orderId: text("order_id"),
  orderType: text("order_type").notNull().default("storefront"),
  // orderType values: storefront | clinic
  assignedRiderId: text("assigned_rider_id"),
  assignedRiderName: text("assigned_rider_name"),
  logisticsPartnerId: text("logistics_partner_id"),
  pickupAddress: text("pickup_address").notNull(),
  deliveryAddress: text("delivery_address").notNull(),
  recipientName: text("recipient_name"),
  recipientPhone: text("recipient_phone"),
  status: text("status").notNull().default("pending"),
  // status values: pending | assigned | in_transit | delivered | failed | cancelled
  estimatedMinutes: integer("estimated_minutes"),
  coldChain: boolean("cold_chain").notNull().default(false),
  notes: text("notes"),
  proofOfDeliveryUrl: text("proof_of_delivery_url"),
  assignedAt: timestamp("assigned_at"),
  pickedUpAt: timestamp("picked_up_at"),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

/**
 * partner_accounts — real, per-partner login credentials. Replaces the legacy
 * shared "portal code + email" auth. Each row is one login that is scoped to a
 * single partner entity (partnerId) of a given partnerType. Tokens issued at
 * login carry {pid, partnerType, partnerId} so all portal data reads are
 * entity-scoped server-side.
 */
export const partnerAccounts = pgTable("partner_accounts", {
  id: text("id").primaryKey(),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash"),
  // null until an invited account accepts its invite and sets a password.
  partnerType: text("partner_type").notNull(),
  // partnerType values: supplier | clinic | logistics
  partnerId: text("partner_id").notNull(),
  // links to partner_directory.id (supplier | clinic | logistics profile)
  displayName: text("display_name").notNull(),
  status: text("status").notNull().default("active"),
  // status values: invited | active | suspended
  inviteToken: text("invite_token"),
  inviteExpiresAt: timestamp("invite_expires_at"),
  lastLoginAt: timestamp("last_login_at"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

/**
 * partner_applications — self-signup "become a partner" submissions awaiting
 * admin review. On approval an admin provisions a partner entity + invite.
 */
export const partnerApplications = pgTable("partner_applications", {
  id: text("id").primaryKey(),
  partnerType: text("partner_type").notNull(),
  orgName: text("org_name").notNull(),
  contactName: text("contact_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  message: text("message"),
  status: text("status").notNull().default("pending"),
  // status values: pending | approved | rejected
  reviewNotes: text("review_notes"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

/**
 * partner_directory — normalized supplier / clinic / logistics partner profiles.
 * Replaces cms_docs JSON arrays (`suppliers`, `clinics`, `logistics-partners`).
 * `payload` holds the full admin UI record; indexed columns speed lookups.
 */
export const partnerDirectory = pgTable(
  "partner_directory",
  {
    id: text("id").primaryKey(),
    partnerType: text("partner_type").notNull(),
    // partnerType values: supplier | clinic | logistics
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    email: text("email").notNull().default(""),
    displayName: text("display_name").notNull().default(""),
    status: text("status").notNull().default("pending"),
    portalCode: text("portal_code").notNull().default(""),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    typeIdx: index("partner_directory_type_idx").on(t.partnerType),
  }),
)

/**
 * purchase_orders — admin-raised POs against partner_directory supplier ids.
 */
export const purchaseOrders = pgTable("purchase_orders", {
  id: text("id").primaryKey(),
  supplierId: text("supplier_id").notNull(),
  poNumber: text("po_number").notNull(),
  status: text("status").notNull().default("draft"),
  // draft | sent | confirmed | dispatched | received | disputed | cancelled
  total: integer("total").notNull().default(0),
  expectedDate: timestamp("expected_date"),
  notes: text("notes"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const purchaseOrderLines = pgTable("purchase_order_lines", {
  id: text("id").primaryKey(),
  purchaseOrderId: text("purchase_order_id")
    .notNull()
    .references(() => purchaseOrders.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  qty: integer("qty").notNull(),
  unitPrice: integer("unit_price").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
})

/**
 * supplier_products — a supplier partner's own catalogue: the SKUs, prices,
 * MOQs and lead times they can fulfil. Drives quote pre-fill + procurement.
 */
export const supplierProducts = pgTable("supplier_products", {
  id: text("id").primaryKey(),
  partnerId: text("partner_id").notNull(),
  // supplier partner id (matches partnerAccounts.partnerId)
  productName: text("product_name").notNull(),
  sku: text("sku"),
  category: text("category"),
  unitPrice: integer("unit_price").notNull(),
  // smallest currency unit (KES integers)
  currency: text("currency").notNull().default("KES"),
  moq: integer("moq").notNull().default(1),
  leadTimeDays: integer("lead_time_days").notNull().default(7),
  stockQty: integer("stock_qty").notNull().default(0),
  status: text("status").notNull().default("active"),
  // status values: active | inactive
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

/**
 * clinic_transactions — append-only credit ledger for clinic partners. Every
 * credit-line order writes a `charge`; repayments write a `payment`. The
 * running `balanceAfter` is computed at write time under a row lock so the
 * outstanding balance is always derivable without scanning the whole ledger.
 */
export const clinicTransactions = pgTable("clinic_transactions", {
  id: text("id").primaryKey(),
  clinicPartnerId: text("clinic_partner_id").notNull(),
  orderRef: text("order_ref"),
  type: text("type").notNull(),
  // type values: charge | payment | adjustment
  amount: integer("amount").notNull(),
  // signed: charge is positive (increases outstanding), payment negative
  balanceAfter: integer("balance_after").notNull(),
  note: text("note"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

/**
 * email_outbox — log of every email send attempt for auditing and retry.
 * Populated by EmailService; the `payload` column stores template variables
 * but must not contain raw PII beyond what is already in `recipient`.
 */
export const emailOutbox = pgTable("email_outbox", {
  id: text("id").primaryKey(),
  template: text("template").notNull(),
  recipient: text("recipient").notNull(),
  subject: text("subject").notNull(),
  status: text("status").notNull().default("pending"),
  // status values: pending | sent | failed | skipped
  provider: text("provider").notNull().default("resend"),
  providerId: text("provider_id"),
  error: text("error"),
  payload: jsonb("payload"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// ─────────────────────── Zod schemas ───────────────────────

export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({
  createdAt: true,
  updatedAt: true,
})
export const selectAdminUserSchema = createSelectSchema(adminUsers)
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>
export type AdminUser = typeof adminUsers.$inferSelect

export const insertPatientNoteSchema = createInsertSchema(patientNotes).omit({
  createdAt: true,
  updatedAt: true,
})
export const selectPatientNoteSchema = createSelectSchema(patientNotes)
export type InsertPatientNote = z.infer<typeof insertPatientNoteSchema>
export type PatientNote = typeof patientNotes.$inferSelect

export const insertAdminOrderSchema = createInsertSchema(adminOrders).omit({
  createdAt: true,
  updatedAt: true,
})
export const selectAdminOrderSchema = createSelectSchema(adminOrders)
export type InsertAdminOrder = z.infer<typeof insertAdminOrderSchema>
export type AdminOrderRow = typeof adminOrders.$inferSelect

export const insertSourcingRequestSchema = createInsertSchema(sourcingRequests).omit({
  createdAt: true,
  updatedAt: true,
})
export const selectSourcingRequestSchema = createSelectSchema(sourcingRequests)
export type InsertSourcingRequest = z.infer<typeof insertSourcingRequestSchema>
export type SourcingRequest = typeof sourcingRequests.$inferSelect

export const insertPartnerQuoteSchema = createInsertSchema(partnerQuotes).omit({
  submittedAt: true,
})
export const selectPartnerQuoteSchema = createSelectSchema(partnerQuotes)
export type InsertPartnerQuote = z.infer<typeof insertPartnerQuoteSchema>
export type PartnerQuote = typeof partnerQuotes.$inferSelect

export const insertClinicOrderSchema = createInsertSchema(clinicOrders).omit({
  placedAt: true,
  updatedAt: true,
})
export const selectClinicOrderSchema = createSelectSchema(clinicOrders)
export type InsertClinicOrder = z.infer<typeof insertClinicOrderSchema>
export type ClinicOrder = typeof clinicOrders.$inferSelect

export const insertDeliveryJobSchema = createInsertSchema(deliveryJobs).omit({
  createdAt: true,
  updatedAt: true,
})
export const selectDeliveryJobSchema = createSelectSchema(deliveryJobs)
export type InsertDeliveryJob = z.infer<typeof insertDeliveryJobSchema>
export type DeliveryJob = typeof deliveryJobs.$inferSelect

export const insertEmailOutboxSchema = createInsertSchema(emailOutbox).omit({
  createdAt: true,
})
export const selectEmailOutboxSchema = createSelectSchema(emailOutbox)
export type InsertEmailOutbox = z.infer<typeof insertEmailOutboxSchema>
export type EmailOutbox = typeof emailOutbox.$inferSelect

export const insertPartnerAccountSchema = createInsertSchema(partnerAccounts).omit({
  createdAt: true,
  updatedAt: true,
})
export const selectPartnerAccountSchema = createSelectSchema(partnerAccounts)
export type InsertPartnerAccount = z.infer<typeof insertPartnerAccountSchema>
export type PartnerAccount = typeof partnerAccounts.$inferSelect

export const insertPartnerApplicationSchema = createInsertSchema(partnerApplications).omit({
  createdAt: true,
})
export const selectPartnerApplicationSchema = createSelectSchema(partnerApplications)
export type InsertPartnerApplication = z.infer<typeof insertPartnerApplicationSchema>
export type PartnerApplication = typeof partnerApplications.$inferSelect

export const insertSupplierProductSchema = createInsertSchema(supplierProducts).omit({
  createdAt: true,
  updatedAt: true,
})
export const selectSupplierProductSchema = createSelectSchema(supplierProducts)
export type InsertSupplierProduct = z.infer<typeof insertSupplierProductSchema>
export type SupplierProduct = typeof supplierProducts.$inferSelect

export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrders).omit({
  createdAt: true,
  updatedAt: true,
})
export type PurchaseOrder = typeof purchaseOrders.$inferSelect
export type PurchaseOrderLine = typeof purchaseOrderLines.$inferSelect

export const insertClinicTransactionSchema = createInsertSchema(clinicTransactions).omit({
  createdAt: true,
})
export const selectClinicTransactionSchema = createSelectSchema(clinicTransactions)
export type InsertClinicTransaction = z.infer<typeof insertClinicTransactionSchema>
export type ClinicTransaction = typeof clinicTransactions.$inferSelect

// ─── Pharmacy Branches ───────────────────────────────────────────────────────

export const pharmacyBranches = pgTable("pharmacy_branches", {
  id: text("id").primaryKey(),
  branchCode: text("branch_code").unique().notNull(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull().default(""),
  phone: text("phone"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  status: text("status").notNull().default("active"),
  // status: active | inactive | temporarily_closed
  managerId: text("manager_id"),
  managerName: text("manager_name"),
  managerEmail: text("manager_email"),
  operatingHours: jsonb("operating_hours").$type<Record<string, string>>().default({}),
  maxCapacity: integer("max_capacity").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const pharmacyShifts = pgTable("pharmacy_shifts", {
  id: text("id").primaryKey(),
  branchId: text("branch_id").notNull().references(() => pharmacyBranches.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  daysOfWeek: jsonb("days_of_week").$type<number[]>().notNull().default([]),
  // daysOfWeek: 0=Sun, 1=Mon, ... 6=Sat
  maxStaff: integer("max_staff").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const pharmacyEmployees = pgTable("pharmacy_employees", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  adminUserId: text("admin_user_id"),
  branchId: text("branch_id").notNull().references(() => pharmacyBranches.id, { onDelete: "cascade" }),
  shiftId: text("shift_id").references(() => pharmacyShifts.id, { onDelete: "set null" }),
  displayName: text("display_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  role: text("role").notNull().default("pharmacist"),
  // role: pharmacist | cashier | manager | technician | intern
  status: text("status").notNull().default("active"),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const posTransactions = pgTable("pos_transactions", {
  id: text("id").primaryKey(),
  branchId: text("branch_id").notNull().references(() => pharmacyBranches.id),
  employeeId: text("employee_id"),
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  items: jsonb("items").$type<{ productId: string; name: string; qty: number; unitPrice: number; total: number }[]>().notNull().default([]),
  subtotal: integer("subtotal").notNull().default(0),
  discount: integer("discount").notNull().default(0),
  total: integer("total").notNull().default(0),
  paymentMethod: text("payment_method").notNull().default("cash"),
  paystackRef: text("paystack_ref"),
  status: text("status").notNull().default("pending"),
  // status: pending | paid | cancelled | refunded
  receiptNo: text("receipt_no").unique(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export type PharmacyBranch = typeof pharmacyBranches.$inferSelect
export type PharmacyShift = typeof pharmacyShifts.$inferSelect
export type PharmacyEmployee = typeof pharmacyEmployees.$inferSelect
export type PosTransaction = typeof posTransactions.$inferSelect
