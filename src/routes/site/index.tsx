import type { Hono } from "hono";
import type { SiteSettings } from "../../settings/site.js";
import { siteSettings } from "../../server/db/siteSettings.js";
import { sourceProject, sourceProjectDescription } from "../../project.js";
import { absoluteUrl } from "../../server/indexing/urls.js";
import { siteMarketingDescription, type PageSeo } from "../../settings/seo.js";
import { plainPage } from "../../server/render.js";
import type { AppBindings } from "../../server/context.js";
import { SourceProjectPoweredBySentence } from "../../ui/sourceProject.js";
import type { ViewChild } from "../../ui/types.js";

type StaticPage = {
  path: string;
  seo?: (settings: SiteSettings) => PageSeo;
  title: (settings: SiteSettings) => string;
  body: (settings: SiteSettings) => ViewChild;
};

const sourceProjectLicenseUrl = "https://www.gnu.org/licenses/gpl-3.0.html";
const sourceProjectLanguage = "TypeScript";
const sourceProjectRuntime = "Node.js";

const staticPages: readonly StaticPage[] = [
  {
    path: "/about",
    title: (settings) => `About ${settings.identity.name}`,
    body: (settings) => (
      <>
        <p>{settings.home.welcomeText || siteMarketingDescription(settings)}</p>
        <p><SourceProjectPoweredBySentence suffix=", without ads, tracking scripts, analytics pixels, or a personalized feed algorithm." /></p>
        <p>Each site operator is responsible for their own rules, moderation, backups, logs, and local legal requirements.</p>
      </>
    )
  },
  {
    path: "/source",
    seo: sourceProjectSeo,
    title: () => `${sourceProject.name} source code`,
    body: () => (
      <>
        <p><SourceProjectPoweredBySentence /> You can inspect it, change it, and run your own copy.</p>
        <p>Maintainer: <a href={sourceProject.provider.url}>{sourceProject.provider.name}</a>.</p>
        <p>Primary language: {sourceProjectLanguage}. Runtime: {sourceProjectRuntime}.</p>
        <p>The code is released under the <a href={sourceProjectLicenseUrl}>GPL-3.0-only license</a>.</p>
        <p>Repository: <a href={sourceProject.repositoryUrl}>{sourceProject.repositoryUrl}</a></p>
      </>
    )
  },
  {
    path: "/license",
    title: () => "License",
    body: () => (
      <>
        <p>{sourceProject.name} is released under <a href="https://www.gnu.org/licenses/gpl-3.0.html">GPL-3.0-only</a>.</p>
        <p>The license lets people use, study, share, and modify the software, with the conditions described in the project license file.</p>
        <p>Official license text: <a href="https://www.gnu.org/licenses/gpl-3.0.html">gnu.org/licenses/gpl-3.0.html</a></p>
        <p>Source code: <a href={sourceProject.repositoryUrl}>{sourceProject.repositoryUrl}</a></p>
      </>
    )
  },
  {
    path: "/credits",
    title: () => "Credits",
    body: () => (
      <>
        <p>{sourceProject.name} is made by <a href={sourceProject.provider.url}>{sourceProject.provider.name}</a> and contributors.</p>
        <p>The app also depends on open source packages listed in the project source.</p>
        <p>Bundled third-party material is listed in the project notice file.</p>
      </>
    )
  },
  {
    path: "/contact",
    title: () => "Contact",
    body: (settings) => (
      <>
        <p>For support, privacy questions, copyright notices, or security concerns, use the contact information below.</p>
        {contactEmail(settings)}
        <p>
          <strong>{settings.contact.companyName}</strong>
          {mailingAddress(settings)}
        </p>
      </>
    )
  },
  {
    path: "/privacy",
    title: () => "Privacy",
    body: (settings) => (
      <>
        <p>{settings.identity.name} stores the information needed to run a social network: account email, username, password hash, session and CSRF records, profile fields, posts, blogs, comments, groups, messages, shared skins, uploaded file references, reports, moderation records, and timestamps.</p>
        <p>Uploaded profile pictures, post images, and theme songs are stored on disk.</p>
        <p>The default app does not include ads, analytics pixels, tracking scripts, or third-party cookies.</p>
        <p>The app uses cookies for login sessions, form protection, and the optional color theme.</p>
        <p>You can change profile visibility from account settings. Private profiles are visible to the profile owner, friends, and staff. Blog entries have their own privacy setting.</p>
        <p>Custom profile skins can include sanitized third-party HTTPS images, fonts, and embeds chosen by the profile author. Visiting those profiles may contact those third-party services.</p>
        <p>You can export your account data or delete your account from account settings. Server logs, backups, and retained moderation records depend on the site operator.</p>
        {settings.contact.email ? <p>Questions: <a href={`mailto:${settings.contact.email}`}>{settings.contact.email}</a></p> : null}
      </>
    )
  },
  {
    path: "/terms",
    title: () => "Terms",
    body: (settings) => (
      <>
        <p>By using {settings.identity.name}, you agree to these terms, the <a href="/privacy">Privacy</a> page, and the <a href="/rules">Rules</a>.</p>
        <p>You must be at least 13 years old to create an account. Use your own account and do not try to break, overload, or abuse the site.</p>
        <p>You are responsible for what you post, upload, message, share, and add to custom profile skins. Do not post content you do not have the right to use.</p>
        <p>You keep ownership of your content. You allow {settings.identity.name} to store, display, and process it as needed to run the site.</p>
        <p>Staff may remove content, limit features, or suspend accounts that break these terms, the rules, or the security of the service.</p>
        {dmcaNotice(settings)}
        <p>{settings.identity.name} is provided as-is, without warranties. To the fullest extent allowed by law, {settings.contact.companyName} is not liable for indirect, incidental, special, consequential, or punitive damages from use of the site.</p>
      </>
    )
  },
  {
    path: "/help",
    title: () => "Help",
    body: () => (
      <>
        <p>Use edit profile to change your name, picture, theme song, bio, interests, social links, and skin HTML. Your public profile address is set during signup.</p>
        <p>Wall posts and group posts support one image, props, comments, and comment replies. Blog entries support categories, privacy, pinning, props, comments, and comment replies.</p>
        <p>Skins are shared from the skins page and can be previewed before applying them to your profile.</p>
      </>
    )
  },
  {
    path: "/rules",
    title: () => "Rules",
    body: () => (
      <>
        <p>Be decent to other people and do not use the site to make their lives harder.</p>
        <p>Do not harass people, threaten people, spam, impersonate others, evade moderation, or post illegal content.</p>
        <p>Do not post malware, phishing links, stolen private information, sexual exploitation, or content that targets minors.</p>
        <p>Do not use profile skins, embeds, uploads, or links to attack visitors, hide malicious content, or break the site.</p>
        <p>Staff may remove content, restrict features, or suspend accounts when needed to keep the site usable.</p>
      </>
    )
  }
];

