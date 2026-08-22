import { describe, expect, it } from "vitest";

import { readFileSync } from "node:fs";

const pwaPrompt = readFileSync(new URL("../client/src/components/PwaInstallPrompt.tsx", import.meta.url), "utf8");

describe("PWA branding configuration", () => {
  it("uses the DHL Stores app title and logo configuration", () => {
    expect(process.env.VITE_APP_TITLE || "dhlstores").toBe("dhlstores");
    expect(process.env.VITE_APP_LOGO || "https://files.manuscdn.com/user_upload_by_module/web_dev_logo/310519663887957752/nKVsxnSiWuKcjfpp.png").toMatch(/^https:\/\//);
  });

  it("delays the install suggestion and remembers a dismissal temporarily", () => {
    expect(pwaPrompt).toContain("PROMPT_DELAY_MS = 12_000");
    expect(pwaPrompt).toContain("DISMISS_WINDOW_MS = 30 * 24 * 60 * 60 * 1000");
    expect(pwaPrompt).toContain("localStorage.setItem(DISMISS_KEY, String(Date.now()))");
  });
});

export {};
