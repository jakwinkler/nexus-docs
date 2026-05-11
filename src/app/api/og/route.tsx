import { ImageResponse } from "next/og";
import { type NextRequest } from "next/server";
import { getDocBySlug } from "@/lib/content";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const slug = searchParams.get("slug") || "";

  let title = "nexus Docs";
  let summary = "Magento 2 Extension Documentation & Partner Portal";
  let product = "";
  let tags: string[] = [];

  if (slug) {
    const doc = await getDocBySlug(slug.split("/"));
    if (doc) {
      title = doc.title;
      summary = doc.summary;
      product = doc.product;
      tags = doc.tags?.slice(0, 4) || [];
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px 80px",
          backgroundColor: "#fff7ed",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Top: logo + product badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              fontSize: "28px",
              fontWeight: 700,
              color: "#ea580c",
            }}
          >
            nexus
          </div>
          <div
            style={{
              fontSize: "16px",
              color: "#9a3412",
              opacity: 0.6,
            }}
          >
            docs
          </div>
          {product && product !== "platform" && (
            <div
              style={{
                marginLeft: "auto",
                padding: "6px 16px",
                borderRadius: "8px",
                backgroundColor: "#fed7aa",
                color: "#9a3412",
                fontSize: "14px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {product.replace(/-/g, " ")}
            </div>
          )}
        </div>

        {/* Middle: title + summary */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            flex: 1,
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: title.length > 40 ? "42px" : "52px",
              fontWeight: 700,
              color: "#1c1917",
              lineHeight: 1.2,
              maxWidth: "900px",
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: "22px",
              color: "#78716c",
              lineHeight: 1.4,
              maxWidth: "800px",
            }}
          >
            {summary.length > 120 ? summary.slice(0, 120) + "..." : summary}
          </div>
        </div>

        {/* Bottom: tags + URL */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <div style={{ display: "flex", gap: "8px" }}>
            {tags.map((tag) => (
              <div
                key={tag}
                style={{
                  padding: "4px 12px",
                  borderRadius: "6px",
                  backgroundColor: "#ffedd5",
                  color: "#c2410c",
                  fontSize: "13px",
                  fontWeight: 500,
                }}
              >
                {tag}
              </div>
            ))}
          </div>
          <div style={{ fontSize: "14px", color: "#a8a29e" }}>
            docs.example.com
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
