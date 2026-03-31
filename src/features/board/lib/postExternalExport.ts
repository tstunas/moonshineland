import { AnonymousAuthor } from "@/lib/constants";
import type { Post } from "@/types/post";
import html2canvas from "html2canvas";

function formatPostDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  const weekday = new Intl.DateTimeFormat("ko-KR", { weekday: "short", timeZone: "Asia/Seoul" }).format(
    date,
  );
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} (${weekday}) ${hours}:${minutes}:${seconds}`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeRawToDisplayHtml(rawContent: string): string {
  // Always escape first, then convert line breaks to HTML.
  const escaped = escapeHtml(rawContent);
  return escaped
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .replaceAll("\n", "<br />");
}

function normalizeRawLineBreaks(rawContent: string): string {
  return rawContent.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
}

function buildExternalPostBody(post: Post): string {
  const rawContent = post.rawContent || "";

  if (post.contentType === "aa") {
    const escapedAa = escapeHtml(normalizeRawLineBreaks(rawContent));
    return `<pre class="external-post-content external-post-content--aa">${escapedAa || " "}</pre>`;
  }

  const htmlWithBreaks = escapeRawToDisplayHtml(rawContent);

  return `<div class="external-post-content external-post-content--${post.contentType}">${htmlWithBreaks || "&nbsp;"}</div>`;
}

export function buildExternalText(posts: Post[]): string {
  return posts
    .map((post) => {
      const lines = [
        `#${post.postOrder} ${post.author || AnonymousAuthor} (${post.idcode})`,
        `작성일: ${formatPostDate(post.createdAt)}`,
        post.content,
      ];
      return lines.join("\n");
    })
    .join("\n\n");
}

export function buildExternalHtml(threadTitle: string, posts: Post[]): string {
  const escapedTitle = escapeHtml(threadTitle);
  const items = posts
    .map((post) => {
      const escapedAuthor = escapeHtml(post.author || AnonymousAuthor);
      const escapedIdcode = escapeHtml(post.idcode || "");
      const escapedDate = escapeHtml(formatPostDate(post.createdAt));
      const bodyHtml = buildExternalPostBody(post);
      return `<article style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin:0 0 10px 0;background:#ffffff;font-family:'Noto Sans KR',sans-serif;"><header style="background:#f8fafc;padding:9px 12px;border-bottom:1px solid #e2e8f0;"><h3 style="margin:0;font-size:15px;line-height:1.35;color:#0f172a;"><strong>#${post.postOrder}</strong> ${escapedAuthor} <small style="font-size:12px;color:#64748b;">(${escapedIdcode})</small></h3><time style="display:block;margin-top:3px;font-size:12px;color:#64748b;">작성일: ${escapedDate}</time></header><div style="padding:12px;">${bodyHtml}</div></article>`;
    })
    .join("");

  return `<!doctype html><html lang="ko"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>${escapedTitle}</title><style>@font-face{font-family:'Saitamaar';src:url('https://da1eth.github.io/AA/HeadKasen.woff2') format('woff2'),url('https://da1eth.github.io/AA/HeadKasen.ttf') format('truetype');font-display:swap;}.external-post-content{margin:0;color:#0f172a;word-break:break-word;overflow-wrap:anywhere;}.external-post-content--text{line-height:1.7;white-space:normal;}.external-post-content--line{line-height:1.55;white-space:pre-wrap;}.external-post-content--novel{line-height:1.9;white-space:pre-wrap;font-family:'Saitamaar','Noto Sans KR',sans-serif;}.external-post-content--aa{margin:0 !important;padding:0 !important;line-height:1.125em !important;font-size:15px;white-space:pre;font-family:'Saitamaar',ui-monospace,'Nanum Gothic Coding',monospace;letter-spacing:normal;overflow:auto;}</style></head><body style="margin:0;padding:16px;background:#f8fafc;"><main style="max-width:760px;margin:0 auto;padding:10px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;color:#0f172a;"><header style="margin:0 0 10px 0;"><h2 style="margin:0;font-size:20px;line-height:1.35;color:#0f172a;">${escapedTitle}</h2><p style="margin:4px 0 0 0;font-size:12px;color:#64748b;">MoonshineLand 외부 게시용 HTML</p></header><section>${items}</section></main></body></html>`;
}

