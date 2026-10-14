export type YouTubeVideo = {
  id: string;
  embedUrl: string;
  watchUrl: string;
  thumbnailUrl: string;
};

export function parseYouTubeUrl(value?: string | null): YouTubeVideo | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    let id = "";
    if (host === "youtu.be") {
      id = url.pathname.split("/").filter(Boolean)[0] || "";
    } else if (host === "youtube.com" || host === "m.youtube.com") {
      if (url.pathname === "/watch") id = url.searchParams.get("v") || "";
      else if (url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/embed/")) id = url.pathname.split("/").filter(Boolean)[1] || "";
    }
    if (!/^[A-Za-z0-9_-]{6,20}$/.test(id)) return null;
    return {
      id,
      embedUrl: `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&playsinline=1`,
      watchUrl: `https://www.youtube.com/watch?v=${id}`,
      thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    };
  } catch {
    return null;
  }
}
