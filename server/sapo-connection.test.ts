import { describe, expect, it } from "vitest";

function getSapoApiBaseUrl() {
  const configuredDomain = process.env.SAPO_STORE_DOMAIN?.trim();
  if (!configuredDomain) {
    throw new Error("Thiếu SAPO_STORE_DOMAIN.");
  }

  const normalizedDomain = configuredDomain
    .replace(/^https?:\/\//i, "")
    .replace(/\/.+$/, "");

  if (!/^[a-z0-9.-]+$/i.test(normalizedDomain)) {
    throw new Error("SAPO_STORE_DOMAIN không hợp lệ.");
  }

  return `https://${normalizedDomain}`;
}

describe("Sapo private app connection", () => {
  const liveIt = process.env.RUN_SAPO_LIVE_TEST === "1" ? it : it.skip;

  liveIt("xác thực được quyền chỉ đọc sản phẩm qua Admin API", async () => {
    const apiKey = process.env.SAPO_API_KEY?.trim();
    const apiSecret = process.env.SAPO_API_SECRET?.trim();

    expect(apiKey, "Thiếu SAPO_API_KEY.").toBeTruthy();
    expect(apiSecret, "Thiếu SAPO_API_SECRET.").toBeTruthy();

    const authorization = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
    const response = await fetch(`${getSapoApiBaseUrl()}/admin/products.json?limit=1`, {
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${authorization}`,
      },
    });

    const responseText = await response.text();
    expect(response.status, `Sapo Admin API trả về ${response.status}: ${responseText.slice(0, 500)}`).toBe(200);

    const data = JSON.parse(responseText) as { products?: unknown[] };
    expect(Array.isArray(data.products)).toBe(true);
  }, 20_000);
});
