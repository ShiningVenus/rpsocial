import { sourceProject, sourceProjectDetailsLabel } from "../../project.js";
import type { SiteSettings } from "../../settings/site.js";
import { sanitizeLinkedText } from "../../server/security/html.js";
import { Panel } from "../../ui/panels.js";
import { SourceProjectPoweredBySentence } from "../../ui/sourceProject.js";
import { UserContent } from "../../ui/userContent.js";

export const landingCards = [
  {
    title: "Open source",
    body: "The code is public, with a license that lets people inspect, change, run, and share it.",
    href: "/source",
    cta: "Inspect the code"
  },
  {
    title: "No tracking or ads",
    body: "No built-in analytics pixels, ad networks, or personalized feed algorithm. Browse people and links directly.",
    href: "/privacy",
    cta: "See privacy details"
  },
  {
    title: "Custom profiles",
    body: "Make your profile feel like your own, with a wall, friends, groups, blogs, messages, theme songs, and playful skins.",
    href: "/skins",
    cta: "Browse skins"
  },
  {
    title: "Small and lightning fast",
    body: "One Node process, SQLite, local uploads, server-rendered pages, and no required third-party runtime services.",
    href: "/source",
    cta: "View the stack"
  },
  {
    title: "Easy to manage",
    body: "Admin accounts can change branding, home copy, moderation, automod, rate limits, users, and email without touching code.",
    href: `${sourceProject.repositoryUrl}/blob/main/docs/self-hosting.md`,
    cta: "Read admin docs"
  },
  {
    title: "Tiny hosting bill",
    body: "A Hetzner CX23 VPS costs about $4.99/month for a 50k-member community, or run it on a server you already own with no new hosting bill.",
    href: "https://www.hetzner.com/cloud/cost-optimized",
    cta: "Check VPS pricing"
  },
  {
    title: "Light by default",
    body: "Simple server-rendered pages stay quick on low-powered phones, slow laptops, and low-data connections, with no required client-side JavaScript.",
    href: "/about",
    cta: "Meet the project"
  },
  {
    title: "Safer communities",
    body: "Automod, reports, user blocks, bans, rate limits, and moderator accounts give communities practical tools to keep things under control.",
    href: "/rules",
    cta: "Review community rules"
  }
];

export function InfoCard(props: { title: string; body: string; href: string; cta: string }) {
  return (
    <div class="info-card">
      <h3>{props.title}</h3>
      <p>{props.body}</p>
      <p class="link">
        &raquo; <a href={props.href}>{props.cta}</a>
      </p>
    </div>
  );
}

export function AnnouncementBox({ settings }: { settings: SiteSettings }) {
  if (!settings.home.announcement) return null;
  return (
    <Panel className="summary-panel" title={`${settings.identity.name} announcements`} tone="soft">
      <UserContent html={sanitizeLinkedText(settings.home.announcement)} />
    </Panel>
  );
}

export function SourceBox() {
  return (
    <div class="source-card">
      <p>
        <SourceProjectPoweredBySentence />
      </p>
      <p>
        <a href="/source" class="more-details">{sourceProjectDetailsLabel}</a>
      </p>
    </div>
  );
}
