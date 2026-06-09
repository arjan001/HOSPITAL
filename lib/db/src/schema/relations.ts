/**
 * Drizzle `relations()` declarations for every table that has foreign keys.
 *
 * Drizzle uses these to power query-time joins (`db.query.users.findMany({
 * with: { addresses: true } })`). They are NOT enforced at the database
 * level — `.references()` on the column does the enforcement — but they
 * are required for the `db.query.*` relational API to work.
 *
 * Keeping everything in one file means we can see the entire object graph
 * at a glance, and changes to relationships do not require touching every
 * table file.
 */
import { relations } from "drizzle-orm"
import { users, addresses } from "./users"
import { categories, products, productImages, productVariations } from "./catalog"
import { orders, orderItems } from "./orders"
import {
  prescriptions,
  prescriptionTimeline,
  prescriptionDrugs,
  prescriptionSubscriptions,
  prescriptionRefills,
} from "./prescriptions"
import { crmContacts } from "./crm"
import {
  carePackAssessments,
  carePackAssemblyJobs,
  carePackAssemblyLines,
  inventoryAllocations,
  procurementDecisions,
  supplierSuggestions,
} from "./operations"
import { doctorAccounts, doctors, consultations } from "./consultations"
import { uploads, wishlistItems } from "./uploads"
import { payments } from "./payments"
import { chatThreads, chatMessages } from "./chat"
import { supportTickets, supportMessages } from "./notifications"
import { adminUsers, adminPasswordResets, sourcingRequests, partnerQuotes } from "./admin"

/* ─────────────────── users ─────────────────── */

export const usersRelations = relations(users, ({ many }) => ({
  addresses: many(addresses),
  orders: many(orders),
  prescriptions: many(prescriptions),
  consultations: many(consultations),
  wishlistItems: many(wishlistItems),
  uploads: many(uploads),
  supportTickets: many(supportTickets),
  crmContacts: many(crmContacts),
  carePackAssessments: many(carePackAssessments),
  prescriptionSubscriptions: many(prescriptionSubscriptions),
}))

export const addressesRelations = relations(addresses, ({ one }) => ({
  user: one(users, { fields: [addresses.userId], references: [users.id] }),
}))

/* ─────────────────── catalog ─────────────────── */

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: "category_parent",
  }),
  children: many(categories, { relationName: "category_parent" }),
  products: many(products),
}))

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  images: many(productImages),
  variations: many(productVariations),
}))

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, { fields: [productImages.productId], references: [products.id] }),
}))

export const productVariationsRelations = relations(productVariations, ({ one }) => ({
  product: one(products, { fields: [productVariations.productId], references: [products.id] }),
}))

/* ─────────────────── orders ─────────────────── */

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  items: many(orderItems),
  payments: many(payments),
}))

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
}))

/* ─────────────────── prescriptions ─────────────────── */

export const prescriptionsRelations = relations(prescriptions, ({ one, many }) => ({
  user: one(users, { fields: [prescriptions.userId], references: [users.id] }),
  upload: one(uploads, { fields: [prescriptions.uploadId], references: [uploads.id] }),
  timeline: many(prescriptionTimeline),
  drugs: many(prescriptionDrugs),
  subscriptions: many(prescriptionSubscriptions),
  refills: many(prescriptionRefills),
}))

export const prescriptionTimelineRelations = relations(prescriptionTimeline, ({ one }) => ({
  prescription: one(prescriptions, {
    fields: [prescriptionTimeline.prescriptionId],
    references: [prescriptions.id],
  }),
}))

export const prescriptionDrugsRelations = relations(prescriptionDrugs, ({ one }) => ({
  prescription: one(prescriptions, {
    fields: [prescriptionDrugs.prescriptionId],
    references: [prescriptions.id],
  }),
}))

export const prescriptionSubscriptionsRelations = relations(
  prescriptionSubscriptions,
  ({ one, many }) => ({
    user: one(users, {
      fields: [prescriptionSubscriptions.userId],
      references: [users.id],
    }),
    prescription: one(prescriptions, {
      fields: [prescriptionSubscriptions.prescriptionId],
      references: [prescriptions.id],
    }),
    refills: many(prescriptionRefills),
  }),
)

export const prescriptionRefillsRelations = relations(prescriptionRefills, ({ one }) => ({
  subscription: one(prescriptionSubscriptions, {
    fields: [prescriptionRefills.subscriptionId],
    references: [prescriptionSubscriptions.id],
  }),
  prescription: one(prescriptions, {
    fields: [prescriptionRefills.prescriptionId],
    references: [prescriptions.id],
  }),
}))