function copyHtmlWithLegacyClipboard(html: string, text: string): boolean {
  const onCopy = (event: ClipboardEvent) => {
    if (!event.clipboardData) {
      return;
    }

    event.preventDefault();
    event.clipboardData.setData("text/html", html);
    event.clipboardData.setData("text/plain", text);
  };

  document.addEventListener("copy", onCopy);
  try {
    return document.execCommand("copy");
  } finally {
    document.removeEventListener("copy", onCopy);
  }
}

export async function copyExternalHtmlToClipboard(
  threadTitle: string,
  posts: Post[],
): Promise<void> {
  const html = buildExternalHtml(threadTitle, posts);
  const fallbackText = html;

  if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
    try {
      const item = new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([fallbackText], { type: "text/plain" }),
      });
      await navigator.clipboard.write([item]);
      return;
    } catch {
      // 일부 브라우저/환경에서는 ClipboardItem이 있어도 text/html write가 실패한다.
    }
  }

  if (copyHtmlWithLegacyClipboard(html, fallbackText)) {
    return;
  }

  await navigator.clipboard.writeText(fallbackText);
}

interface CopyExternalImageParams {
  boardKey: string;
  threadIndex: number;
  threadTitle: string;
  posts: Post[];
}

const EXTERNAL_IMAGE_WIDTH = 2800;

function normalizeHtmlForSvg(value: string): string {
  const container = document.createElement("div");
  container.innerHTML = value;

  return container.innerHTML
    .replaceAll("&nbsp;", "&#160;")
    .replaceAll("&ensp;", "&#8194;")
    .replaceAll("&emsp;", "&#8195;");
}

