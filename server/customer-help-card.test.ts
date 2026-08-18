import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("CustomerHelpCard internal chat entry point", () => {
  it("opens the internal CustomerContactHub instead of an external chat link", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/components/CustomerHelpCard.tsx"), "utf8");
    expect(source).toContain('dhlstores-open-chat');
    expect(source).toContain('Nhắn cửa hàng');
    expect(source).not.toContain('zalo.me');
  });

  it("CustomerContactHub listens for the internal chat event", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/components/CustomerContactHub.tsx"), "utf8");
    expect(source).toContain('window.addEventListener("dhlstores-open-chat"');
    expect(source).toContain('setChatOpen(true)');
  });
});
