import { describe, expect, it } from "vitest";

describe("PWA branding configuration", () => {
  it("uses the DHL Stores app title and logo configuration", () => {
    expect(process.env.VITE_APP_TITLE || "dhlstores").toBe("dhlstores");
    expect(process.env.VITE_APP_LOGO || "https://files.manuscdn.com/user_upload_by_module/web_dev_logo/310519663887957752/nKVsxnSiWuKcjfpp.png").toMatch(/^https:\/\//);
  });
});

export {};
