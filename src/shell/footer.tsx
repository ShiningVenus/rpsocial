import { sourceProject } from "../project.js";
import type { SiteContactSettings } from "../settings/site.js";
import { Icon, type IconName } from "../ui/icons.js";
import type { DataAttributes } from "../ui/types.js";

const footerSocialLinks: readonly { href: string; icon: IconName; label: string }[] = [
  { href: "https://www.reddit.com/r/bliish/", icon: "reddit", label: "Reddit" },
  { href: "https://github.com/bliish-com", icon: "github", label: "GitHub" }
];

export function Footer({ contact, dataAttributes }: { contact: SiteContactSettings; dataAttributes?: DataAttributes }) {
  const copyrightYears = copyrightYearLabel(sourceProject.creationYear);

  return (
    <footer class="site-footer" {...dataAttributes}>
      <p>
        Powered by <a href={sourceProject.websiteUrl}>{sourceProject.name}</a>.
      </p>
      <nav class="site-footer__social" aria-label="Social links">
        <ul>
          {footerSocialLinks.map((link) => (
            <li>
              <a href={link.href} target="_blank" rel="me noopener noreferrer" aria-label={link.label} title={link.label}>
                <Icon name={link.icon} />
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <ul class="site-footer__links link-list">
        <li>
          <a href="/about">About</a>
        </li>
        <li>
          <a href="/rules">Rules</a>
        </li>
        <li>
          <a href="/terms">Terms</a>
        </li>
        <li>
          <a href="/privacy">Privacy</a>
        </li>
        <li>
          <a href="/source">Source code</a>
        </li>
        <li>
          <a href="/credits">Credits</a>
        </li>
        <li>
          <a href="/contact">Contact</a>
        </li>
        <li>
          <a href="/license">License</a>
        </li>
      </ul>
      <p class="copyright">
        &copy;{copyrightYears} {contact.companyName}.
      </p>
    </footer>
  );
}

function copyrightYearLabel(creationYear: number) {
  const currentYear = new Date().getFullYear();
  return currentYear > creationYear ? `${creationYear}-${currentYear}` : `${creationYear}`;
}
