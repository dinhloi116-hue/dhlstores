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

  it("registers the current HTTPS host in the Android App Links manifest", () => {
    const manifest = read("android/app/src/main/AndroidManifest.xml");
    expect(manifest).toContain('android:autoVerify="true"');
    expect(manifest).toContain('android:scheme="https" android:host="cuahangtoit-9a4r8wsz.manus.space"');
  });

  it("publishes a matching debug Digital Asset Links statement", () => {
    const assetLinks = JSON.parse(read("client/public/.well-known/assetlinks.json")) as Array<{
      target: { package_name: string; sha256_cert_fingerprints: string[] };
    }>;
    expect(assetLinks[0]?.target.package_name).toBe("com.dhlstores.app");
    expect(assetLinks[0]?.target.sha256_cert_fingerprints[0]).toBe(
      "6B:DA:B4:EC:AF:3A:15:02:7D:D1:4B:3A:4C:C9:56:7D:C4:D0:AA:DB:AA:15:13:D2:53:59:1F:08:83:78:57:E4"
    );
  });

  it("documents web-first OAuth and avoids an unregistered custom scheme", () => {
    const guide = read("ANDROID_APP_SETUP.md");
    expect(guide).toContain("Manus OAuth");
    expect(guide).toContain("Chưa thêm custom scheme");
    expect(guide).toContain("Không đưa client secret vào app");
  });
});
