import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Sapo Sync Preview UI", () => {
  it("exposes owner-only preview and run mutations with the safe batch contract", () => {
    const routerSource = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
    expect(routerSource).toContain("sapoSyncPreview: ownerProcedure");
    expect(routerSource).toContain("sapoSyncRun: ownerProcedure");
    expect(routerSource).toContain("maxRows: 20");
    expect(routerSource).toContain("dryRun: true");
    expect(routerSource).toContain("dryRun: false");
  });

  it("renders selection, location, preview, explicit sync confirmation, and per-row results", () => {
    const source = readFileSync(new URL("../client/src/pages/OperationsCenter.tsx", import.meta.url), "utf8");
    expect(source).toContain("Sapo Sync Preview");
    expect(source).toContain("sapoLocationId");
    expect(source).toContain("sapoSelectedRows");
    expect(source).toContain("sapoSyncPreview.useMutation");
    expect(source).toContain("sapoSyncRun.useMutation");
    expect(source).toContain("window.confirm(`Ghi tồn");
    expect(source).toContain("Kết quả gần nhất");
    expect(source).toContain("Đồng bộ sang Sapo");
  });
});
