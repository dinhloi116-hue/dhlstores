import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const routerSource = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
const pageSource = readFileSync(new URL("../client/src/pages/VideoCutterJoiner.tsx", import.meta.url), "utf8");

describe("local-only video privacy", () => {
  it("does not expose a server-side video upload or transcode procedure", () => {
    expect(routerSource).not.toContain("transcodeServer:");
    expect(routerSource).not.toContain("prepareServerUpload:");
    expect(routerSource).not.toContain("video-tools-input/");
  });

  it("retains browser FFmpeg conversion without a fixed byte-size cap", () => {
    expect(pageSource).toContain('browserProcess("normalize")');
    expect(pageSource).not.toContain("SERVER_TRANSCODE_MAX_BYTES");
    expect(pageSource).not.toContain("Xử lý máy chủ");
  });
});
