import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

interface OrderItem {
  productName: string
  quantity: number
  unitPrice: number
  totalPrice: number
  variation?: string
}

interface OrderEmailData {
  orderNumber: string
  customerName: string
  customerEmail: string
  customerPhone: string
  items: OrderItem[]
  subtotal: number
  deliveryFee: number
  total: number
  deliveryAddress: string
  paymentMethod: string
  mpesaCode?: string
}

function formatPrice(amount: number): string {
  return `KSh ${amount.toLocaleString("en-KE")}`
}

function getPaymentLabel(method: string, mpesaCode?: string): string {
  if (method === "mpesa") return mpesaCode ? `M-PESA (${mpesaCode})` : "M-PESA"
  if (method === "whatsapp") return "WhatsApp Order"
  return "Cash on Delivery"
}

function buildOrderEmailHtml(data: OrderEmailData): string {
  const itemRows = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#1a1a1a;">
          ${item.productName}${item.variation ? `<br><span style="font-size:12px;color:#888;">${item.variation}</span>` : ""}
        </td>
        <td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#1a1a1a;text-align:center;">
          ${item.quantity}
        </td>
        <td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#1a1a1a;text-align:right;">
          ${formatPrice(item.totalPrice)}
        </td>
      </tr>`
    )
    .join("")

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:4px;overflow:hidden;max-width:600px;">
        
        <!-- Header -->
        <tr>
          <td style="background-color:#1a1a1a;padding:28px 32px;text-align:center;">
            <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:2px;">ELANI BEAUTY HUB</h1>
            <p style="margin:4px 0 0;font-size:11px;color:#999;letter-spacing:1px;">BEAUTY COLLECTION</p>
          </td>
        </tr>

        <!-- Confirmation Banner -->
        <tr>
          <td style="padding:32px 32px 24px;text-align:center;">
            <div style="width:56px;height:56px;border-radius:50%;background-color:#e8f5e9;margin:0 auto 16px;line-height:56px;font-size:28px;">&#10003;</div>
            <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#1a1a1a;">Order Confirmed</h2>
            <p style="margin:0;font-size:14px;color:#666;">Thank you for shopping with us, ${data.customerName}!</p>
          </td>
        </tr>

        <!-- Order Number -->
        <tr>
          <td style="padding:0 32px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f8f8;border-radius:4px;">
              <tr>
                <td style="padding:16px 20px;">
                  <span style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:1px;">Order Number</span><br>
                  <span style="font-size:18px;font-weight:700;color:#1a1a1a;font-family:monospace;letter-spacing:2px;">${data.orderNumber}</span>
                </td>
                <td style="padding:16px 20px;text-align:right;">
                  <span style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:1px;">Payment</span><br>
                  <span style="font-size:14px;font-weight:600;color:#1a1a1a;">${getPaymentLabel(data.paymentMethod, data.mpesaCode)}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Items Table -->
        <tr>
          <td style="padding:0 32px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eee;border-radius:4px;overflow:hidden;">
              <tr style="background-color:#fafafa;">
                <td style="padding:10px 16px;font-size:11px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #eee;">Item</td>
                <td style="padding:10px 16px;font-size:11px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:1px;text-align:center;border-bottom:1px solid #eee;">Qty</td>
                <td style="padding:10px 16px;font-size:11px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:1px;text-align:right;border-bottom:1px solid #eee;">Price</td>
              </tr>
              ${itemRows}
            </table>
          </td>
        </tr>

        <!-- Totals -->
        <tr>
          <td style="padding:0 32px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:6px 0;font-size:14px;color:#666;">Subtotal</td>
                <td style="padding:6px 0;font-size:14px;color:#1a1a1a;text-align:right;">${formatPrice(data.subtotal)}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;font-size:14px;color:#666;">Delivery</td>
                <td style="padding:6px 0;font-size:14px;color:#1a1a1a;text-align:right;">${data.deliveryFee > 0 ? formatPrice(data.deliveryFee) : "Free"}</td>
              </tr>
              <tr>
                <td colspan="2" style="padding:8px 0 0;border-top:2px solid #1a1a1a;"></td>
              </tr>
              <tr>
                <td style="padding:4px 0;font-size:16px;font-weight:700;color:#1a1a1a;">Total</td>
                <td style="padding:4px 0;font-size:16px;font-weight:700;color:#1a1a1a;text-align:right;">${formatPrice(data.total)}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Delivery Info -->
        <tr>
          <td style="padding:0 32px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f8f8;border-radius:4px;">
              <tr>
                <td style="padding:16px 20px;">
                  <span style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:1px;">Delivery To</span><br>
                  <span style="font-size:14px;color:#1a1a1a;line-height:1.5;">${data.deliveryAddress}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Track Order Button -->
        <tr>
          <td style="padding:0 32px 32px;text-align:center;">
            <a href="https://elanibeautyhub.com/track-order/${data.orderNumber}" 
               style="display:inline-block;background-color:#1a1a1a;color:#ffffff;padding:14px 32px;font-size:14px;font-weight:600;text-decoration:none;border-radius:4px;letter-spacing:0.5px;">
              Track Your Order
            </a>
          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="padding:0 32px;"><hr style="border:none;border-top:1px solid #eee;margin:0;"></td></tr>

        <!-- Contact -->
        <tr>
          <td style="padding:24px 32px;text-align:center;">
            <p style="margin:0 0 8px;font-size:13px;color:#888;">Questions about your order?</p>
            <p style="margin:0;font-size:13px;color:#666;">
              WhatsApp: <a href="https://wa.me/254780406059" style="color:#1a1a1a;text-decoration:none;font-weight:600;">0780 406 059</a>
              &nbsp;&bull;&nbsp;
              Email: <a href="mailto:herkingdomlive@gmail.com" style="color:#1a1a1a;text-decoration:none;font-weight:600;">herkingdomlive@gmail.com</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background-color:#fafafa;padding:20px 32px;text-align:center;border-top:1px solid #eee;">
            <p style="margin:0 0 4px;font-size:11px;color:#aaa;">Dynamic Mall, 2nd Floor, Room ML 96, Nairobi CBD</p>
            <p style="margin:0;font-size:11px;color:#aaa;">
              Built by <a href="https://oneplusafrica.com" style="color:#888;text-decoration:none;">OnePlusAfrica Tech Solutions</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function sendOrderConfirmationEmail(data: OrderEmailData): Promise<boolean> {
  // Skip if SMTP not configured or no customer email
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS || !data.customerEmail) {
    console.log("[email] SMTP not configured or no customer email -- skipping")
    return false
  }

  try {
    const fromName = process.env.SMTP_FROM_NAME || "Her Kingdom"
    const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: data.customerEmail,
      subject: `Order Confirmed - ${data.orderNumber} | Her Kingdom`,
      html: buildOrderEmailHtml(data),
    })

    console.log(`[email] Order confirmation sent to ${data.customerEmail} for ${data.orderNumber}`)
    return true
  } catch (error) {
    console.error("[email] Failed to send order confirmation:", error)
    return false
  }
}
