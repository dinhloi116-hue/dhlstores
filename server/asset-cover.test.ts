import { describe, expect, it } from "vitest";
import { getAssetCoverConfig } from "../client/src/lib/asset-cover";

describe("asset-cover mapping", () => {
  it("assigns each key library category a dedicated visual label", () => {
    expect(getAssetCoverConfig(1)).toMatchObject({ code: "TYPE 01", eyebrow: "FONT SYSTEM" });
    expect(getAssetCoverConfig(4)).toMatchObject({ code: "PRINT 04", detail: "PNG · 300 DPI · CMYK" });
    expect(getAssetCoverConfig(10)).toMatchObject({ code: "ALL 10", eyebrow: "BUNDLE VAULT" });
  });

  it("uses a safe generic cover for an unrecognized category", () => {
    expect(getAssetCoverConfig(999)).toMatchObject({ code: "DHL 00", eyebrow: "DIGITAL RESOURCE" });
  });
});
