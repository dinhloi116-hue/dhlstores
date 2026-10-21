import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const indexHtml = readFileSync(new URL("../client/index.html", import.meta.url), "utf8");

describe("runtime DOM safety", () => {
  it("prevents browser auto-translation from mutating the React root", () => {
    expect(indexHtml).toContain('<html lang="en" translate="no" class="notranslate">');
    expect(indexHtml).toContain('<meta name="google" content="notranslate" />');
    expect(indexHtml).toContain('<body class="notranslate">');
  });
});
