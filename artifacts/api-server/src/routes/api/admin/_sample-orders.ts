export type AdminSampleOrderItem = {
  name: string
  qty: number
  price: number
  variation?: string
}

export type AdminSampleOrder = {
  id: string
  orderNo: string
  customer: string
  phone: string
  email: string
  items: AdminSampleOrderItem[]
  subtotal: number
  delivery: number
  total: number
  location: string
  address: string
  notes: string
  specialInstructions: string
  isGift: boolean
  giftSelection: null
  giftExtrasTotal: number
  status: "pending" | "confirmed" | "dispatched" | "delivered" | "cancelled"
  orderedVia: string
  paymentMethod: string
  mpesaCode: string
  mpesaPhone: string
  mpesaMessage: string
  date: string
}

const today = new Date()
const isoDay = (offset: number): string => {
  const d = new Date(today.getTime() - offset * 24 * 60 * 60 * 1000)
  return d.toISOString().split("T")[0] as string
}

const make = (
  i: number,
  status: AdminSampleOrder["status"],
  customer: string,
  phone: string,
  email: string,
  location: string,
  address: string,
  items: AdminSampleOrderItem[],
  delivery: number,
  payment: string,
  daysAgo: number,
  notes = "",
): AdminSampleOrder => {
  const subtotal = items.reduce((s, it) => s + it.qty * it.price, 0)
  return {
    id: `sample-${String(i).padStart(4, "0")}-${Math.random().toString(16).slice(2, 10)}`,
    orderNo: `SHX-${(100400 + i).toString()}`,
    customer,
    phone,
    email,
    items,
    subtotal,
    delivery,
    total: subtotal + delivery,
    location,
    address,
    notes,
    specialInstructions: "",
    isGift: false,
    giftSelection: null,
    giftExtrasTotal: 0,
    status,
    orderedVia: "website",
    paymentMethod: payment,
    mpesaCode: payment === "mpesa" ? `QGT${(7000000 + i * 13).toString(36).toUpperCase()}` : "",
    mpesaPhone: payment === "mpesa" ? phone : "",
    mpesaMessage: payment === "mpesa" ? `Confirmed. KSh ${subtotal + delivery} paid to Shaniid RX.` : "",
    date: isoDay(daysAgo),
  }
}

export const SAMPLE_ADMIN_ORDERS: AdminSampleOrder[] = [
  make(1, "pending", "Aisha Mwangi", "+254712345678", "aisha@example.com",
    "Westlands", "Apt 4B, Riverside Lane, Westlands, Nairobi",
    [
      { name: "Paracetamol 500mg (100 tabs)", qty: 1, price: 320 },
      { name: "Zinc 25mg (30 tabs)", qty: 1, price: 450 },
      { name: "Digital Thermometer", qty: 1, price: 800 },
    ],
    150, "mpesa", 0, "Customer requested afternoon delivery."),

  make(2, "confirmed", "Brian Otieno", "+254711222333", "brian.o@example.com",
    "Kilimani", "Suite 12, Kilimani Heights, Nairobi",
    [
      { name: "Amoxicillin 500mg (21 caps)", qty: 1, price: 480, variation: "Capsules" },
      { name: "Vitamin C 1000mg (30 tabs)", qty: 2, price: 650 },
    ],
    200, "card", 0),

  make(3, "dispatched", "Naomi Wanjiru", "+254700111222", "naomi.w@example.com",
    "Roysambu", "House 12, Garden Estate, Roysambu",
    [
      { name: "Ventolin Inhaler 100mcg", qty: 1, price: 950 },
      { name: "Salbutamol Nebules 2.5mg (10s)", qty: 1, price: 720 },
    ],
    250, "mpesa", 1),

  make(4, "delivered", "Hassan Yusuf", "+254799887766", "h.yusuf@example.com",
    "Eastleigh", "12th Street, Eastleigh North",
    [
      { name: "Metformin 500mg (100 tabs)", qty: 1, price: 720 },
      { name: "Amlodipine 5mg (30 tabs)", qty: 2, price: 410 },
      { name: "Blood Pressure Monitor", qty: 1, price: 3800 },
    ],
    200, "mpesa", 2),

  make(5, "delivered", "Grace Akinyi", "+254722334455", "grace.akinyi@example.com",
    "Karen", "Plot 88, Karen Hardy Road, Nairobi",
    [
      { name: "Folic Acid 5mg (60 tabs)", qty: 1, price: 280 },
      { name: "Iron + B-Complex (30 caps)", qty: 1, price: 540 },
      { name: "Maternal Multivitamin (30s)", qty: 1, price: 1200 },
    ],
    300, "card", 3),

  make(6, "delivered", "Mark Kiprono", "+254733998877", "mark.k@example.com",
    "Eldoret", "Uganda Road, opposite KCB, Eldoret",
    [
      { name: "Panadol Extra 24 tabs", qty: 3, price: 250 },
      { name: "Strepsils Honey & Lemon (24s)", qty: 1, price: 420 },
    ],
    400, "cod", 4),

  make(7, "cancelled", "Linet Cherono", "+254700445566", "linet.c@example.com",
    "Mombasa", "Nyali Road, near City Mall",
    [
      { name: "Ibuprofen 400mg (20 tabs)", qty: 1, price: 280 },
    ],
    350, "mpesa", 5, "Customer cancelled — wrong dosage requested."),

  make(8, "delivered", "Joseph Mutua", "+254755112233", "j.mutua@example.com",
    "South B", "Apt 7, Plainsview, South B",
    [
      { name: "Glucometer Starter Kit", qty: 1, price: 2200 },
      { name: "Glucose Test Strips (50s)", qty: 2, price: 1450 },
    ],
    200, "mpesa", 6),

  make(9, "dispatched", "Fatuma Said", "+254788776655", "fatuma.s@example.com",
    "Lavington", "Kingara Road, Lavington Green",
    [
      { name: "Cetirizine 10mg (30 tabs)", qty: 1, price: 220 },
      { name: "Vicks VapoRub 50g", qty: 1, price: 380 },
      { name: "Throat Lozenges (24s)", qty: 2, price: 320 },
    ],
    150, "card", 1),

  make(10, "confirmed", "Peter Njoroge", "+254712998877", "peter.n@example.com",
    "Thika", "Section 9, Thika Town",
    [
      { name: "Omeprazole 20mg (28 caps)", qty: 1, price: 420 },
      { name: "Antacid Suspension 200ml", qty: 1, price: 280 },
    ],
    300, "cod", 0),

  make(11, "delivered", "Sarah Wambui", "+254700887799", "sarah.w@example.com",
    "Kasarani", "Mwiki, Kasarani",
    [
      { name: "Augmentin 625mg (14 tabs)", qty: 1, price: 1850 },
    ],
    150, "mpesa", 7),

  make(12, "pending", "Ali Mohamed", "+254799001122", "ali.m@example.com",
    "Westlands", "Sarit Centre area, Westlands",
    [
      { name: "Hand Sanitizer 500ml", qty: 2, price: 380 },
      { name: "Surgical Masks (50s)", qty: 1, price: 520 },
      { name: "Pulse Oximeter", qty: 1, price: 2400 },
    ],
    200, "mpesa", 0),
]
