import { describe, expect, it } from "vitest";
import { checkSapoProductReadConnection, getSapoConfiguration } from "./sapo";

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

  it("không lộ khóa API khi Sapo từ chối xác thực", async () => {
    const result = await checkSapoProductReadConnection(validEnvironment, async () => new Response("forbidden", { status: 403 }));
    expect(result).toMatchObject({ configured: true, connected: false, status: 403, message: "Sapo từ chối xác thực hoặc quyền đọc sản phẩm." });
    expect(JSON.stringify(result)).not.toContain("test-key");
    expect(JSON.stringify(result)).not.toContain("test-secret");
  });
});
