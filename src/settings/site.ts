import { brandIconShapeSvg, brandIconSvg } from "../brand.js";
import { colorPaletteTokens, defaultColorPalette, mixColor, type ColorPalette } from "../theme/colorPalette.js";

export type SiteIdentitySettings = {
  name: string;
  tagline: string;
  headerIconName: string;
  headerIconSvg: string;
};

export type SiteHomeSettings = {
  announcement: string;
  welcomeText: string;
};

export type SiteContactSettings = {
  email: string;
  companyName: string;
  mailingAddress: string;
};

export type SiteSettings = {
  identity: SiteIdentitySettings;
  home: SiteHomeSettings;
  contact: SiteContactSettings;
  updatedAt: string | null;
};

export const defaultHeaderIconName = "brand";

export const defaultHeaderIconSvg = brandIconSvg;

export const defaultSiteSettings = {
  identity: {
    name: "bliish.space",
    tagline: "a space for anyone",
    headerIconName: defaultHeaderIconName,
    headerIconSvg: defaultHeaderIconSvg
  },
  home: {
    announcement: "[url=https://bliish.space]Bliish.space[/url] is an open-source project by [url=https://bliish.com]Bliish.com[/url], built for small, customizable, self-hosted social communities.",
    welcomeText: "Bliish.space is an ultra-fast, lightweight, open-source social platform with customizable profiles, no ads, no tracking, and simple, affordable self-hosting."
  },
  contact: {
    email: "hi@bliish.com",
    companyName: "Bliish LLC",
    mailingAddress: ""
  },
  updatedAt: null
} satisfies SiteSettings;

const defaultFaviconSvg = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" aria-hidden="true">',
  `<circle cx="12" cy="12" r="11" fill="${mixColor(defaultColorPalette.chrome, "#000000", 0.28)}" />`,
  `<g fill="${defaultColorPalette.chromeText}">`,
  brandIconShapeSvg,
  "</g>",
  "</svg>"
].join("");
const faviconIconSize = 18;
const faviconIconOffset = (24 - faviconIconSize) / 2;
const faviconStrokeWidth = 3.4;
const appIconSize = 1024;
const appIconGlyphSize = 768;
const appIconGlyphOffset = (appIconSize - appIconGlyphSize) / 2;

export function siteFaviconSvg(settings: SiteSettings, palette: ColorPalette = defaultColorPalette) {
  if (settings.identity.headerIconName === defaultHeaderIconName && isDefaultPalette(palette)) return defaultFaviconSvg;
  const background = mixColor(palette.chrome, "#000000", 0.28);
  const iconColor = palette.chromeText;
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" aria-hidden="true">',
    `<circle cx="12" cy="12" r="11" fill="${background}" />`,
    `<g color="${iconColor}" fill="${iconColor}" stroke="${iconColor}">`,
    faviconIconSvg(settings.identity.headerIconSvg),
    "</g>",
    "</svg>"
  ].join("");
}

export function siteAppIconSvg(settings: SiteSettings, palette: ColorPalette = defaultColorPalette) {
  const background = mixColor(palette.chrome, "#000000", 0.28);
  const iconColor = palette.chromeText;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${appIconSize}" height="${appIconSize}" viewBox="0 0 ${appIconSize} ${appIconSize}" aria-hidden="true">`,
    `<rect width="${appIconSize}" height="${appIconSize}" fill="${background}" />`,
    `<g color="${iconColor}" fill="${iconColor}" stroke="${iconColor}">`,
    identityIconSvg(settings.identity.headerIconSvg, appIconGlyphOffset, appIconGlyphOffset, appIconGlyphSize, appIconGlyphSize),
    "</g>",
    "</svg>"
  ].join("");
}

function faviconIconSvg(svg: string) {
  const sizedSvg = identityIconSvg(svg, faviconIconOffset, faviconIconOffset, faviconIconSize, faviconIconSize);
  return sizedSvg.includes("stroke-width=")
    ? sizedSvg.replace(/\sstroke-width="[^"]*"/i, ` stroke-width="${faviconStrokeWidth}"`)
    : sizedSvg;
}

function identityIconSvg(svg: string, x: number, y: number, width: number, height: number) {
  return svg
    .replace(/\swidth="[^"]*"/i, "")
    .replace(/\sheight="[^"]*"/i, "")
    .replace("<svg", `<svg x="${x}" y="${y}" width="${width}" height="${height}"`);
}

function isDefaultPalette(palette: ColorPalette) {
  return colorPaletteTokens.every((token) => palette[token] === defaultColorPalette[token]);
}
