import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createMockContext(role: "user" | "admin" = "user"): TrpcContext {
  const user = {
    id: 1,
    openId: "test-user-123",
    email: "test@dhlstores.vn",
    name: "Test User DHL",
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("DHL Stores API Routers", () => {
  it("fetches categories successfully", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const categories = await caller.store.categories();
    expect(categories).toBeDefined();
    expect(categories.length).toBeGreaterThan(0);
    expect(categories[0]?.name).toBeDefined();
  });

  it("fetches products list and filters by type", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const products = await caller.store.products({ type: "physical" });
    expect(products).toBeDefined();
    expect(products.every(p => p.type === "physical")).toBe(true);
  });

  it("fetches single product by slug", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const product = await caller.store.productBySlug({ slug: "ao-dau-clb-hoang-gia-do-2026" });
    expect(product).toBeDefined();
    expect(product?.name).toContain("Hoàng Gia Đỏ");
  });
});
