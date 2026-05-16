"use client"

/**
 * Thin per-page wrappers around the sourcing sub-tab components so each
 * sub-module gets its own URL (and its own sidebar entry under Sourcing).
 * This replaces the cramped horizontally-scrolling tab strip inside
 * AdminSourcing with proper top-level navigation.
 */

import { AdminShell } from "./admin-shell"
import { SourcingInventoryTab } from "./sourcing-inventory"
import { SourcingForecastTab } from "./sourcing-forecast"
import { SourcingPricingTab } from "./sourcing-pricing"
import { SourcingAutomationTab } from "./sourcing-automation"
import { SourcingPerformanceTab } from "./sourcing-performance"

export function AdminSourcingInventory() {
  return (
    <AdminShell title="Sourcing · Inventory">
      <SourcingInventoryTab />
    </AdminShell>
  )
}

export function AdminSourcingForecast() {
  return (
    <AdminShell title="Sourcing · Forecast">
      <SourcingForecastTab />
    </AdminShell>
  )
}

export function AdminSourcingPricing() {
  return (
    <AdminShell title="Sourcing · Pricing">
      <SourcingPricingTab />
    </AdminShell>
  )
}

export function AdminSourcingAutomation() {
  return (
    <AdminShell title="Sourcing · Automation">
      <SourcingAutomationTab />
    </AdminShell>
  )
}

export function AdminSourcingPerformance() {
  return (
    <AdminShell title="Sourcing · Performance">
      <SourcingPerformanceTab />
    </AdminShell>
  )
}
