/**
 * Postgres-backed QA & Logistics admin API (/api/v2/admin/qa/*, /admin/logistics/*).
 */
import { nestFetch } from "./api-nest"
import type {
  QaConfigDto,
  QaDispatchCheckDto,
  QaInventoryDto,
  LogisticsBatchDto,
  LogisticsColdCheckDto,
  LogisticsConfigDto,
  LogisticsDeliveryDto,
  LogisticsExceptionDto,
  LogisticsRiderDto,
  LogisticsZoneDto,
} from "./qa-logistics-types"

export type {
  QaConfigDto,
  QaDispatchCheckDto,
  QaInventoryDto,
  LogisticsBatchDto,
  LogisticsColdCheckDto,
  LogisticsConfigDto,
  LogisticsDeliveryDto,
  LogisticsExceptionDto,
  LogisticsRiderDto,
  LogisticsZoneDto,
}

export const apiAdminQa = {
  listInventory: () => nestFetch<QaInventoryDto[]>("/admin/qa/inventory"),
  replaceInventory: (items: QaInventoryDto[]) =>
    nestFetch<QaInventoryDto[]>("/admin/qa/inventory", {
      method: "PUT",
      body: JSON.stringify(items),
    }),
  listDispatchChecks: () => nestFetch<QaDispatchCheckDto[]>("/admin/qa/dispatch-checks"),
  replaceDispatchChecks: (items: QaDispatchCheckDto[]) =>
    nestFetch<QaDispatchCheckDto[]>("/admin/qa/dispatch-checks", {
      method: "PUT",
      body: JSON.stringify(items),
    }),
  getConfig: () => nestFetch<QaConfigDto>("/admin/qa/config"),
  patchConfig: (patch: Partial<QaConfigDto>) =>
    nestFetch<QaConfigDto>("/admin/qa/config", {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
}

export const apiAdminLogistics = {
  listZones: () => nestFetch<LogisticsZoneDto[]>("/admin/logistics/zones"),
  replaceZones: (items: LogisticsZoneDto[]) =>
    nestFetch<LogisticsZoneDto[]>("/admin/logistics/zones", {
      method: "PUT",
      body: JSON.stringify(items),
    }),
  listRiders: () => nestFetch<LogisticsRiderDto[]>("/admin/logistics/riders"),
  replaceRiders: (items: LogisticsRiderDto[]) =>
    nestFetch<LogisticsRiderDto[]>("/admin/logistics/riders", {
      method: "PUT",
      body: JSON.stringify(items),
    }),
  listBatches: () => nestFetch<LogisticsBatchDto[]>("/admin/logistics/batches"),
  replaceBatches: (items: LogisticsBatchDto[]) =>
    nestFetch<LogisticsBatchDto[]>("/admin/logistics/batches", {
      method: "PUT",
      body: JSON.stringify(items),
    }),
  listDeliveries: () => nestFetch<LogisticsDeliveryDto[]>("/admin/logistics/deliveries"),
  replaceDeliveries: (items: LogisticsDeliveryDto[]) =>
    nestFetch<LogisticsDeliveryDto[]>("/admin/logistics/deliveries", {
      method: "PUT",
      body: JSON.stringify(items),
    }),
  listColdChecks: () => nestFetch<LogisticsColdCheckDto[]>("/admin/logistics/cold-chain-checks"),
  replaceColdChecks: (items: LogisticsColdCheckDto[]) =>
    nestFetch<LogisticsColdCheckDto[]>("/admin/logistics/cold-chain-checks", {
      method: "PUT",
      body: JSON.stringify(items),
    }),
  listExceptions: () => nestFetch<LogisticsExceptionDto[]>("/admin/logistics/exceptions"),
  replaceExceptions: (items: LogisticsExceptionDto[]) =>
    nestFetch<LogisticsExceptionDto[]>("/admin/logistics/exceptions", {
      method: "PUT",
      body: JSON.stringify(items),
    }),
  getConfig: () => nestFetch<LogisticsConfigDto>("/admin/logistics/config"),
  patchConfig: (patch: Partial<LogisticsConfigDto>) =>
    nestFetch<LogisticsConfigDto>("/admin/logistics/config", {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
}
