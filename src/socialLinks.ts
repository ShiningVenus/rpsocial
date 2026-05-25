import { limits } from "./policy.js";
import { sourceProject } from "./project.js";
import { recordFromUnknown, stringFromUnknown } from "./values.js";

export type SocialLinkPlatformConfig = {
  id: string;
  label: string;
  icon?: {
    src: string;
  };
  pattern: string;
  placeholder: string;
  exampleHref: string;
  exampleLabel: string;
};

const bliishExampleHref = new URL("/profile/bliish", sourceProject.provider.url).href;
const bliishExampleLabel = bliishExampleHref.replace(/^https?:\/\//, "");

export const socialLinkPlatforms = [
  {
    id: "bliish",
    label: "Bliish",
    icon: {
      src: "/static/icons/bliish.ico"
    },
    pattern: "https?://[^\\s<>]+",
    placeholder: bliishExampleHref,
    exampleHref: bliishExampleHref,
    exampleLabel: bliishExampleLabel
  }
] as const satisfies readonly SocialLinkPlatformConfig[];

type SocialPlatform = (typeof socialLinkPlatforms)[number]["id"];
export type SocialLinks = Record<SocialPlatform, string>;

export const defaultSocialLinks: SocialLinks = {
  bliish: ""
};

export class SocialLinkValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SocialLinkValidationError";
  }
}

export function normalizeSocialLinks(input: Partial<Record<SocialPlatform, string>>) {
  const links = { ...defaultSocialLinks };
  for (const platform of socialLinkPlatforms) {
    links[platform.id] = normalizeSocialLink(platform.id, input[platform.id] ?? "");
  }
  return links;
}

export function normalizeStoredSocialLinks(input: unknown) {
  const record = recordFromUnknown(input);

  const links = { ...defaultSocialLinks };
  for (const platform of socialLinkPlatforms) {
    const value = stringFromUnknown(record[platform.id]);
    try {
      links[platform.id] = normalizeSocialLink(platform.id, value);
    } catch {
      links[platform.id] = "";
    }
  }
  return links;
}

export function hasSocialLinks(links: SocialLinks) {
  return socialLinkPlatforms.some((platform) => Boolean(links[platform.id]));
}

function normalizeSocialLink(platform: SocialPlatform, value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.length > limits.socialLinkUrl) {
    throw new SocialLinkValidationError(`${platformLabel(platform)} link must be ${limits.socialLinkUrl} characters or fewer.`);
  }

  switch (platform) {
    case "bliish":
      return normalizeBliishLink(trimmed);
  }
}

function normalizeBliishLink(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new SocialLinkValidationError("Bliish link must be a full URL.");
  }

  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.port ||
    url.username ||
    url.password
  ) {
    throw new SocialLinkValidationError("Bliish link must use http:// or https:// without embedded credentials.");
  }

  return url.href;
}

function platformLabel(platform: SocialPlatform) {
  return socialLinkPlatforms.find((candidate) => candidate.id === platform)?.label ?? "Social";
}