export function registerSiteRoutes(app: Hono<AppBindings>) {
  for (const page of staticPages) {
    app.get(page.path, (c) => {
      const settings = siteSettings();
      return plainPage(c, page.title(settings), page.body(settings), 200, page.seo?.(settings));
    });
  }
}

function sourceProjectSeo(): PageSeo {
  const sourcePageUrl = absoluteUrl("/source");
  return {
    description: `${sourceProject.name} source code, license, repository, maintainer, language, and runtime.`,
    jsonLd: {
      "@context": "https://schema.org",
      "@id": `${sourcePageUrl}#source-code`,
      "@type": "SoftwareSourceCode",
      name: sourceProject.name,
      description: sourceProjectDescription,
      url: sourceProject.repositoryUrl,
      mainEntityOfPage: sourcePageUrl,
      codeRepository: sourceProject.repositoryUrl,
      codeSampleType: "full application",
      programmingLanguage: sourceProjectLanguage,
      runtimePlatform: sourceProjectRuntime,
      license: sourceProjectLicenseUrl,
      isAccessibleForFree: true,
      creator: {
        "@type": "Organization",
        name: sourceProject.provider.name,
        url: sourceProject.provider.url
      },
      publisher: {
        "@type": "Organization",
        name: sourceProject.provider.name,
        url: sourceProject.provider.url
      }
    }
  };
}

function contactEmail(settings: SiteSettings) {
  return settings.contact.email
    ? <p><a href={`mailto:${settings.contact.email}`}>{settings.contact.email}</a></p>
    : <p>No contact email has been configured yet.</p>;
}

function mailingAddress(settings: SiteSettings) {
  const lines = settings.contact.mailingAddress.split("\n").map((line) => line.trim()).filter(Boolean);
  return lines.length ? (
    <>
      <br />
      {lines.map((line) => (
        <>
          {line}
          <br />
        </>
      ))}
    </>
  ) : null;
}

function dmcaNotice(settings: SiteSettings) {
  return settings.contact.email ? (
    <p>DMCA notices can be sent to <a href={`mailto:${settings.contact.email}`}>{settings.contact.email}</a>. Include the copyrighted work, the allegedly infringing URL or material, your contact information, a good-faith statement, a statement that the notice is accurate under penalty of perjury, and your physical or electronic signature. Repeat infringers may have content removed or accounts terminated.</p>
  ) : (
    <p>Copyright notices can be sent through the contact information on the Contact page. Repeat infringers may have content removed or accounts terminated.</p>
  );
}
