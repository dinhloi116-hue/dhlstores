import { describe, expect, it } from "vitest";
import { buildPhysicalVietQrUrl, buildSePayQrUrlFromConfig } from "./sepay";

describe("SePay VietQR", () => {
  it("creates a VietinBank QR with exact amount and SEVQR order memo", () => {
    const url = buildSePayQrUrlFromConfig({
      bankCode: "VietinBank",
      accountNumber: "106866983322",
      accountHolder: "NGUYEN THI QUYNH",
    }, "DHLTEST2026", 30000);

    expect(url).not.toBeNull();
    const parsed = new URL(url!);
    expect(parsed.searchParams.get("bank")).toBe("VietinBank");
    expect(parsed.searchParams.get("amount")).toBe("30000");
    expect(parsed.searchParams.get("des")).toBe("SEVQR DHLTEST2026");
    expect(parsed.searchParams.get("template")).toBe("compact");
  });

  it("does not create a QR when mandatory bank configuration is missing", () => {
    expect(buildSePayQrUrlFromConfig({ bankCode: "", accountNumber: "123", accountHolder: "A" }, "DHL1", 10000)).toBeNull();
  });

  it("creates a separate VietQR image URL for physical orders with the required transfer memo", () => {
    const url = buildPhysicalVietQrUrl({ bankCode: "MB", accountNumber: "0123456789", accountHolder: "NGUYEN VAN A" }, "DHLPHY2026", 32000);
    expect(url).toContain("https://img.vietqr.io/image/MB-0123456789-compact2.png");
    const parsed = new URL(url!);
    expect(parsed.searchParams.get("amount")).toBe("32000");
    expect(parsed.searchParams.get("addInfo")).toBe("SEVQR DHLPHY2026");
    expect(parsed.searchParams.get("accountName")).toBe("NGUYEN VAN A");
    expect(buildPhysicalVietQrUrl({ bankCode: "MB", accountNumber: "", accountHolder: "NGUYEN VAN A" }, "DHLPHY2026", 32000)).toBeNull();
  });
});