function buildExternalImageMarkup(
  params: CopyExternalImageParams,
  origin: string,
): string {
  const { boardKey, threadIndex, threadTitle, posts } = params;
  const escapedTitle = escapeHtml(threadTitle);
  const escapedBoardKey = escapeHtml(boardKey);

  const cards = posts
    .map((post) => {
      const escapedAuthor = escapeHtml(post.author || AnonymousAuthor);
      const escapedIdcode = escapeHtml(post.idcode || "");
      const escapedDate = escapeHtml(formatPostDate(post.createdAt));
      const contentHtml = normalizeHtmlForSvg(post.content);

      const baseContentStyle = "display:block;word-break:break-word;overflow-wrap:anywhere;letter-spacing:normal;margin-top:0;font-size:27px;color:#0f172a;font-family:ExportSans,ExportMono,monospace;";
      const contentTypeStyle = post.contentType === "aa"
        ? "white-space:nowrap;overflow-x:auto;line-height:1.125em;background-color:#fff;padding-bottom:24px;box-sizing:border-box;"
        : post.contentType === "novel"
          ? "white-space:pre-wrap;background-color:#f3f4f6;line-height:1.8em;font-size:29.7px;font-family:ExportMono,Dotum,sans-serif;"
          : post.contentType === "line"
            ? "white-space:pre-wrap;line-height:1.5em;"
            : "white-space:pre-wrap;line-height:1.45;";

      return `
<article style="border:3px solid #cbd5e1;border-radius:20px;overflow:hidden;background:#ffffff;margin:0 0 22px 0;box-shadow:0 2px 10px rgba(15, 23, 42, 0.08);">
  <header style="background:#e5e7eb;padding:18px 26px;border-bottom:2px solid #cbd5e1;min-height:96px;box-sizing:border-box;">
    <div style="font-size:32px;font-weight:700;color:#1e293b;line-height:1.2;">#${post.postOrder} ${escapedAuthor} (${escapedIdcode})</div>
    <div style="margin-top:8px;font-size:20px;color:#475569;">작성일: ${escapedDate}</div>
  </header>
  <div style="padding:20px 30px 28px 30px;min-height:140px;box-sizing:border-box;">
    <div class="export-content export-content--${post.contentType}" style="${baseContentStyle}${contentTypeStyle}">${contentHtml}</div>
  </div>
</article>`;
    })
    .join("");

  return `
<div xmlns="http://www.w3.org/1999/xhtml" class="external-export-root" style="width:${EXTERNAL_IMAGE_WIDTH}px;box-sizing:border-box;padding:36px;background:linear-gradient(135deg,#f3f4f6 0%,#e5e7eb 100%);color:#0f172a;font-family:'ExportSans','ExportMono','Noto Sans KR',sans-serif;">
  <style>
    @font-face {
      font-family: "ExportMono";
      src: url("${origin}/font/NanumGothicCoding.woff2") format("woff2"),
           url("${origin}/font/NanumGothicCoding.woff") format("woff"),
           url("${origin}/font/NanumGothicCoding.ttf") format("truetype");
      font-display: swap;
    }
    @font-face {
      font-family: "ExportSans";
      src: url("${origin}/font/Saitamaar.woff2") format("woff2"),
           url("${origin}/font/Saitamaar.woff") format("woff"),
           url("${origin}/font/Saitamaar.ttf") format("truetype");
      font-display: swap;
    }
    .external-export-root .export-content {
      display: block;
      word-break: break-word;
      overflow-wrap: anywhere;
      letter-spacing: normal;
      margin-top: 2px;
      font-family: ExportSans, ExportMono, monospace;
      white-space: pre-wrap;
      background: transparent;
    }
    .external-export-root .export-content--aa {
      background-color: #fff;
      white-space: nowrap;
      overflow-x: visible;
      line-height: 1.2em;
      padding-bottom: 24px;
      box-sizing: border-box;
      font-family: ExportSans, ExportMono, monospace;
    }
    .external-export-root .export-content--novel {
      background-color: #f3f4f6;
      line-height: 1.8em;
      font-size: 1.1em;
      font-family: ExportMono, Dotum, sans-serif;
    }
    .external-export-root .export-content--line {
      line-height: 1.5em;
    }
    .external-export-root .export-content .vib-1 {
      display: inline-block;
      transform: skewX(-15deg);
    }
    .external-export-root .export-content .beat-1 {
      display: inline-block;
      transform: scale(1);
    }
    .external-export-root .export-content .sub {
      vertical-align: bottom;
      font-size: 50%;
      line-height: inherit;
    }
    .external-export-root .export-content .youtube {
      position: relative;
      padding-bottom: 56.25%;
      padding-top: 25px;
      height: 0;
      overflow: hidden;
    }
    .external-export-root .export-content .youtube iframe {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border: 0;
    }
    .external-export-root .export-content .youtube-wrap {
      width: 100%;
      max-width: 600px;
    }
    .external-export-root .export-content .dice {
      color: #dc2626;
      font-weight: 700;
    }
    .external-export-root .export-content .dice:hover {
      color: #2563eb;
    }
    .external-export-root .export-content b {
      font-weight: 700;
    }
    .external-export-root .export-content .inner-line {
      line-height: 1.5em !important;
    }
    .external-export-root .export-content .aa {
      background-color: #fff;
      white-space: nowrap;
      overflow-x: auto;
      overflow-y: hidden;
      margin-left: 0;
      line-height: 1.1em;
    }
  </style>
  <h2 style="margin:0;font-size:56px;line-height:1.2;font-weight:700;">${escapedTitle}</h2>
  <p style="margin:8px 0 20px 0;font-size:28px;font-weight:500;color:#334155;">게시판 ${escapedBoardKey} / 스레드 ${threadIndex}</p>
  ${cards}
</div>`;
}

