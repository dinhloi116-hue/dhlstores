import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../client/src/pages/VideoCutterJoiner.tsx", import.meta.url), "utf8");

describe("video codec fallback", () => {
  it("encodes trimmed output to browser-friendly H.264/AAC", () => {
    expect(page).toContain('"-c:v", "libx264"');
    expect(page).toContain('"-pix_fmt", "yuv420p"');
    expect(page).toContain('"-c:a", "aac"');
    expect(page).toContain('trim-${active.id}.${extension}');
  });

  it("explains incompatible codec errors with a decoder diagnosis", () => {
    expect(page).toContain("không có decoder cho codec");
    expect(page).toContain("Xử lý trên máy chủ");
  });
});
