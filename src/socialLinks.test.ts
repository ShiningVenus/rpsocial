import { describe, expect, it } from "vitest";
import { defaultSocialLinks, normalizeSocialLinks, normalizeStoredSocialLinks, SocialLinkValidationError } from "./socialLinks.js";

describe("social link validation", () => {
  it("rejects unsafe Bliish links", () => {
    for (const link of [
      "mailto:owner@example.test",
      "https://user:pass@example.com/profile",
      "https://example.com:8443/profile",
      "javascript:alert(1)"
    ]) {
      expect(() => normalizeSocialLinks({ bliish: link })).toThrow(SocialLinkValidationError);
    }
  });

  it("drops invalid stored links instead of rendering them", () => {
    expect(normalizeStoredSocialLinks({ bliish: "javascript:alert(1)" })).toEqual(defaultSocialLinks);
  });
});
