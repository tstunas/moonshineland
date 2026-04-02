import { randomUUID } from "crypto";
import path from "path";

import { getCurrentUser } from "@/features/auth/queries";
import { uploadImageToS3 } from "@/lib/s3";
import prisma from "@/lib/prisma";
import type { ContentType } from "@/types/post";

export const LINE_BREAK_REGEX = /(\n|\r\n)/g;
export const LINE_BREAK_TAG = "<br/>";

export const URL_REGEX =
  /(http(s)?):\/\/(www\.)?[a-zA-Z0-9@:%._+~#=]{1,256}\.[a-z]{1,6}\b([-a-zA-Z0-9@:%_+.~#?&/=;]*)/g;
export const URL_TAG = '<a href="$&" target="_blank" rel="noopener noreferrer">$&</a>';

export const ANCHOR_REGEX =
  /(?:([a-z]{0,}))?&gt;(\d{0,})?&gt;(?:(\d{1,})(?:-(\d{1,}))?)?/gm;

export const BASE_DICE_REGEX =
  /\.dice (0|-?[1-9][0-9]*) (0|-?[1-9][0-9]*)\.(?! = )/g;
export const TRPG_DICE_REGEX =
  /[【[]([1-9][0-9]*)d([1-9][0-9]*)([+-][1-9][0-9]*)?[】\]](?!: )/gi;
export const CHOICE_DICE_REGEX =
  /[【[]([1-9][0-9]*)([co])([1-9][0-9]*)[】\]](?!: )/gi;

export const SPOILER_REGEX = /&lt;spo&gt;(.*?)&lt;\/spo&gt;/g;
export const SPOILER_TAG = '<span style="color: rgba(0,0,0,0);">$1</span>';

export const SUBTEXT_REGEX = /&lt;sub&gt;(.*?)&lt;\/sub&gt;/g;
export const SUBTEXT_REGEX2 = /&lt;ruby(?: (.*))&gt;&lt;\/ruby&gt;/g;
export const SUBTEXT_TAG = '<span class="sub">$1</span>';

export const DEL_REGEX = /&lt;del&gt;(.*?)&lt;\/del&gt;/g;
export const DEL_TAG = '<span style="text-decoration:line-through">$1</span>';

export const BOLD_REGEX = /&lt;b&gt;(.*?)&lt;\/b&gt;/g;
export const BOLD_TAG = '<span style="font-weight:bold;">$1</span>';

export const UNDERLINE_REGEX = /&lt;u&gt;(.*?)&lt;\/u&gt;/g;
export const UNDERLINE_TAG =
  '<span style="text-decoration:underline;">$1</span>';

export const CONTENT_AA_REGEX = /^\.aa(.*)$/;
export const CONTENT_AA_TAG = '<div class="aa">$1</div>';

export const BREAK_UNICODE_REGEX = /&#x([0-9A-Fa-f]+);|&#([0-9]+);/g;

export const RUBY_REGEX = /&lt;ruby(?: (.+?))?&gt;(.*?)&lt;\/ruby&gt;/g;
export const RUBY_TAG = '<ruby>$2<rt>$1</rt></ruby>';

export const COLOR_REGEX =
  /&lt;clr ([#A-Za-z0-9]+)(?: ([#A-Za-z0-9]+))?&gt;(.*?)&lt;\/clr&gt;/g;

export const VIB_REGEX = /&lt;vib&gt;(.*?)&lt;\/vib&gt;/g;
export const VIB_TAG = '<span class="vib-1">$1</span>';

export const BEAT_REGEX = /&lt;beat&gt;(.*?)&lt;\/beat&gt;/g;
export const BEAT_TAG = '<span class="beat-1">$1</span>';

export const SPACE_REGEX = /([ ]{2,})/g;

export const LINE_REGEX = /&lt;line&gt;(.*?)&lt;\/line&gt;/g;
export const LINE_TAG = '<div class="inner-line">$1</div>';

const LEADING_UNICODE_SPACES_REGEX =
  /(^|\n)([\u0009\u0020\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]+)/g;
const INLINE_IMAGE_TOKEN_ESCAPED = "&lt;image&gt;";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildInlineImageTag(imageUrl: string, order: number): string {
  const escapedUrl = escapeHtml(imageUrl);
  const altText = escapeHtml(`inline-image-${String(order)}`);

  return `<a href="${escapedUrl}" target="_blank" rel="noopener noreferrer"><img src="${escapedUrl}" alt="${altText}" class="content-inline-image" loading="lazy" decoding="async"/></a>`;
}

function randomInt(min: number, max: number): number {
  const floorMin = Math.ceil(min);
  const floorMax = Math.floor(max);

  if (floorMin > floorMax) {
    return floorMin;
  }

  return Math.floor(Math.random() * (floorMax - floorMin + 1)) + floorMin;
}

function sum(values: number[]): number {
  return values.reduce((acc, value) => acc + value, 0);
}

function baseDiceReplacer(match: string, strMin: string, strMax: string): string {
  const min = Number(strMin);
  const max = Number(strMax);
  return `<span class="dice">${match} = ${String(randomInt(min, max))}</span>`;
}

function trpgDiceReplacer(
  _match: string,
  strFrequency: string,
  strDiceNumber: string,
  strCorrection: string,
): string {
  const frequency = Number(strFrequency);
  const diceNumber = Number(strDiceNumber);
  const correction = strCorrection ? Number(strCorrection) : 0;

  const dice: number[] = [];
  for (let i = 0; i < frequency; i += 1) {
    const roll = randomInt(1, diceNumber);
    dice.push(roll);
  }
  const diceSum = sum(dice) + correction;
  let innerText = "";
  if (correction) {
    innerText = `【${strFrequency}D${strDiceNumber}${strCorrection}】 : ${String(diceSum)} ( [${dice.join(
      " + ",
    )}] ${correction > 0 ? "+" : "-"} ${String(Math.abs(correction))})`;
  } else {
    innerText = `【${strFrequency}D${strDiceNumber}】: ${String(diceSum)}`;
    if (dice.length > 1) {
      innerText += ` ( ${dice.join(" + ")} )`;
    }
  }
  return `<b>${innerText}</b>`;
}

function choiceDiceReplacer(
  match: string,
  strBaseNumber: string,
  operator: "c" | "C" | "o" | "O",
  strChoiceNumber: string,
): string {
  const baseNumber = Number(strBaseNumber);
  const choiceNumber = Number(strChoiceNumber);

  if (choiceNumber > baseNumber || baseNumber > 1000 || choiceNumber > 50) {
    return match;
  }
  const dice: number[] = [];
  for (let i = 0; i < choiceNumber; i += 1) {
    const roll = randomInt(1, baseNumber);
    if (dice.find((value) => value === roll)) {
      i -= 1;
    } else {
      dice.push(roll);
    }
  }
  if (["O", "o"].includes(operator)) {
    dice.sort((a, b) => a - b);
  }
  return `<b>【${strBaseNumber}${operator.toUpperCase()}${strChoiceNumber}】: ${dice.join(
    ", ",
  )}</b>`;
}

function anchorReplacer(currentBoardKey: string, currentThreadIndex = 0) {
  return (
    match: string,
    strBoardKey = "",
    strThreadIndex = "",
    start = "",
    end = "",
  ) => {
    if (!strBoardKey && !strThreadIndex && !start && !end) {
      return match;
    }

    const boardKey = strBoardKey || currentBoardKey;
    const threadIndex = Number(strThreadIndex || currentThreadIndex || 0);
    if (!threadIndex && !start) {
      return match;
    }

    const pathParts = ["/board", boardKey];
    if (threadIndex) {
      pathParts.push(String(threadIndex));
    }
    if (start) {
      pathParts.push(start);
    }
    if (end) {
      pathParts.push(end);
    }

    const link = pathParts.join("/").replace(/\/+$/, "");
    return `<a href="${link}">${match}</a>`;
  };
}

function colorTextReplacer(
  _match: string,
  color: string,
  shadow: string,
  innerText: string,
): string {
  let style = `color: ${color};`;
  if (shadow) {
    style += ` text-shadow: 0px 0px 6px ${shadow};`;
  }
  return `<span style="${style}">${innerText}</span>`;
}

function spaceTextReplacer(_match: string, space: string): string {
  return "&nbsp;".repeat(space.length);
}

export function generateRawContent(
  input: string,
  options?: {
    autoFixBreakAA?: boolean;
    autoAA?: boolean;
    isLineText?: boolean;
    savedAutoAA?: string;
  },
): string {
  let rawContent = input;

  if (options?.autoFixBreakAA) {
    rawContent = rawContent.replace(
      /&#x([0-9A-Fa-f]+);|&#([0-9]+);/g,
      (_: unknown, hex: string, dec: string) => {
        const code = hex ? parseInt(hex, 16) : parseInt(dec, 10);
        return String.fromCharCode(code);
      },
    );
  }

  if (options?.autoAA && options.isLineText) {
    rawContent = `<line>${rawContent}</line>`;
  }

  if (options?.autoAA && options.savedAutoAA) {
    rawContent = `${options.savedAutoAA}\n\n${rawContent}`;
  }

  return rawContent;
}

export function generateHtmlContent(
  rawContent: string,
  options?: {
    off?: boolean;
    location?: { boardKey: string; threadIndex?: number };
  },
): string {
  if (!rawContent) {
    return "";
  }

  let htmlContent = escapeHtml(rawContent)
    .replace(LINE_BREAK_REGEX, LINE_BREAK_TAG)
    .replace(URL_REGEX, URL_TAG)
    .replace(SPACE_REGEX, spaceTextReplacer)
    .replace(LEADING_UNICODE_SPACES_REGEX, (_match, prefix: string, spaces: string) => {
      const encoded = Array.from(spaces)
        .map((char) => `&#${char.codePointAt(0)};`)
        .join("");

      return `${prefix}${encoded}`;
    });

  if (options?.off) {
    return htmlContent;
  }

  htmlContent = htmlContent
    .replace(DEL_REGEX, DEL_TAG)
    .replace(BOLD_REGEX, BOLD_TAG)
    .replace(UNDERLINE_REGEX, UNDERLINE_TAG)
    .replace(SUBTEXT_REGEX, SUBTEXT_TAG)
    .replace(SUBTEXT_REGEX2, SUBTEXT_TAG)
    .replace(RUBY_REGEX, RUBY_TAG)
    .replace(CONTENT_AA_REGEX, CONTENT_AA_TAG)
    .replace(VIB_REGEX, VIB_TAG)
    .replace(BEAT_REGEX, BEAT_TAG)
    .replace(LINE_REGEX, LINE_TAG)
    .replace(BASE_DICE_REGEX, baseDiceReplacer)
    .replace(TRPG_DICE_REGEX, trpgDiceReplacer)
    .replace(CHOICE_DICE_REGEX, choiceDiceReplacer)
    .replace(SPOILER_REGEX, SPOILER_TAG)
    .replace(COLOR_REGEX, colorTextReplacer);

  if (options?.location) {
    const { boardKey, threadIndex } = options.location;
    htmlContent = htmlContent.replace(
      ANCHOR_REGEX,
      anchorReplacer(boardKey, threadIndex ?? 0),
    );
  }

  return htmlContent;
}

export function applyInlineImagePlaceholders(
  htmlContent: string,
  imageUrls: string[],
): { htmlContent: string; isInlineImage: boolean } {
  const hasInlineImageToken = htmlContent.includes(INLINE_IMAGE_TOKEN_ESCAPED);
  if (!hasInlineImageToken) {
    return { htmlContent, isInlineImage: false };
  }

  if (imageUrls.length === 0) {
    return { htmlContent, isInlineImage: true };
  }

  let imageIndex = 0;
  const replaced = htmlContent.replaceAll(INLINE_IMAGE_TOKEN_ESCAPED, () => {
    const imageUrl = imageUrls[imageIndex];
    if (!imageUrl) {
      return INLINE_IMAGE_TOKEN_ESCAPED;
    }

    imageIndex += 1;
    return buildInlineImageTag(imageUrl, imageIndex);
  });

  return { htmlContent: replaced, isInlineImage: true };
}

export function parseBooleanFormValue(value: FormDataEntryValue | null): boolean {
  if (typeof value !== "string") {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "on";
}

export async function resolveThreadManageContext(
  boardKey: string,
  threadIndex: number,
) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.id) {
    return { error: "로그인 후 사용할 수 있습니다." } as const;
  }

  const userId = Number(currentUser.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return { error: "유효하지 않은 사용자 정보입니다." } as const;
  }

  const [thread, user] = await Promise.all([
    prisma.thread.findFirst({
      where: {
        threadIndex,
        board: {
          boardKey,
        },
      },
      select: {
        id: true,
        userId: true,
        postLimit: true,
        title: true,
        isHidden: true,
        isSecret: true,
        isPrivate: true,
      },
    }),
    prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        isAdmin: true,
      },
    }),
  ]);

  if (!thread) {
    return { error: "존재하지 않는 스레드입니다." } as const;
  }

  const canManage = Boolean(user?.isAdmin) || thread.userId === userId;
  if (!canManage) {
    return { error: "스레드 관리 권한이 없습니다." } as const;
  }

  return {
    userId,
    thread,
    isAdmin: Boolean(user?.isAdmin),
  } as const;
}

export function parseContentType(command: string): ContentType | null {
  const normalized = command.trim().toLowerCase();
  const splitted = normalized.split('.');
  if (splitted.includes("aa")) return "aa";
  if (splitted.includes("novel")) return "novel";
  if (splitted.includes("line")) return "line";

  return 'text';
}

export async function uploadImages(
  files: File[],
  boardKey: string,
  threadIndex: number,
): Promise<string[]> {
  const urls: string[] = [];

  for (const file of files) {
    if (!file || file.size <= 0) continue;

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const ext = path.extname(safeName) || ".bin";
    const fileName = `${Date.now()}-${randomUUID()}${ext}`;
    const destPath = `boards/${boardKey}/${String(threadIndex)}/${fileName}`;

    const url = await uploadImageToS3(file, destPath);
    urls.push(url);
  }

  return urls;
}

export function buildPostImagesCreateData(imageUrls: string[]) {
  if (imageUrls.length === 0) {
    return undefined;
  }

  return {
    create: imageUrls.map((imageUrl, index) => ({
      imageUrl,
      sortOrder: index + 1,
    })),
  };
}
