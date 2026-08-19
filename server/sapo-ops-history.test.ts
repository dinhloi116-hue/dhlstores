import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("Sapo operations history", () => {
  it("exposes history and latest-sync procedures", () => {
    const routers = read("server/routers.ts");
    expect(routers).toContain("sapoSyncHistory");
    expect(routers).toContain("sapoLatestSync");
    expect(routers).toContain("recordSapoOutboundEvents");
  });

  it("renders manual sync and history controls in operations center", () => {
    const page = read("client/src/pages/OperationsCenter.tsx");
    expect(page).toContain("Đồng bộ sang Sapo");
    expect(page).toContain("Lịch sử đồng bộ tồn");
    expect(page).toContain("Sapo → web");
    expect(page).toContain("web → Sapo");
  });

  it("shows the latest Sapo sync timestamp on the product inventory UI", () => {
    const page = read("client/src/pages/ProductDetail.tsx");
    expect(page).toContain("sapoLatestSync");
    expect(page).toContain("Đồng bộ Sapo gần nhất");
    expect(page).toContain("Sapo cập nhật gần nhất");
  });

  it("ships a reusable Sapo sync skill with safety rules", () => {
    const skill = readFileSync("/home/ubuntu/skills/sapo-inventory-sync/SKILL.md", "utf8");
    expect(skill).toContain("DHL Stores là nguồn Catalog chính");
    expect(skill).toContain("PUT /admin/inventory_levels/set.json");
    expect(skill).toContain("Heartbeat");
    expect(skill).toContain("idempotence");
  });
});
