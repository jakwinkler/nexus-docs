interface VideoEmbedProps {
  src: string;
  title?: string;
}

/**
 * Convert a video URL to a safe embed URL.
 * Returns null for unsupported providers — caller renders a fallback link.
 */
function toEmbedUrl(src: string): string | null {
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, "");

  // YouTube — use the no-cookie domain
  if (host === "youtube.com" || host === "m.youtube.com") {
    if (url.pathname === "/watch") {
      const v = url.searchParams.get("v");
      if (v && /^[\w-]{6,20}$/.test(v)) return `https://www.youtube-nocookie.com/embed/${v}`;
    }
    if (url.pathname.startsWith("/embed/")) {
      const id = url.pathname.slice(7).split("/")[0];
      if (/^[\w-]{6,20}$/.test(id)) return `https://www.youtube-nocookie.com/embed/${id}`;
    }
  }
  if (host === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0];
    if (/^[\w-]{6,20}$/.test(id)) return `https://www.youtube-nocookie.com/embed/${id}`;
  }
  if (host === "youtube-nocookie.com") {
    if (url.pathname.startsWith("/embed/")) return url.toString();
  }

  // Vimeo
  if (host === "vimeo.com") {
    const id = url.pathname.slice(1).split("/")[0];
    if (/^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
  }
  if (host === "player.vimeo.com" && url.pathname.startsWith("/video/")) {
    return url.toString();
  }

  return null;
}

export function VideoEmbed({ src, title = "Video" }: VideoEmbedProps) {
  const embedUrl = toEmbedUrl(src);

  if (!embedUrl) {
    return (
      <div className="my-6 not-prose rounded-lg border border-[var(--color-border)] p-4 text-sm text-[var(--color-text-muted)]">
        Unsupported video URL. Only YouTube and Vimeo are allowed.
      </div>
    );
  }

  return (
    <div className="my-6 not-prose">
      <div className="relative aspect-video overflow-hidden rounded-lg border border-[var(--color-border)]">
        <iframe
          src={embedUrl}
          title={title}
          sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox"
          referrerPolicy="strict-origin-when-cross-origin"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
          loading="lazy"
        />
      </div>
    </div>
  );
}
