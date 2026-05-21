import { raw } from "hono/html";
import { sanitizeSkinHtml } from "../server/security/html.js";
import { trustedHtml } from "../ui/html.js";
import type { DataAttributes } from "../ui/types.js";
import { profileSkinVersion, type ProfileSkinPart } from "./contract.js";

const leadingCssImportPattern = /^@import\s+(?:url\(\s*(?:"[^"]+"|'[^']+'|[^)\s]+)\s*\)|"[^"]+"|'[^']+'|[^;\s]+)[^;]*;\s*/i;

export type ProfileSkin = {
  bodyHtml: string;
  styleHtml: string;
};

export function profileSkinPart(part: ProfileSkinPart): DataAttributes {
  return { "data-skin-part": part };
}

function profileSkinPage(): DataAttributes {
  return { "data-skin-page": "", "data-skin-part": "page", "data-skin-version": profileSkinVersion };
}

export function profileSkinPageAttributes(skin: ProfileSkin): DataAttributes | undefined {
  return skin.styleHtml.trim() ? profileSkinPage() : undefined;
}

export function profileSkinRoot(): DataAttributes {
  return { "data-skin-root": "", "data-skin-version": profileSkinVersion };
}

function splitProfileSkinHtml(html: string): ProfileSkin {
  const styleBlocks: string[] = [];
  const bodyHtml = html
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, (styleBlock) => {
      styleBlocks.push(styleBlock);
      return "";
    })
    .trim();

  return {
    bodyHtml,
    styleHtml: styleBlocks.join("")
  };
}

export function profileSkinFromHtml(html: string): ProfileSkin {
  return splitProfileSkinHtml(sanitizeSkinHtml(html));
}

export function ProfileSkinStyles({ skin }: { skin: ProfileSkin }) {
  return skin.styleHtml ? <>{raw(layerProfileSkinStyleHtml(skin.styleHtml))}</> : null;
}

export function layerProfileSkinStyleHtml(styleHtml: string) {
  return styleHtml.replace(/<style>([\s\S]*?)<\/style>/gi, (_match, css: string) => {
    const { imports, rules } = splitLeadingCssImports(css);
    return `<style>${[imports.join("\n"), rules ? `@layer profile-skin{${rules}}` : ""].filter(Boolean).join("\n")}</style>`;
  });
}

function splitLeadingCssImports(css: string) {
  const imports: string[] = [];
  let rules = css.trim();
  let match = rules.match(leadingCssImportPattern);

  while (match) {
    imports.push(match[0].trim());
    rules = rules.slice(match[0].length).trim();
    match = rules.match(leadingCssImportPattern);
  }

  return { imports, rules };
}

export function ProfileCustomSkin({ skin }: { skin: ProfileSkin }) {
  return skin.bodyHtml ? <div class="profile__custom-skin custom-skin profile-section" {...profileSkinPart("custom-html")} dangerouslySetInnerHTML={trustedHtml(skin.bodyHtml)} /> : null;
}
