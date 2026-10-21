import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Sapo Sync Preview UI", () => {
  it("exposes only owner-controlled inbound mutations", () => {
    const routerSource = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
    expect(routerSource).toContain("sapoInboundPull: ownerProcedure");
    expect(routerSource).toContain("sapoInboundApply: ownerProcedure");
    expect(routerSource).not.toContain("sapoSyncPreview");
    expect(routerSource).not.toContain("sapoSyncRun");
  });

  it("renders Sapo-to-web selection and per-row results without outbound controls", () => {
    const source = readFileSync(new URL("../client/src/pages/OperationsCenter.tsx", import.meta.url), "utf8");
    expect(source).toContain("Sapo Sync Preview");
    expect(source).toContain("sapoLocationId");
    expect(source).toContain("sapoSelectedRows");
    expect(source).toContain("sapoInboundPull.useMutation");
    expect(source).toContain("sapoInboundApply.useMutation");
    expect(source).toContain("Sapo → DHL Stores");
    expect(source).not.toContain("Đồng bộ sang Sapo");
    expect(source).toContain("Kết quả gần nhất");
  });
});
