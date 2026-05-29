"use client"

import { useMemo, useState } from "react"
import { AdminShell } from "./admin-shell"
import { useCmsDoc, newId } from "@/lib/cms-store"
import { notify } from "@/lib/notify"
import { usePermission } from "@/lib/permissions"
import {
  Send, Plus, Trash2, Mail, MessageSquare, Phone, Eye, Copy,
  Search, Save, RotateCcw, Sparkles, Tag as TagIcon, Lock,
} from "lucide-react"

const WINE = "#3D0814"

export type TemplateChannel = "email" | "sms" | "whatsapp"
export type TemplateTrigger =
  | "account_registration"
  | "email_verification"
  | "password_reset_link"
  | "password_reset_otp"
  | "temporary_password"
  | "login_otp"
  | "order_confirmation"
  | "payment_received"
  | "order_dispatched"
  | "order_delivered"
  | "order_cancelled"
  | "refund_issued"
  | "prescription_received"
  | "prescription_verified"
  | "prescription_rejected"
  | "prescription_ready_for_pickup"
  | "consultation_scheduled"
  | "consultation_reminder"
  | "consultation_followup"
  | "welcome"
  | "abandoned_cart"
  | "reorder_reminder"
  | "low_stock_internal"
  | "marketing_broadcast"
  | "custom"

export type MessageTemplate = {
  id: string
  name: string
  channel: TemplateChannel
  trigger: TemplateTrigger
  subject: string         // email only
  body: string            // supports {{variable}} interpolation
  preheader?: string      // email preview text
  whatsappTemplateName?: string // Meta-approved template name
  enabled: boolean
  updatedAt: string
}

const TRIGGER_LABEL: Record<TemplateTrigger, string> = {
  account_registration:        "Account registration",
  email_verification:          "Email verification link",
  password_reset_link:         "Password reset (link)",
  password_reset_otp:          "Password reset (OTP)",
  temporary_password:          "Temporary password sent",
  login_otp:                   "Login OTP",
  order_confirmation:          "Order confirmed",
  payment_received:            "Payment received",
  order_dispatched:            "Order dispatched",
  order_delivered:             "Order delivered",
  order_cancelled:             "Order cancelled",
  refund_issued:               "Refund issued",
  prescription_received:       "Prescription received",
  prescription_verified:       "Prescription verified",
  prescription_rejected:       "Prescription rejected",
  prescription_ready_for_pickup: "Prescription ready for pickup",
  consultation_scheduled:      "Consultation scheduled",
  consultation_reminder:       "Consultation reminder",
  consultation_followup:       "Consultation follow-up",
  welcome:                     "Welcome / first order",
  abandoned_cart:              "Abandoned cart",
  reorder_reminder:            "Reorder reminder",
  low_stock_internal:          "Low stock (internal)",
  marketing_broadcast:         "Marketing broadcast",
  custom:                      "Custom",
}

const CHANNEL_META: Record<TemplateChannel, { label: string; icon: typeof Mail; tip: string }> = {
  email:    { label: "Email",    icon: Mail,          tip: "HTML allowed. Use a clear subject + preheader." },
  sms:      { label: "SMS",      icon: Phone,         tip: "Keep ≤ 160 chars for single segment. No HTML." },
  whatsapp: { label: "WhatsApp", icon: MessageSquare, tip: "Use the Meta-approved template name. Body must match the registered template." },
}

const VARIABLES = [
  { token: "{{patient_name}}",   desc: "Customer full name" },
  { token: "{{first_name}}",     desc: "Customer first name" },
  { token: "{{email}}",          desc: "Customer email address" },
  { token: "{{phone}}",          desc: "Customer phone number" },
  { token: "{{otp_code}}",       desc: "One-time passcode (6 digits)" },
  { token: "{{temp_password}}",  desc: "Temporary password (one-time use)" },
  { token: "{{verify_url}}",     desc: "Email verification link" },
  { token: "{{reset_url}}",      desc: "Password reset link" },
  { token: "{{expires_in}}",     desc: "Time until code/link expires (e.g. 10 minutes)" },
  { token: "{{order_id}}",       desc: "Order number" },
  { token: "{{order_total}}",    desc: "Order grand total with currency" },
  { token: "{{order_items}}",    desc: "Plain-text list of items" },
  { token: "{{payment_method}}", desc: "M-Pesa / Card / Cash on delivery" },
  { token: "{{tracking_url}}",   desc: "Tracking page URL" },
  { token: "{{ship_carrier}}",   desc: "Delivery partner name" },
  { token: "{{ship_eta}}",       desc: "Estimated delivery window" },
  { token: "{{pickup_branch}}",  desc: "Pickup branch / pharmacy name" },
  { token: "{{rx_id}}",          desc: "Prescription id" },
  { token: "{{rx_status}}",      desc: "Prescription status text" },
  { token: "{{rx_reason}}",      desc: "Rejection / clarification reason" },
  { token: "{{consult_time}}",   desc: "Consultation start time (local)" },
  { token: "{{consult_link}}",   desc: "Video consultation join link" },
  { token: "{{doctor_name}}",    desc: "Assigned doctor / pharmacist" },
  { token: "{{refund_amount}}",  desc: "Refund amount with currency" },
  { token: "{{store_name}}",     desc: "Shaniid RX (brand)" },
  { token: "{{support_phone}}",  desc: "Support phone number" },
  { token: "{{support_email}}",  desc: "Support email address" },
]

