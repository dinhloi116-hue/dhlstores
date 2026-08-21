import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const routerSource = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
const pageSource = readFileSync(new URL("../client/src/pages/VideoCutterJoiner.tsx", import.meta.url), "utf8");

describe("server video transcode fallback", () => {
  it("guards processing behind an authenticated procedure and a bounded input size", () => {
    expect(routerSource).toContain("SERVER_VIDEO_MAX_BYTES = 20 * 1024 * 1024");
    expect(routerSource).toContain("prepareServerUpload: protectedProcedure");
    expect(routerSource).toContain("transcodeServer: protectedProcedure");
    expect(routerSource).toContain("serverVideoTranscodeRunning");
  });

  it("uses system ffmpeg and stores MP4 output through managed storage", () => {
    expect(routerSource).toContain('spawn("ffmpeg"');
    expect(routerSource).toContain('"libx264"');
    expect(routerSource).toContain('"aac"');
    expect(routerSource).toContain("storageCreateUploadUrl");
    expect(routerSource).toContain("storageGetSignedUrl");
    expect(routerSource).toContain("storagePut(`video-tools/");
    expect(pageSource).toContain("Xử lý máy chủ (≤20 MB)");
    expect(pageSource).toContain("Đang tải trực tiếp video lên kho tạm");
  });
});
