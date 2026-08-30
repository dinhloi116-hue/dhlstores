import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("checkout authentication UX", () => {
  it("offers direct Google sign-in before sending unauthenticated customers home", () => {
    const checkout = readFileSync(new URL("../client/src/pages/Checkout.tsx", import.meta.url), "utf8");
    expect(checkout).toContain("dhlstores-open-customer-auth");
    expect(checkout).toContain("Continue with Google");
    expect(checkout).toContain("Tiếp tục với Google");
  });

  it("routes the checkout auth event through the existing Manus OAuth entry point", () => {
    const layout = readFileSync(new URL("../client/src/components/StoreLayout.tsx", import.meta.url), "utf8");
    expect(layout).toContain("window.addEventListener(\"dhlstores-open-customer-auth\", handleOpenCustomerAuth)");
    expect(layout).toContain("const handleOpenCustomerAuth = () => startLogin();");
  });
});
