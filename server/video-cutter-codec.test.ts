import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../client/src/pages/VideoCutterJoiner.tsx", import.meta.url), "utf8");

describe("video codec fallback", () => {
  it("encodes trimmed output to browser-friendly H.264/AAC", () => {
    expect(page).toContain('"-c:v", "libx264"');
    expect(page).toContain('"-pix_fmt", "yuv420p"');
    expect(page).toContain('"-c:a", "aac"');
  });

  it("explains incompatible codec errors with a conversion hint", () => {
    expect(page).toContain("codec không tương thích");
    expect(page).toContain("MP4 H.264/AAC");
  });
});

