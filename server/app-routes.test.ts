import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("customer checkout routes", () => {
  it("keeps the Cart URL mapped to the Checkout page", () => {
    const appSource = readFileSync(new URL("../client/src/App.tsx", import.meta.url), "utf8");

    expect(appSource).toContain('<Route path={"/cart"} component={Checkout} />');
    expect(appSource).toContain('<Route path={"/checkout"} component={Checkout} />');
  });
});
