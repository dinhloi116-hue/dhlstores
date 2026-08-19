import { beforeEach, describe, expect, it, vi } from "vitest";

const { authenticateRequest, getUserByOpenId, getInventoryBoard, applySapoInboundInventory, pullSapoInventoryBySku } = vi.hoisted(() => ({ authenticateRequest: vi.fn(), getUserByOpenId: vi.fn(), getInventoryBoard: vi.fn(), applySapoInboundInventory: vi.fn(), pullSapoInventoryBySku: vi.fn() }));

vi.mock("./_core/sdk", () => ({ sdk: { authenticateRequest } }));
vi.mock("./_core/env", () => ({ ENV: { ownerOpenId: "owner-open-id" } }));
vi.mock("./db", () => ({ getUserByOpenId, getInventoryBoard, applySapoInboundInventory }));
vi.mock("./sapo", () => ({ pullSapoInventoryBySku }));

import { handleSapoInventoryHeartbeat } from "./sapo-scheduled";

function responseMock() {
  const response = { status: vi.fn(), json: vi.fn() } as any;
  response.status.mockReturnValue(response);
  return response;
}

describe("Sapo inventory Heartbeat", () => {
  beforeEach(() => vi.clearAllMocks());

  it("từ chối request không phải cron", async () => {
    authenticateRequest.mockResolvedValue({ isCron: false });
    const response = responseMock();
    await handleSapoInventoryHeartbeat({ originalUrl: "/api/scheduled/sapo-inventory" } as any, response);
    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ error: "cron-only" }));
  });

  it("kéo tồn SKU vật lý và áp dụng thay đổi idempotent qua helper kho", async () => {
    authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "task-1" });
    getUserByOpenId.mockResolvedValue({ id: 7 });
    getInventoryBoard.mockResolvedValue([{ target: "variant", id: 34, isActive: true, sku: "MESSI", stock: 15 }, { target: "product", id: 4, isActive: true, sku: "", stock: 2 }]);
    pullSapoInventoryBySku.mockResolvedValue([{ localVariantId: 34, sku: "MESSI", available: 15, status: "pulled", message: "ok", sapoAvailable: 20, sapoVariantId: "9", inventoryItemId: "10" }]);
    applySapoInboundInventory.mockResolvedValue({ updated: 1, skipped: 0 });
    const response = responseMock();

    await handleSapoInventoryHeartbeat({ originalUrl: "/api/scheduled/sapo-inventory" } as any, response);

    expect(pullSapoInventoryBySku).toHaveBeenCalledWith([{ localVariantId: 34, sku: "MESSI", available: 15 }], "529110");
    expect(applySapoInboundInventory).toHaveBeenCalledWith({ changes: [{ localVariantId: 34, sku: "MESSI", stock: 20, sapoVariantId: "9", inventoryItemId: "10" }], performedByUserId: 7, reason: "Tự động đồng bộ Sapo/Shopee" });
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ ok: true, taskUid: "task-1", updated: 1 }));
  });
});
