import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = new URL("../", import.meta.url);

function read(relativePath: string) {
  return readFileSync(new URL(relativePath, root), "utf8");
}

describe("mobile OAuth configuration", () => {
  it("uses the stable DHL Stores Android identity and HTTPS web origin", () => {
    const config = read("capacitor.config.ts");
    expect(config).toContain("appId: 'com.dhlstores.app'");
    expect(config).toContain("https://cuahangtoit-9a4r8wsz.manus.space");
    expect(config).toContain("cleartext: false");
  });

  it("documents web-first OAuth and avoids an unregistered custom scheme", () => {
    const guide = read("ANDROID_APP_SETUP.md");
    expect(guide).toContain("Manus OAuth");
    expect(guide).toContain("Chưa thêm custom scheme");
    expect(guide).toContain("Không đưa client secret vào app");
  });
});
