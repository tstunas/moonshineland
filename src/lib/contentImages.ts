const INLINE_IMAGE_TAG_PATTERN = /<img\b[^>]*>/gi;

export function countInlineImagesInHtml(html: string): number {
  return html.match(INLINE_IMAGE_TAG_PATTERN)?.length ?? 0;
}

export function replaceInlineImagesWithMarker(html: string): {
  html: string;
  hiddenCount: number;
} {
  let hiddenCount = 0;
  const nextHtml = html.replace(INLINE_IMAGE_TAG_PATTERN, () => {
    hiddenCount += 1;
    return '<span class="content-inline-image-placeholder">[이미지 숨김]</span>';
  });

  return { html: nextHtml, hiddenCount };
}
