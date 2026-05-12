import { Router } from "express"
import { createOrder } from "../../lib/supabase-data.js"
import { rateLimit, rateLimitResponse, sanitize, isValidPhone, isValidEmail } from "../../lib/security.js"

const router = Router()

router.post("/", async (req, res) => {
  const rl = rateLimit(req, { limit: 5, windowSeconds: 60 })
  if (!rl.success) return rateLimitResponse(res)

  try {
    const body = req.body

    const customerName = sanitize(body.customerName, 100)
    const customerEmail = body.customerEmail ? sanitize(body.customerEmail, 320) : ""
    const customerPhone = sanitize(body.customerPhone, 20)
    const deliveryAddress = sanitize(body.deliveryAddress, 500)
    const notes = sanitize(body.notes, 1000)
    const specialInstructions = body.specialInstructions ? sanitize(body.specialInstructions, 2000) : ""
    const mpesaCode = sanitize(body.mpesaCode, 12)
    const mpesaPhone = sanitize(body.mpesaPhone, 20)
    const mpesaMessage = sanitize(body.mpesaMessage, 2000)

    const isGift = Boolean(body.isGift)
    const giftSelection = body.giftSelection && typeof body.giftSelection === "object" ? body.giftSelection : null
    const giftExtrasTotal = Math.max(0, Number(body.giftExtrasTotal) || 0)

    if (!customerName || !customerPhone || !deliveryAddress || !body.items?.length) {
      return res.status(400).json({ error: "Missing required fields" })
    }

    if (!isValidPhone(customerPhone)) {
      return res.status(400).json({ error: "Invalid phone number format" })
    }

    if (customerEmail && !isValidEmail(customerEmail)) {
      return res.status(400).json({ error: "Invalid email address" })
    }

    if (!Array.isArray(body.items) || body.items.length > 50) {
      return res.status(400).json({ error: "Invalid items" })
    }

    const validPaymentMethods = ["cod", "mpesa", "whatsapp", "card"]
    const paymentMethod = validPaymentMethods.includes(body.paymentMethod) ? body.paymentMethod : "cod"

    const subtotal = Math.max(0, Number(body.subtotal) || 0)
    const deliveryFee = Math.max(0, Number(body.deliveryFee) || 0)
    const total = Math.max(0, Number(body.total) || 0)

    const sanitizedItems = body.items.map((item: Record<string, unknown>) => ({
      productId: sanitize(String(item.productId || ""), 50),
      productName: sanitize(String(item.productName || item.name || ""), 200),
      productImage: item.productImage || item.image ? sanitize(String(item.productImage || item.image || ""), 500) : undefined,
      variation: item.variation ? sanitize(String(item.variation), 100) : undefined,
      quantity: Math.min(100, Math.max(1, Math.floor(Number(item.quantity) || 1))),
      unitPrice: Math.max(0, Number(item.unitPrice || item.price) || 0),
      totalPrice: Math.max(0, Number(item.totalPrice || (Number(item.unitPrice || item.price) || 0) * (Number(item.quantity) || 1))),
    }))

    const result = await createOrder({
      customerName,
      customerEmail,
      customerPhone,
      deliveryLocationId: body.deliveryLocationId,
      deliveryAddress,
      deliveryFee,
      subtotal,
      total,
      notes,
      specialInstructions,
      isGift,
      giftSelection,
      giftExtrasTotal,
      orderedVia: body.orderedVia === "whatsapp" ? "whatsapp" : "website",
      paymentMethod,
      mpesaCode,
      mpesaPhone,
      mpesaMessage,
      items: sanitizedItems,
    })

    res.json(result)
  } catch (error) {
    console.error("Failed to create order:", error)
    const message = error instanceof Error ? error.message : "Failed to create order"
    res.status(500).json({ error: message })
  }
})

export default router