function createExternalImageNode(
  params: CopyExternalImageParams,
  origin: string,
): HTMLDivElement {
  const wrapper = document.createElement("div");
  wrapper.style.position = "fixed";
  wrapper.style.left = "-99999px";
  wrapper.style.top = "0";
  wrapper.style.width = `${EXTERNAL_IMAGE_WIDTH}px`;
  wrapper.style.pointerEvents = "none";
  wrapper.style.zIndex = "-1";
  wrapper.innerHTML = buildExternalImageMarkup(params, origin);
  return wrapper;
}

async function loadExportFonts(origin: string): Promise<void> {
  if (!document.fonts.check('400 16px "ExportMono"')) {
    const mono = new FontFace(
      "ExportMono",
      `url(${origin}/font/NanumGothicCoding.woff2) format("woff2"), url(${origin}/font/NanumGothicCoding.woff) format("woff"), url(${origin}/font/NanumGothicCoding.ttf) format("truetype")`,
      { display: "swap" },
    );
    document.fonts.add(await mono.load());
  }

  if (!document.fonts.check('400 16px "ExportSans"')) {
    const sans = new FontFace(
      "ExportSans",
      `url(${origin}/font/Saitamaar.woff2) format("woff2"), url(${origin}/font/Saitamaar.woff) format("woff"), url(${origin}/font/Saitamaar.ttf) format("truetype")`,
      { display: "swap" },
    );
    document.fonts.add(await sans.load());
  }

  await Promise.all([
    document.fonts.load('400 16px "ExportMono"'),
    document.fonts.load('400 16px "ExportSans"'),
  ]);
  await document.fonts.ready;
}

function createExportStyleTag(): HTMLStyleElement {
  const style = document.createElement("style");
  style.id = "__external-export-styles__";
  style.textContent = `
    .external-export-root .export-content .dice { color: #dc2626 !important; font-weight: 700 !important; }
    .external-export-root .export-content b { font-weight: 700 !important; }
    .external-export-root .export-content .sub { vertical-align: bottom !important; font-size: 50% !important; line-height: inherit !important; }
    .external-export-root .export-content .inner-line { line-height: 1.5em !important; }
    .external-export-root .export-content .aa { background-color: #fff !important; white-space: nowrap !important; overflow-x: auto !important; overflow-y: hidden !important; margin-left: 0 !important; line-height: 1.1em !important; }
    .external-export-root .export-content .vib-1 { display: inline-block; transform: skewX(-15deg); }
    .external-export-root .export-content .beat-1 { display: inline-block; transform: scale(1); }
    .external-export-root .export-content .youtube { position: relative; padding-bottom: 56.25%; padding-top: 25px; height: 0; overflow: hidden; }
    .external-export-root .export-content .youtube iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; }
    .external-export-root .export-content .youtube-wrap { width: 100%; max-width: 600px; }
  `;
  return style;
}

export async function copyExternalImage(
  params: CopyExternalImageParams,
): Promise<"clipboard" | "download"> {
  const { boardKey, threadIndex, threadTitle, posts } = params;
  const origin = window.location.origin;
  await loadExportFonts(origin);

  const node = createExternalImageNode(
    {
      boardKey,
      threadIndex,
      threadTitle,
      posts,
    },
    origin,
  );
  const styleTag = createExportStyleTag();
  document.head.appendChild(styleTag);
  document.body.appendChild(node);

  let canvas: HTMLCanvasElement;
  try {
    canvas = await html2canvas(node, {
      backgroundColor: null,
      scale: 1,
      useCORS: true,
      logging: false,
    });
  } catch {
    node.remove();
    styleTag.remove();
    throw new Error("HTML2CANVAS_FAIL");
  }
  node.remove();
  styleTag.remove();

  const blob: Blob | null = await new Promise((resolve) => {
    canvas.toBlob(resolve, "image/png");
  });

  if (!blob) {
    throw new Error("BLOB_FAIL");
  }

  if (typeof ClipboardItem !== "undefined") {
    const item = new ClipboardItem({ "image/png": blob });
    await navigator.clipboard.write([item]);
    return "clipboard";
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${boardKey}-${threadIndex}-posts.png`;
  anchor.click();
  URL.revokeObjectURL(url);
  return "download";
}
