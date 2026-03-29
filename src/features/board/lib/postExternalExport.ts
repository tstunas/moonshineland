import { AnonymousAuthor } from "@/lib/constants";
import type { Post } from "@/types/post";

function formatPostDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  const weekday = new Intl.DateTimeFormat("ko-KR", { weekday: "short" }).format(
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

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    if (!paragraph) {
      lines.push("");
      continue;
    }

    let current = "";
    for (const char of paragraph) {
      const test = `${current}${char}`;
      if (context.measureText(test).width <= maxWidth) {
        current = test;
        continue;
      }

      if (current) {
        lines.push(current);
      }
      current = char;
    }

    if (current) {
      lines.push(current);
    }
  }

  return lines;
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
      const escapedContent = escapeHtml(post.content).replaceAll("\n", "<br />");
      const escapedDate = escapeHtml(formatPostDate(post.createdAt));
      return `<article style="border:1px solid #bae6fd;border-radius:10px;overflow:hidden;margin:0 0 12px 0;font-family:'Noto Sans KR',sans-serif;"><header style="background:#e2e8f0;padding:10px 14px;border-bottom:1px solid #bae6fd;"><div><strong>#${post.postOrder}</strong> ${post.author || AnonymousAuthor} (${post.idcode})</div><div style="margin-top:4px;font-size:12px;color:#475569;">작성일: ${escapedDate}</div></header><div style="padding:14px;line-height:1.5;white-space:normal;">${escapedContent}</div></article>`;
    })
    .join("");

  return `<section style="max-width:760px;padding:12px;background:#f8fafc;color:#0f172a;"><h2 style="margin:0 0 10px 0;">${escapedTitle}</h2>${items}</section>`;
}

export async function copyExternalHtmlToClipboard(
  threadTitle: string,
  posts: Post[],
): Promise<void> {
  const html = buildExternalHtml(threadTitle, posts);
  const text = buildExternalText(posts);

  if (typeof ClipboardItem !== "undefined") {
    const item = new ClipboardItem({
      "text/html": new Blob([html], { type: "text/html" }),
      "text/plain": new Blob([text], { type: "text/plain" }),
    });
    await navigator.clipboard.write([item]);
    return;
  }

  await navigator.clipboard.writeText(text);
}

interface CopyExternalImageParams {
  boardKey: string;
  threadIndex: number;
  threadTitle: string;
  posts: Post[];
}

export async function copyExternalImage(
  params: CopyExternalImageParams,
): Promise<"clipboard" | "download"> {
  const { boardKey, threadIndex, threadTitle, posts } = params;
  const canvas = document.createElement("canvas");
  const outerPadding = 36;
  const width = 1200;
  const cardSpacing = 18;
  const titleAreaHeight = 96;
  const cardHeaderHeight = 50;
  const cardPaddingX = 22;
  const cardPaddingY = 18;
  const bodyLineHeight = 27;
  canvas.width = width;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("NO_CONTEXT");
  }

  context.font = "500 22px sans-serif";
  const measured = posts.map((post) => {
    const cardInnerWidth = width - outerPadding * 2 - cardPaddingX * 2;
    const wrapped = wrapText(context, post.content, cardInnerWidth);
    const bodyHeight = Math.max(bodyLineHeight, wrapped.length * bodyLineHeight);
    const cardHeight = cardHeaderHeight + cardPaddingY * 2 + bodyHeight;
    return {
      post,
      dateText: formatPostDate(post.createdAt),
      wrapped,
      cardHeight,
    };
  });

  const cardsHeight = measured.reduce(
    (sum, item) => sum + item.cardHeight + cardSpacing,
    0,
  );
  const height = Math.max(300, titleAreaHeight + outerPadding * 2 + cardsHeight);
  canvas.height = height;

  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#f8fafc");
  gradient.addColorStop(1, "#e0f2fe");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.fillStyle = "#0f172a";
  context.font = "700 42px sans-serif";
  context.fillText(threadTitle, outerPadding, outerPadding + 44);

  context.font = "500 20px sans-serif";
  context.fillStyle = "#0c4a6e";
  context.fillText(
    `게시판 ${boardKey} / 스레드 ${threadIndex}`,
    outerPadding,
    outerPadding + 76,
  );

  let y = outerPadding + titleAreaHeight;
  for (const item of measured) {
    const x = outerPadding;
    const w = width - outerPadding * 2;
    const h = item.cardHeight;

    context.fillStyle = "#ffffff";
    context.strokeStyle = "#7dd3fc";
    context.lineWidth = 2;
    context.beginPath();
    context.roundRect(x, y, w, h, 16);
    context.fill();
    context.stroke();

    context.fillStyle = "#e2e8f0";
    context.beginPath();
    context.roundRect(x + 2, y + 2, w - 4, cardHeaderHeight, 12);
    context.fill();

    context.fillStyle = "#0c4a6e";
    context.font = "700 24px sans-serif";
    context.fillText(
      `#${item.post.postOrder} ${item.post.author || AnonymousAuthor} (${item.post.idcode})`,
      x + cardPaddingX,
      y + 35,
    );

    context.fillStyle = "#475569";
    context.font = "500 16px sans-serif";
    context.fillText(`작성일: ${item.dateText}`, x + cardPaddingX, y + 55);

    context.fillStyle = "#0f172a";
    context.font = "500 22px sans-serif";
    let lineY = y + cardHeaderHeight + cardPaddingY + 26;
    for (const line of item.wrapped) {
      context.fillText(line, x + cardPaddingX, lineY);
      lineY += bodyLineHeight;
    }

    y += h + cardSpacing;
  }

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
