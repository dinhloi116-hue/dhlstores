import { describe, expect, it } from "vitest";
import { checkSapoProductReadConnection, getSapoConfiguration, setSapoInventoryLevel, syncSapoInventoryBySku } from "./sapo";

const validEnvironment = {
  SAPO_STORE_DOMAIN: "https://dhl-sport.mysapo.net/",
  SAPO_API_KEY: "test-key",
  SAPO_API_SECRET: "test-secret",
};

describe("Sapo client", () => {
  it("chuẩn hóa host và không đưa khóa API vào cấu hình công khai", () => {
    const configuration = getSapoConfiguration(validEnvironment);
    expect(configuration).toMatchObject({ configured: true, host: "dhl-sport.mysapo.net" });
  });

  it("kiểm tra chỉ đọc sản phẩm bằng Basic Auth và chỉ trả về trạng thái an toàn", async () => {
    let requestUrl = "";
    let authorization = "";
    const result = await checkSapoProductReadConnection(validEnvironment, async (url, init) => {
      requestUrl = url;
      authorization = String(init?.headers && (init.headers as Record<string, string>).Authorization);
      return new Response(JSON.stringify({ products: [] }), { status: 200, headers: { "Content-Type": "application/json" } });
    });

    expect(requestUrl).toBe("https://dhl-sport.mysapo.net/admin/products.json?limit=1");
    expect(authorization).toBe(`Basic ${Buffer.from("test-key:test-secret").toString("base64")}`);
    expect(result).toMatchObject({ configured: true, connected: true, catalogAuthority: "dhlstores", inventoryDirection: "dhlstores_to_sapo", inventorySyncEnabled: false, host: "dhl-sport.mysapo.net", status: 200, productCount: 0 });
    expect(result.message).toContain("DHL Stores vẫn là kho chính");
    expect(JSON.stringify(result)).not.toContain("test-secret");
  });

  it("ghi inventory level bằng PUT set endpoint và không lộ khóa", async () => {
    let requestUrl = "";
    let requestInit: RequestInit | undefined;
    const result = await setSapoInventoryLevel({ locationId: "529110", inventoryItemId: "221821063", available: 0 }, validEnvironment, async (url, init) => {
      requestUrl = url;
      requestInit = init;
      return new Response(JSON.stringify({ inventory_level: { id: 170002732, available: 0 } }), { status: 200, headers: { "Content-Type": "application/json" } });
    });

    expect(requestUrl).toBe("https://dhl-sport.mysapo.net/admin/inventory_levels/set.json");
    expect(requestInit?.method).toBe("PUT");
    expect(requestInit?.body).toBe(JSON.stringify({ inventory_level: { location_id: "529110", inventory_item_id: "221821063", available: 0 } }));
    expect(result).toMatchObject({ ok: true, status: 200, inventoryLevelId: "170002732", available: 0 });
    expect(JSON.stringify(result)).not.toContain("test-secret");
  });

  it("trả lỗi an toàn khi Sapo từ chối quyền ghi tồn", async () => {
    const result = await setSapoInventoryLevel({ locationId: "529110", inventoryItemId: "221821063", available: 0 }, validEnvironment, async () => new Response("forbidden", { status: 403 }));
    expect(result).toMatchObject({ ok: false, status: 403, message: "Sapo từ chối quyền ghi tồn kho." });
    expect(JSON.stringify(result)).not.toContain("test-secret");
  });

  it("preview theo SKU không ghi Sapo và giới hạn tối đa 20 dòng", async () => {
    const requests: string[] = [];
    const result = await syncSapoInventoryBySku(Array.from({ length: 25 }, (_, index) => ({ sku: `SKU-${index}`, available: index })), "529110", { dryRun: true, maxRows: 25 }, validEnvironment, async (url) => {
      requests.push(url);
      return new Response(JSON.stringify({ variants: [{ id: 100 + requests.length, inventory_item_id: 200 + requests.length }] }), { status: 200 });
    });
    expect(result.dryRun).toBe(true);
    expect(result.results).toHaveLength(20);
    expect(result.results.every(row => row.status === "preview")).toBe(true);
    expect(requests).toHaveLength(20);
  });

  it("đồng bộ theo SKU gọi đúng inventory endpoint khi preview đã tắt", async () => {
    const requests: Array<{ url: string; method?: string }> = [];
    const result = await syncSapoInventoryBySku([{ sku: "namearg-B-2026-6 nhỏ", available: 0 }], "529110", { dryRun: false }, validEnvironment, async (url, init) => {
      requests.push({ url, method: init?.method });
      if (url.includes("/admin/variants.json")) return new Response(JSON.stringify({ variants: [{ id: 221821065, inventory_item_id: 221821063 }] }), { status: 200 });
      return new Response(JSON.stringify({ inventory_level: { id: 170002732, available: 0 } }), { status: 200 });
    });
    expect(result.results[0]).toMatchObject({ status: "synced", sapoVariantId: "221821065", inventoryItemId: "221821063" });
    expect(requests.map(request => request.method)).toEqual([undefined, "PUT"]);
    expect(requests[1]?.url).toContain("/admin/inventory_levels/set.json");
  });

  it("không lộ khóa API khi Sapo từ chối xác thực", async () => {
    const result = await checkSapoProductReadConnection(validEnvironment, async () => new Response("forbidden", { status: 403 }));
    expect(result).toMatchObject({ configured: true, connected: false, status: 403, message: "Sapo từ chối xác thực hoặc quyền đọc sản phẩm." });
    expect(JSON.stringify(result)).not.toContain("test-key");
    expect(JSON.stringify(result)).not.toContain("test-secret");
  });
});
