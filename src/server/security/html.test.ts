import { describe, expect, it } from "vitest";
import { sanitizeSkinHtml, sanitizeUserText } from "./html.js";

describe("html sanitizers", () => {
  it("keeps user text inert", () => {
    const html = sanitizeUserText('<script>alert(1)</script><a href="javascript:alert(1)">link</a><b>text</b>');

    expect(html).toContain("link");
    expect(html).toContain("text");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("<b>");
  });

  it("strips active code and unsafe links from skin HTML", () => {
    const html = sanitizeSkinHtml(
      [
        '<div><script>alert(1)</script>',
        '<a href="javascript:alert(1)">link</a>',
        '<iframe src="javascript:alert(1)"></iframe>',
        '<img src="imageorglittertexturl"></div>'
      ].join("")
    );

    expect(html).not.toContain("<script");
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("<iframe");
    expect(html).not.toContain("imageorglittertexturl");
  });

  it("limits skin CSS to safe selectors and properties", () => {
    const html = sanitizeSkinHtml(
      [
        "<style>",
        '[data-skin-part="bio"]{color:#fff}',
        'input[value^="a"]{background:url(https://evil.example/leak)}',
        "[data-skin-root]{position:fixed;background:url(javascript:alert(1));color:red}",
        "body{display:none}",
        "</style>"
      ].join("")
    );

    expect(html).toContain('[data-skin-part="bio"]');
    expect(html).not.toContain("value^=");
    expect(html).not.toContain("evil.example");
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("position:fixed");
    expect(html).not.toContain("body");
  });

  it("keeps quoted Google Fonts imports with semicolons in the URL", () => {
    const html = sanitizeSkinHtml(
      [
        "<style>",
        '@import url("https://fonts.googleapis.com/css2?family=Libre+Franklin:ital,wght@0,100;0,600;1,600&display=swap");',
        '[data-skin-page]{background:#007f7e!important}',
        '[data-skin-part="name"]{width:100%}',
        "</style>"
      ].join("")
    );

    expect(html).toContain('@import url("https://fonts.googleapis.com/css2?family=Libre+Franklin:ital,wght@0,100;0,600;1,600&display=swap");');
    expect(html).toContain("[data-skin-page]{background:#007f7e!important;}");
    expect(html).toContain('[data-skin-part="name"]{width:100%;}');
  });

  it("sandboxes only whitelisted media embeds", () => {
    const html = sanitizeSkinHtml(
      [
        '<iframe src="https://www.youtube.com/watch?v=dQw4w9WgXcQ" onload="alert(1)" sandbox="allow-forms"></iframe>',
        '<iframe src="https://evil.example/embed"></iframe>'
      ].join("")
    );

    expect(html).toContain("https://www.youtube-nocookie.com/embed/");
    expect(html).toContain("sandbox=");
    expect(html).toContain('referrerpolicy="strict-origin-when-cross-origin"');
    expect(html).not.toContain("evil.example");
    expect(html).not.toContain("onload");
    expect(html).not.toContain("allow-forms");
  });
});