/* ─────────────────── CRM & operations (workflow) ─────────────────── */

export const crmContactsRelations = relations(crmContacts, ({ one }) => ({
  user: one(users, { fields: [crmContacts.userId], references: [users.id] }),
}))

export const carePackAssessmentsRelations = relations(carePackAssessments, ({ one }) => ({
  user: one(users, { fields: [carePackAssessments.userId], references: [users.id] }),
}))

/* carePackMappings: config table, no FKs */

export const procurementDecisionsRelations = relations(procurementDecisions, ({ many }) => ({
  suggestions: many(supplierSuggestions),
}))

export const supplierSuggestionsRelations = relations(supplierSuggestions, ({ one }) => ({
  decision: one(procurementDecisions, {
    fields: [supplierSuggestions.procurementDecisionId],
    references: [procurementDecisions.id],
  }),
}))

export const carePackAssemblyJobsRelations = relations(carePackAssemblyJobs, ({ one, many }) => ({
  user: one(users, { fields: [carePackAssemblyJobs.userId], references: [users.id] }),
  lines: many(carePackAssemblyLines),
}))

export const carePackAssemblyLinesRelations = relations(carePackAssemblyLines, ({ one }) => ({
  job: one(carePackAssemblyJobs, {
    fields: [carePackAssemblyLines.jobId],
    references: [carePackAssemblyJobs.id],
  }),
}))

/* ─────────────────── consultations ─────────────────── */

export const doctorsRelations = relations(doctors, ({ many }) => ({
  consultations: many(consultations),
  accounts: many(doctorAccounts),
}))

export const doctorAccountsRelations = relations(doctorAccounts, ({ one }) => ({
  doctor: one(doctors, { fields: [doctorAccounts.doctorId], references: [doctors.id] }),
}))

export const consultationsRelations = relations(consultations, ({ one, many }) => ({
  user: one(users, { fields: [consultations.userId], references: [users.id] }),
  doctor: one(doctors, { fields: [consultations.doctorId], references: [doctors.id] }),
  chatThreads: many(chatThreads),
}))

/* ─────────────────── uploads & wishlist ─────────────────── */

export const uploadsRelations = relations(uploads, ({ one }) => ({
  user: one(users, { fields: [uploads.userId], references: [users.id] }),
}))

export const wishlistItemsRelations = relations(wishlistItems, ({ one }) => ({
  user: one(users, { fields: [wishlistItems.userId], references: [users.id] }),
}))

/* ─────────────────── payments ─────────────────── */

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
}))

/* ─────────────────── chat ─────────────────── */

export const chatThreadsRelations = relations(chatThreads, ({ one, many }) => ({
  // chat_threads is keyed by `patientSessionId` (a Clerk-independent
  // cookie-scoped id) rather than `userId`, so there is no FK to `users`
  // today. Add one once chat is linked to the authenticated user.
  messages: many(chatMessages),
  consultation: one(consultations, {
    fields: [chatThreads.consultationId],
    references: [consultations.id],
  }),
}))

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  thread: one(chatThreads, {
    fields: [chatMessages.threadId],
    references: [chatThreads.id],
  }),
}))

/* ─────────────────── support tickets ─────────────────── */
// `notifications` has an `audience` (admin / doctor / pharmacist) rather
// than a `userId`, so it intentionally has no relation here. Re-add one
// when per-user inboxes are introduced.

export const supportTicketsRelations = relations(supportTickets, ({ one, many }) => ({
  user: one(users, { fields: [supportTickets.userId], references: [users.id] }),
  messages: many(supportMessages),
}))

export const supportMessagesRelations = relations(supportMessages, ({ one }) => ({
  ticket: one(supportTickets, {
    fields: [supportMessages.ticketId],
    references: [supportTickets.id],
  }),
}))

/* ─────────────────── admin ─────────────────── */

export const adminUsersRelations = relations(adminUsers, ({ many }) => ({
  passwordResets: many(adminPasswordResets),
}))

export const adminPasswordResetsRelations = relations(adminPasswordResets, ({ one }) => ({
  adminUser: one(adminUsers, {
    fields: [adminPasswordResets.adminUserId],
    references: [adminUsers.id],
  }),
}))

/* ─────────────────── sourcing ─────────────────── */

export const sourcingRequestsRelations = relations(sourcingRequests, ({ many }) => ({
  quotes: many(partnerQuotes),
}))

export const partnerQuotesRelations = relations(partnerQuotes, ({ one }) => ({
  sourcingRequest: one(sourcingRequests, {
    fields: [partnerQuotes.sourcingRequestId],
    references: [sourcingRequests.id],
  }),
}))
