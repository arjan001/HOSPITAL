import { index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core"
import { users } from "./users"

/** Post-delivery customer feedback (rating + optional NPS + comment). */
export const deliveryFeedback = pgTable(
  "delivery_feedback",
  {
    id: text("id").primaryKey(),
    orderRef: text("order_ref").notNull(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    deliveryId: text("delivery_id"),
    rating: integer("rating").notNull(),
    nps: integer("nps"),
    comment: text("comment"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    orderIdx: index("delivery_feedback_order_idx").on(t.orderRef),
    orderUq: uniqueIndex("delivery_feedback_order_uq").on(t.orderRef),
  }),
)
