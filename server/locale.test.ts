import { describe, expect, it } from "vitest";
import { clientIpFromHeaders, countryFromHeaders, localeFromCountry } from "./locale";

describe("store locale resolution", () => {
  it("maps Vietnam to Vietnamese and all other countries to English", () => {
    expect(localeFromCountry("VN")).toBe("vi");
    expect(localeFromCountry("us")).toBe("en");
    expect(localeFromCountry(null)).toBe("en");
  });

  it("prefers trusted country headers when the hosting layer supplies them", () => {
    expect(countryFromHeaders({ "cf-ipcountry": "VN" })).toBe("VN");
    expect(countryFromHeaders({ "x-vercel-ip-country": "US" })).toBe("US");
  });

  it("uses a valid forwarded IP only and ignores local addresses", () => {
    expect(clientIpFromHeaders({ "x-forwarded-for": "203.0.113.42, 10.0.0.1" })).toBe("203.0.113.42");
    expect(clientIpFromHeaders({ "x-forwarded-for": "127.0.0.1" })).toBeNull();
    expect(clientIpFromHeaders({ "x-forwarded-for": "not-an-ip" })).toBeNull();
  });
});