const NOW = new Date().toISOString()
const T = (
  id: string,
  name: string,
  channel: TemplateChannel,
  trigger: TemplateTrigger,
  subject: string,
  body: string,
  extra: Partial<MessageTemplate> = {},
): MessageTemplate => ({
  id, name, channel, trigger, subject, body,
  enabled: true, updatedAt: NOW, ...extra,
})

const SEED: MessageTemplate[] = [
  // ────────────────────────────────────────────────────────────
  // ACCOUNT & AUTHENTICATION — Email
  // ────────────────────────────────────────────────────────────
  T(
    "tpl_register_email",
    "Account registration — Email",
    "email",
    "account_registration",
    "Welcome to Shaniid RX, {{first_name}} — let's verify your email",
    "Hi {{first_name}},\n\nWelcome to Shaniid RX — the trust layer for medicine in Kenya.\n\nYour account has been created with the email {{email}}. To finish setting up, please verify your address:\n\n{{verify_url}}\n\nThis link expires in {{expires_in}}. If you didn't create this account, you can safely ignore this message.\n\nWith care,\nThe Shaniid RX team\nSupport: {{support_phone}} · {{support_email}}",
    { preheader: "Verify your email to start ordering genuine medicine." },
  ),
  T(
    "tpl_verify_email",
    "Email verification (resend) — Email",
    "email",
    "email_verification",
    "Verify your Shaniid RX email",
    "Hi {{first_name}},\n\nTap the secure link below to confirm your email and unlock your Shaniid RX account:\n\n{{verify_url}}\n\nFor your safety, this link expires in {{expires_in}}. If you didn't request this, no action is needed — your account stays protected.\n\nThe Shaniid RX team",
    { preheader: "One tap to confirm your email — expires soon." },
  ),
  T(
    "tpl_reset_link_email",
    "Password reset (link) — Email",
    "email",
    "password_reset_link",
    "Reset your Shaniid RX password",
    "Hi {{first_name}},\n\nWe received a request to reset the password for {{email}}. Use the secure link below to choose a new one:\n\n{{reset_url}}\n\nFor your safety, the link expires in {{expires_in}} and can be used only once. If you didn't ask for this, you can ignore this email — your current password stays active.\n\nNeed help? {{support_phone}} · {{support_email}}\n\nThe Shaniid RX team",
    { preheader: "Secure link inside — expires soon." },
  ),
  T(
    "tpl_reset_otp_email",
    "Forgot password OTP — Email",
    "email",
    "password_reset_otp",
    "Your Shaniid RX password reset code",
    "Hi {{first_name}},\n\nUse this code to reset your Shaniid RX password:\n\n   {{otp_code}}\n\nThis code expires in {{expires_in}}. For your protection, never share it with anyone — Shaniid RX staff will never ask for your code.\n\nIf you didn't request this, you can safely ignore this email.\n\nThe Shaniid RX team",
    { preheader: "Use this one-time code to reset your password." },
  ),
  T(
    "tpl_temp_password_email",
    "Temporary password — Email",
    "email",
    "temporary_password",
    "Your Shaniid RX temporary password",
    "Hi {{first_name}},\n\nA temporary password has been issued for your Shaniid RX account ({{email}}):\n\n   {{temp_password}}\n\nFor your safety, sign in with this password within {{expires_in}} and you'll be asked to set a new one immediately.\n\nIf you didn't request a temporary password, please contact us right away at {{support_phone}}.\n\nThe Shaniid RX team",
    { preheader: "Use this temporary password — you'll be asked to change it on sign-in." },
  ),
  T(
    "tpl_login_otp_email",
    "Login OTP — Email",
    "email",
    "login_otp",
    "Your Shaniid RX sign-in code",
    "Hi {{first_name}},\n\nHere is your one-time sign-in code:\n\n   {{otp_code}}\n\nIt expires in {{expires_in}}. If this wasn't you, please reset your password right away.\n\nThe Shaniid RX team",
    { preheader: "One-time code to sign in to your Shaniid RX account." },
  ),

  // ────────────────────────────────────────────────────────────
  // ACCOUNT & AUTHENTICATION — SMS
  // ────────────────────────────────────────────────────────────
  T(
    "tpl_register_sms",
    "Account registration — SMS",
    "sms",
    "account_registration",
    "",
    "Shaniid RX: Welcome {{first_name}}! Your account is created. Verify your email at {{verify_url}} (expires in {{expires_in}}).",
  ),
  T(
    "tpl_reset_otp_sms",
    "Forgot password OTP — SMS",
    "sms",
    "password_reset_otp",
    "",
    "Shaniid RX password reset code: {{otp_code}}. Expires in {{expires_in}}. Never share this code with anyone.",
  ),
  T(
    "tpl_temp_password_sms",
    "Temporary password — SMS",
    "sms",
    "temporary_password",
    "",
    "Shaniid RX: temporary password is {{temp_password}}. Sign in within {{expires_in}}; you'll be asked to set a new one. Do not share.",
  ),
  T(
    "tpl_login_otp_sms",
    "Login OTP — SMS",
    "sms",
    "login_otp",
    "",
    "Shaniid RX sign-in code: {{otp_code}}. Expires in {{expires_in}}. If this wasn't you, reset your password.",
  ),

  // ────────────────────────────────────────────────────────────
  // ORDERS — SMS
  // ────────────────────────────────────────────────────────────
  T(
    "tpl_order_confirm_sms",
    "Order confirmation — SMS",
    "sms",
    "order_confirmation",
    "",
    "Hi {{first_name}}, your Shaniid RX order {{order_id}} is confirmed ({{order_total}}, {{payment_method}}). We'll text you when it ships. Track: {{tracking_url}}",
  ),
  T(
    "tpl_payment_received_sms",
    "Payment received — SMS",
    "sms",
    "payment_received",
    "",
    "Shaniid RX: payment of {{order_total}} received for order {{order_id}} via {{payment_method}}. Thank you, {{first_name}}.",
  ),
  T(
    "tpl_order_dispatched_sms",
    "Order dispatched — SMS",
    "sms",
    "order_dispatched",
    "",
    "Shaniid RX: order {{order_id}} is on the way with {{ship_carrier}}. ETA: {{ship_eta}}. Track: {{tracking_url}}",
  ),
  T(
    "tpl_order_delivered_sms",
    "Order delivered — SMS",
    "sms",
    "order_delivered",
    "",
    "Shaniid RX: order {{order_id}} has been delivered. Thank you for trusting us, {{first_name}}. Questions? {{support_phone}}",
  ),
  T(
    "tpl_order_cancelled_sms",
    "Order cancelled — SMS",
    "sms",
    "order_cancelled",
    "",
    "Shaniid RX: order {{order_id}} has been cancelled. Any payment will be refunded within 3 working days. Help: {{support_phone}}",
  ),
  T(
    "tpl_refund_issued_sms",
    "Refund issued — SMS",
    "sms",
    "refund_issued",
    "",
    "Shaniid RX: refund of {{refund_amount}} for order {{order_id}} has been processed to your {{payment_method}}. Allow 1-3 working days.",
  ),

  // ────────────────────────────────────────────────────────────
  // ORDERS — Email
  // ────────────────────────────────────────────────────────────
  T(
    "tpl_order_confirm_email",
    "Order confirmation — Email",
    "email",
    "order_confirmation",
    "Your Shaniid RX order {{order_id}} is confirmed",
    "Hi {{patient_name}},\n\nThank you for choosing Shaniid RX. Your order {{order_id}} totalling {{order_total}} ({{payment_method}}) has been received and is being prepared with care.\n\nItems:\n{{order_items}}\n\nTrack any time: {{tracking_url}}\n\nIf a prescription is required, our pharmacist will verify it before dispatch and we will keep you updated.\n\nWith care,\nThe Shaniid RX team\nSupport: {{support_phone}} · {{support_email}}",
    { preheader: "Thanks for trusting us — here are the details." },
  ),
  T(
    "tpl_order_dispatched_email",
    "Order dispatched — Email",
    "email",
    "order_dispatched",
    "Your Shaniid RX order {{order_id}} is on the way",
    "Hi {{first_name}},\n\nGood news — your order {{order_id}} has just been dispatched with {{ship_carrier}}.\n\nEstimated delivery: {{ship_eta}}\nLive tracking: {{tracking_url}}\n\nOur courier will call before arrival. If you need to update the delivery time or address, reply to this email or call {{support_phone}}.\n\nWith care,\nThe Shaniid RX team",
    { preheader: "On the way — track it live." },
  ),
  T(
    "tpl_order_delivered_email",
    "Order delivered — Email",
    "email",
    "order_delivered",
    "Order {{order_id}} delivered — thank you, {{first_name}}",
    "Hi {{first_name}},\n\nYour Shaniid RX order {{order_id}} has been delivered. We hope it brings comfort and relief to your home.\n\nIf something is missing or doesn't look right, please tell us within 24 hours at {{support_phone}} or {{support_email}} and we'll make it right.\n\nWith care,\nThe Shaniid RX team",
    { preheader: "Delivered with integrity — we're here if you need us." },
  ),

  // ────────────────────────────────────────────────────────────
  // PRESCRIPTIONS — SMS
  // ────────────────────────────────────────────────────────────
  T(
    "tpl_rx_received_sms",
    "Prescription upload received — SMS",
    "sms",
    "prescription_received",
    "",
    "Shaniid RX: we've received your prescription {{rx_id}}. Our pharmacist will review it shortly and confirm next steps. Thank you, {{first_name}}.",
  ),
  T(
    "tpl_rx_verified_sms",
    "Prescription approved — SMS",
    "sms",
    "prescription_verified",
    "",
    "Shaniid RX: prescription {{rx_id}} is APPROVED by our pharmacist. We'll dispatch your order shortly. Questions: {{support_phone}}",
  ),
  T(
    "tpl_rx_rejected_sms",
    "Prescription needs attention — SMS",
    "sms",
    "prescription_rejected",
    "",
    "Shaniid RX: prescription {{rx_id}} needs attention — {{rx_reason}}. Please re-upload a clearer copy or call {{support_phone}}.",
  ),
  T(
    "tpl_rx_pickup_sms",
    "Prescription ready for pickup — SMS",
    "sms",
    "prescription_ready_for_pickup",
    "",
    "Shaniid RX: prescription {{rx_id}} is ready for pickup at {{pickup_branch}}. Bring an ID. We're open today.",
  ),

  // ────────────────────────────────────────────────────────────
  // PRESCRIPTIONS — Email
  // ────────────────────────────────────────────────────────────
  T(
    "tpl_rx_received_email",
    "Prescription upload received — Email",
    "email",
    "prescription_received",
    "We've received your prescription {{rx_id}}",
    "Hi {{patient_name}},\n\nThank you — we've received your prescription {{rx_id}} and our licensed pharmacist will review it shortly. Most prescriptions are verified within a few hours during opening hours.\n\nYou can track its status any time from your account dashboard.\n\nWith care,\nThe Shaniid RX team",
    { preheader: "Our pharmacist will review it shortly." },
  ),
  T(
    "tpl_rx_verified_email",
    "Prescription approved — Email",
    "email",
    "prescription_verified",
    "Prescription {{rx_id}} approved — preparing your order",
    "Hi {{patient_name}},\n\nGood news — your prescription {{rx_id}} has been APPROVED by {{doctor_name}}, our licensed pharmacist.\n\nWe are now preparing your medicine for dispatch and will text you the moment it leaves our facility. If you have any questions about dosage or use, simply reply to this email — a pharmacist will respond.\n\nWith care,\nThe Shaniid RX team",
    { preheader: "Verified by a licensed pharmacist — we're preparing your order." },
  ),
  T(
    "tpl_rx_rejected_email",
    "Prescription needs attention — Email",
    "email",
    "prescription_rejected",
    "Action needed on prescription {{rx_id}}",
    "Hi {{patient_name}},\n\nThank you for uploading prescription {{rx_id}}. Before we can dispense, we need a small clarification:\n\n   {{rx_reason}}\n\nPlease re-upload a clearer photo from your account, or reply to this email with the requested information. If you'd prefer to speak to a pharmacist, call {{support_phone}}.\n\nYour safety is our priority — thank you for your patience.\n\nThe Shaniid RX clinical team",
    { preheader: "A small clarification is needed before we can dispense." },
  ),

  // ────────────────────────────────────────────────────────────
  // CONSULTATIONS
  // ────────────────────────────────────────────────────────────
  T(
    "tpl_consult_scheduled_sms",
    "Consultation scheduled — SMS",
    "sms",
    "consultation_scheduled",
    "",
    "Shaniid RX: your consultation with {{doctor_name}} is booked for {{consult_time}}. We'll send a reminder before it starts.",
  ),
  T(
    "tpl_consult_scheduled_email",
    "Consultation scheduled — Email",
    "email",
    "consultation_scheduled",
    "Your consultation with {{doctor_name}} is booked",
    "Hi {{patient_name}},\n\nYour consultation is confirmed:\n\n   When: {{consult_time}}\n   With: {{doctor_name}}\n   Join link: {{consult_link}}\n\nWe'll send a reminder 30 minutes before your appointment. To reschedule, reply to this email or call {{support_phone}}.\n\nWith care,\nThe Shaniid RX team",
    { preheader: "We'll remind you 30 minutes before it starts." },
  ),
  T(
    "tpl_consult_reminder_sms",
    "Consultation reminder — SMS",
    "sms",
    "consultation_reminder",
    "",
    "Shaniid RX: your consultation with {{doctor_name}} starts at {{consult_time}}. Join: {{consult_link}}",
  ),
  T(
    "tpl_consult_followup_email",
    "Consultation follow-up — Email",
    "email",
    "consultation_followup",
    "Following up after your consultation with {{doctor_name}}",
    "Hi {{patient_name}},\n\nThank you for consulting with us. {{doctor_name}} has prepared a short follow-up note in your account.\n\nIf you would like to ask anything else or book a follow-up appointment, simply reply to this email — we are here for you.\n\nWith care,\nThe Shaniid RX clinical team",
    { preheader: "A short follow-up note from your clinician." },
  ),

  // ────────────────────────────────────────────────────────────
  // LIFECYCLE / MARKETING
  // ────────────────────────────────────────────────────────────
  T(
    "tpl_welcome_email",
    "Welcome — Email",
    "email",
    "welcome",
    "Welcome to Shaniid RX, {{first_name}}",
    "Hi {{first_name}},\n\nWelcome to Shaniid RX — the trust layer for medicine in Kenya.\n\nWhat you can do here:\n• Order genuine medicine from verified suppliers\n• Upload a prescription for licensed pharmacist review\n• Book a chat, voice or video consultation with a clinician\n• Track every order with live updates\n\nNeed help? Call {{support_phone}} or write to {{support_email}}.\n\nWith care,\nThe Shaniid RX team",
    { preheader: "Genuine medicine. Fair prices. Delivered with integrity." },
  ),
  T(
    "tpl_abandoned_cart_email",
    "Abandoned cart — Email",
    "email",
    "abandoned_cart",
    "You left something in your basket, {{first_name}}",
    "Hi {{first_name}},\n\nWe saved your basket for you. Whenever you're ready, complete your order and we'll prepare it with care.\n\n{{order_items}}\n\nContinue checkout: {{tracking_url}}\n\nQuestions? Reply to this email or call {{support_phone}}.\n\nThe Shaniid RX team",
    { preheader: "Your basket is saved — finish checkout when you're ready." },
  ),
  T(
    "tpl_reorder_reminder_sms",
    "Reorder reminder — SMS",
    "sms",
    "reorder_reminder",
    "",
    "Shaniid RX: your last refill of {{order_items}} may be running low. Reorder in one tap: {{tracking_url}}",
  ),

  // ────────────────────────────────────────────────────────────
  // WHATSAPP (Meta-approved)
  // ────────────────────────────────────────────────────────────
  T(
    "tpl_register_whatsapp",
    "Account registration — WhatsApp",
    "whatsapp",
    "account_registration",
    "",
    "Welcome to Shaniid RX, {{first_name}}! Your account is ready. Verify your email here: {{verify_url}} (expires in {{expires_in}}).",
    { whatsappTemplateName: "account_registration_v1" },
  ),
  T(
    "tpl_reset_otp_whatsapp",
    "Forgot password OTP — WhatsApp",
    "whatsapp",
    "password_reset_otp",
    "",
    "Shaniid RX password reset code: {{otp_code}}. Expires in {{expires_in}}. Never share this code.",
    { whatsappTemplateName: "password_reset_otp_v1" },
  ),
  T(
    "tpl_order_confirm_whatsapp",
    "Order confirmation — WhatsApp",
    "whatsapp",
    "order_confirmation",
    "",
    "Hi {{first_name}}, your Shaniid RX order {{order_id}} ({{order_total}}) is confirmed. Track: {{tracking_url}}",
    { whatsappTemplateName: "order_confirmation_v1" },
  ),
  T(
    "tpl_rx_verified_whatsapp",
    "Prescription approved — WhatsApp",
    "whatsapp",
    "prescription_verified",
    "",
    "Hi {{first_name}}, your prescription {{rx_id}} has been verified by our pharmacist {{doctor_name}}. We'll dispatch your order shortly. Reply for help.",
    { whatsappTemplateName: "rx_verified_v1" },
  ),
  T(
    "tpl_consult_reminder_whatsapp",
    "Consultation reminder — WhatsApp",
    "whatsapp",
    "consultation_reminder",
    "",
    "Shaniid RX: your consultation with {{doctor_name}} starts at {{consult_time}}. Join: {{consult_link}}",
    { whatsappTemplateName: "consultation_reminder_v1" },
  ),
  T(
    "tpl_rx_received_whatsapp",
    "Prescription received (upload) — WhatsApp",
    "whatsapp",
    "prescription_received",
    "",
    "Hi {{first_name}}, we've received your prescription {{rx_id}}. Our pharmacist is reviewing it now and we'll message you the moment it's verified. Reply here if you have any questions.",
    { whatsappTemplateName: "prescription_received_v1" },
  ),
  T(
    "tpl_rx_ready_pickup_whatsapp",
    "Prescription ready for pickup — WhatsApp",
    "whatsapp",
    "prescription_ready_for_pickup",
    "",
    "Hi {{first_name}}, your order {{order_id}} is ready for pickup at our pharmacy. Please bring your ID. Need delivery instead? Just reply here.",
    { whatsappTemplateName: "prescription_ready_for_pickup_v1" },
  ),
  T(
    "tpl_payment_received_whatsapp",
    "Payment received — WhatsApp",
    "whatsapp",
    "payment_received",
    "",
    "Shaniid RX: payment of {{order_total}} received for order {{order_id}} via {{payment_method}}. Thank you, {{first_name}} — we're preparing your medicine now.",
    { whatsappTemplateName: "payment_received_v1" },
  ),
  T(
    "tpl_order_dispatched_whatsapp",
    "Order dispatched — WhatsApp",
    "whatsapp",
    "order_dispatched",
    "",
    "Good news {{first_name}}! Your Shaniid RX order {{order_id}} has been dispatched and is on its way. Track it here: {{tracking_url}}",
    { whatsappTemplateName: "order_dispatched_v1" },
  ),
  T(
    "tpl_order_delivered_whatsapp",
    "Order delivered — WhatsApp",
    "whatsapp",
    "order_delivered",
    "",
    "Hi {{first_name}}, your Shaniid RX order {{order_id}} has been delivered. We hope you feel better soon. Questions about your medicine? Reply here anytime.",
    { whatsappTemplateName: "order_delivered_v1" },
  ),
  T(
    "tpl_login_otp_whatsapp",
    "Login OTP — WhatsApp",
    "whatsapp",
    "login_otp",
    "",
    "Shaniid RX sign-in code: {{otp_code}}. Expires in {{expires_in}}. If this wasn't you, please reset your password.",
    { whatsappTemplateName: "login_otp_v1" },
  ),
]

