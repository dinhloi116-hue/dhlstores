import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../client/src/App.tsx", import.meta.url), "utf8");
const library = readFileSync(new URL("../client/src/pages/ToolsLibrary.tsx", import.meta.url), "utf8");
const tool = readFileSync(new URL("../client/src/pages/VideoCutterJoiner.tsx", import.meta.url), "utf8");

describe("video cutter and joiner", () => {
  it("is registered in the DHL Stores tools library", () => {
    expect(app).toContain("/tools/video-cutter");
    expect(app).toContain("VideoCutterJoiner");
    expect(library).toContain("CẮT & NỐI VIDEO");
    expect(library).toContain("/tools/video-cutter");
  });

  it("keeps video processing local with trim, concat, conversion and download", () => {
    expect(tool).toContain("@ffmpeg/ffmpeg");
    expect(tool).toContain("MAX_FILES = 8");
    expect(tool).toContain("-ss");
    expect(tool).toContain("concat.txt");
    expect(tool).toContain("download={outputName}");
    expect(tool).toContain("aria-label=\"Thời điểm bắt đầu\"");
    expect(tool).toContain("aria-label=\"Thời điểm kết thúc\"");
    expect(tool).toContain("compression");
    expect(tool).toContain("libx264");
    expect(tool).toContain("Đang nén video");
    expect(tool).toContain("Chuyển đổi tương thích");
    expect(tool).toContain("không áp dụng giới hạn dung lượng cố định");
  });
});
