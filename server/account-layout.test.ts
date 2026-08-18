import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";

const accountPagePath = path.resolve(process.cwd(), "client/src/pages/Account.tsx");

describe("account page layout", () => {
  it("uses a responsive two-column desktop shell without removing key account sections", async () => {
    const source = await readFile(accountPagePath, "utf8");

    expect(source).toContain('grid items-start gap-6 xl:grid-cols-2');
    expect(source).toContain('id="wallet"');
    expect(source).toContain('id="addresses"');
    expect(source).toContain('id="favorites"');
    expect(source).toContain('id="orders"');
  });
});