const SAMPLE_PREVIEW: Record<string, string> = {
  patient_name:   "Aisha Mwangi",
  first_name:     "Aisha",
  email:          "aisha@example.com",
  phone:          "+254 712 345 678",
  otp_code:       "482 913",
  temp_password:  "ShxTmp-7K2QnA",
  verify_url:     "https://shaniidrx.co.ke/verify/abc123",
  reset_url:      "https://shaniidrx.co.ke/reset/abc123",
  expires_in:     "10 minutes",
  order_id:       "SHX-100412",
  order_total:    "KSh 3,450",
  order_items:    "• Panadol Extra 24s × 1\n• Ventolin Inhaler 100mcg × 1",
  payment_method: "M-Pesa",
  tracking_url:   "https://shaniidrx.co.ke/track/SHX-100412",
  ship_carrier:   "Sendy",
  ship_eta:       "Today, 4:00 – 6:00 PM",
  pickup_branch:  "Shaniid RX Westlands",
  rx_id:          "rx-001",
  rx_status:      "Verified",
  rx_reason:      "The dosage on the photo is unclear",
  consult_time:   "Today at 5:30 PM",
  consult_link:   "https://shaniidrx.co.ke/consult/join/abc",
  doctor_name:    "Dr. Wanjiku",
  refund_amount:  "KSh 1,200",
  store_name:     "Shaniid RX",
  support_phone:  "+254 700 000 000",
  support_email:  "care@shaniidrx.co.ke",
}

