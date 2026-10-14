import { describe, expect, it } from "vitest";
import { parseYouTubeUrl } from "../client/src/lib/youtube";

describe("parseYouTubeUrl", () => {
  it("normalizes YouTube Shorts links for the embedded player", () => {
    const result = parseYouTubeUrl("https://youtube.com/shorts/906QkLxSYbU?feature=share");
    expect(result).toMatchObject({
      id: "906QkLxSYbU",
      embedUrl: "https://www.youtube.com/embed/906QkLxSYbU?rel=0&modestbranding=1&playsinline=1",
      watchUrl: "https://www.youtube.com/watch?v=906QkLxSYbU",
      thumbnailUrl: "https://i.ytimg.com/vi/906QkLxSYbU/hqdefault.jpg",
    });
  });

  it("accepts watch and short domains but rejects arbitrary URLs", () => {
    expect(parseYouTubeUrl("https://www.youtube.com/watch?v=906QkLxSYbU")?.id).toBe("906QkLxSYbU");
    expect(parseYouTubeUrl("https://youtu.be/906QkLxSYbU")?.id).toBe("906QkLxSYbU");
    expect(parseYouTubeUrl("https://example.com/video/906QkLxSYbU")).toBeNull();
    expect(parseYouTubeUrl("not-a-url")).toBeNull();
  });
});