function interpolate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, k) => vars[k.toLowerCase()] ?? `{{${k}}}`)
}

export function AdminMessageTemplates() {
  const canManage = usePermission("integrations.manage")
  const [items, setItems] = useCmsDoc<MessageTemplate[]>("message-templates", SEED)
  const [filter, setFilter] = useState<TemplateChannel | "all">("all")
  const [search, setSearch] = useState("")
  const [activeId, setActiveId] = useState<string | null>(items[0]?.id || null)
  const [draft, setDraft] = useState<MessageTemplate | null>(items[0] || null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items
      .filter((t) => filter === "all" || t.channel === filter)
      .filter((t) =>
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.body.toLowerCase().includes(q) ||
        TRIGGER_LABEL[t.trigger].toLowerCase().includes(q),
      )
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [items, filter, search])

  const active = items.find((t) => t.id === activeId) || null
  const dirty = !!draft && !!active && JSON.stringify(draft) !== JSON.stringify(active)

  const select = (id: string) => {
    setActiveId(id)
    setDraft(items.find((t) => t.id === id) || null)
  }

  const save = () => {
    if (!canManage) { notify.warning("You don't have permission to edit templates."); return }
    if (!draft) return
    const updated = { ...draft, updatedAt: new Date().toISOString() }
    setItems((arr) => arr.map((t) => (t.id === updated.id ? updated : t)))
    setDraft(updated)
    notify.saved("Template saved")
  }

  const discard = () => {
    if (!active) return
    setDraft(active)
    notify.info("Reverted unsaved changes")
  }

  const create = () => {
    if (!canManage) { notify.warning("You don't have permission to create templates."); return }
    const t: MessageTemplate = {
      id: newId("tpl"),
      name: "New template",
      channel: "sms",
      trigger: "custom",
      subject: "",
      body: "",
      enabled: false,
      updatedAt: new Date().toISOString(),
    }
    setItems((arr) => [t, ...arr])
    setActiveId(t.id)
    setDraft(t)
    notify.info("Draft created — fill it in then Save")
  }

  const duplicate = () => {
    if (!canManage || !active) return
    const t: MessageTemplate = {
      ...active,
      id: newId("tpl"),
      name: `${active.name} (copy)`,
      enabled: false,
      updatedAt: new Date().toISOString(),
    }
    setItems((arr) => [t, ...arr])
    setActiveId(t.id)
    setDraft(t)
    notify.info("Duplicated")
  }

  const remove = () => {
    if (!canManage || !active) return
    if (!window.confirm(`Delete template "${active.name}"?`)) return
    setItems((arr) => arr.filter((t) => t.id !== active.id))
    const next = items.find((t) => t.id !== active.id) || null
    setActiveId(next?.id || null)
    setDraft(next)
    notify.saved("Template removed")
  }

  const insertVar = (token: string) => {
    if (!draft) return
    setDraft({ ...draft, body: (draft.body || "") + " " + token })
  }

  return (
    <AdminShell title="Message templates">
      <div className="space-y-4">
        <header className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-lg grid place-items-center text-white shadow-sm" style={{ background: WINE }}>
              <Send className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Message templates</h1>
              <p className="text-sm text-muted-foreground max-w-xl">
                Reusable copy for SMS, WhatsApp and email — sent automatically on orders, prescriptions, consultations and marketing campaigns. Use {"{{variables}}"} to personalise.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={create}
            disabled={!canManage}
            className="h-10 px-4 rounded-md text-sm font-semibold text-white inline-flex items-center gap-2 disabled:opacity-40"
            style={{ background: WINE }}
          >
            <Plus className="h-4 w-4" /> New template
          </button>
        </header>

        {!canManage && (
          <div className="rounded-md border border-amber-200 bg-amber-50 text-amber-900 text-xs px-3 py-2 inline-flex items-center gap-2">
            <Lock className="h-3.5 w-3.5" />
            Read-only — requires <code className="font-mono text-[11px] px-1 rounded bg-amber-100">integrations.manage</code>.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
          {/* List */}
          <aside className="space-y-3">
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  placeholder="Search templates…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-9 pl-8 pr-3 rounded-md border border-border bg-background text-sm"
                />
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {(["all", "email", "sms", "whatsapp"] as const).map((k) => (
                  <button
                    key={k}
                    onClick={() => setFilter(k)}
                    className={`h-7 px-2.5 rounded-full text-[11px] font-semibold border ${
                      filter === k
                        ? "bg-foreground text-background border-foreground"
                        : "bg-background hover:bg-secondary border-border"
                    }`}
                  >
                    {k === "all" ? "All" : CHANNEL_META[k].label}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-background overflow-hidden divide-y divide-border max-h-[72vh] overflow-y-auto">
              {filtered.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-8">No templates.</p>
              )}
              {filtered.map((t) => {
                const Icon = CHANNEL_META[t.channel].icon
                return (
                  <button
                    key={t.id}
                    onClick={() => select(t.id)}
                    className={`w-full text-left px-3 py-2.5 transition-colors ${
                      activeId === t.id
                        ? "bg-foreground/5 border-l-2 border-l-foreground"
                        : "hover:bg-muted/30 border-l-2 border-l-transparent"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{t.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{TRIGGER_LABEL[t.trigger]}</p>
                      </div>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded inline-flex items-center gap-1 ${
                          t.enabled ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Icon className="h-3 w-3" />
                        {t.channel}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </aside>

          {/* Editor */}
          <section className="rounded-lg border border-border bg-background">
            {!draft ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                Select a template to edit, or create a new one.
              </div>
            ) : (
              <div className="divide-y divide-border">
                <div className="p-4 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <input
                      value={draft.name}
                      onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                      className="text-lg font-bold bg-transparent border-b border-transparent hover:border-border focus:border-foreground focus:outline-none px-1"
                    />
                    <label className="inline-flex items-center gap-1.5 text-xs">
                      <input
                        type="checkbox"
                        checked={draft.enabled}
                        onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
                      />
                      Enabled
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={duplicate}
                      disabled={!canManage}
                      className="h-8 px-2.5 rounded-md text-xs font-semibold border border-border inline-flex items-center gap-1 hover:bg-secondary disabled:opacity-40"
                    >
                      <Copy className="h-3.5 w-3.5" /> Duplicate
                    </button>
                    <button
                      onClick={remove}
                      disabled={!canManage}
                      className="h-8 px-2.5 rounded-md text-xs font-semibold text-red-700 inline-flex items-center gap-1 hover:bg-red-50 disabled:opacity-40"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                    <button
                      onClick={discard}
                      disabled={!dirty}
                      className="h-8 px-2.5 rounded-md text-xs font-semibold border border-border inline-flex items-center gap-1 hover:bg-secondary disabled:opacity-40"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Revert
                    </button>
                    <button
                      onClick={save}
                      disabled={!dirty || !canManage}
                      className="h-8 px-3 rounded-md text-xs font-bold text-white inline-flex items-center gap-1 disabled:opacity-40"
                      style={{ background: WINE }}
                    >
                      <Save className="h-3.5 w-3.5" /> Save
                    </button>
                  </div>
                </div>

                <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field label="Channel">
                    <select
                      value={draft.channel}
                      onChange={(e) => setDraft({ ...draft, channel: e.target.value as TemplateChannel })}
                      className="cinput"
                    >
                      {(["email", "sms", "whatsapp"] as const).map((c) => (
                        <option key={c} value={c}>{CHANNEL_META[c].label}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Trigger">
                    <select
                      value={draft.trigger}
                      onChange={(e) => setDraft({ ...draft, trigger: e.target.value as TemplateTrigger })}
                      className="cinput"
                    >
                      {(Object.keys(TRIGGER_LABEL) as TemplateTrigger[]).map((k) => (
                        <option key={k} value={k}>{TRIGGER_LABEL[k]}</option>
                      ))}
                    </select>
                  </Field>
                  {draft.channel === "whatsapp" && (
                    <Field label="WhatsApp template name">
                      <input
                        value={draft.whatsappTemplateName || ""}
                        onChange={(e) => setDraft({ ...draft, whatsappTemplateName: e.target.value })}
                        placeholder="rx_verified_v1"
                        className="cinput"
                      />
                    </Field>
                  )}
                </div>

                {draft.channel === "email" && (
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-border">
                    <Field label="Subject">
                      <input
                        value={draft.subject}
                        onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                        placeholder="Your Shaniid RX order is on its way"
                        className="cinput"
                      />
                    </Field>
                    <Field label="Preheader (preview text)">
                      <input
                        value={draft.preheader || ""}
                        onChange={(e) => setDraft({ ...draft, preheader: e.target.value })}
                        placeholder="Tracking link inside"
                        className="cinput"
                      />
                    </Field>
                  </div>
                )}

                <div className="p-4 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 border-t border-border">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Body</label>
                      <span className="text-[10px] text-muted-foreground">
                        {draft.body.length} chars{draft.channel === "sms" && ` · ${Math.ceil((draft.body.length || 1) / 160)} SMS segment(s)`}
                      </span>
                    </div>
                    <textarea
                      value={draft.body}
                      onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                      rows={12}
                      placeholder={CHANNEL_META[draft.channel].tip}
                      className="cinput font-mono text-[13px] leading-snug"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1.5 inline-flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      {CHANNEL_META[draft.channel].tip}
                    </p>
                  </div>
                  <aside className="space-y-3">
                    <div>
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 inline-flex items-center gap-1.5">
                        <TagIcon className="h-3 w-3" /> Variables
                      </h4>
                      <div className="rounded-md border border-border divide-y divide-border max-h-48 overflow-y-auto">
                        {VARIABLES.map((v) => (
                          <button
                            key={v.token}
                            onClick={() => insertVar(v.token)}
                            disabled={!canManage}
                            className="w-full text-left px-2 py-1.5 hover:bg-secondary text-xs disabled:opacity-40"
                            title={`Insert ${v.token}`}
                          >
                            <code className="font-mono text-[11px] font-semibold" style={{ color: WINE }}>{v.token}</code>
                            <p className="text-[10px] text-muted-foreground">{v.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </aside>
                </div>

                <div className="p-4 border-t border-border">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 inline-flex items-center gap-1.5">
                    <Eye className="h-3 w-3" /> Preview (with sample data)
                  </h4>
                  <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
                    {draft.channel === "email" && (
                      <div className="mb-2 pb-2 border-b border-border">
                        <p className="text-xs text-muted-foreground">Subject</p>
                        <p className="font-semibold">{interpolate(draft.subject || "(no subject)", SAMPLE_PREVIEW)}</p>
                        {draft.preheader && (
                          <p className="text-xs text-muted-foreground italic mt-1">{interpolate(draft.preheader, SAMPLE_PREVIEW)}</p>
                        )}
                      </div>
                    )}
                    <pre className="whitespace-pre-wrap font-sans text-sm">
                      {interpolate(draft.body || "(empty body)", SAMPLE_PREVIEW)}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      <style>{`.cinput{width:100%;height:2.25rem;padding:0 0.75rem;border-radius:0.375rem;border:1px solid hsl(var(--border));background:hsl(var(--background));font-size:0.8125rem;}
        textarea.cinput{height:auto;padding:0.5rem 0.75rem;line-height:1.4;}
        .cinput:focus{outline:none;border-color:${WINE};box-shadow:0 0 0 3px rgba(61,8,20,0.1);}`}</style>
    </AdminShell>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}
