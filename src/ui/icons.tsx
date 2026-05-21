import AddIcon from "lucide-static/dist/esm/icons/user-plus.mjs";
import AuditIcon from "lucide-static/dist/esm/icons/scroll-text.mjs";
import BellIcon from "lucide-static/dist/esm/icons/bell.mjs";
import BlogIcon from "lucide-static/dist/esm/icons/book-open-text.mjs";
import CheckIcon from "lucide-static/dist/esm/icons/check.mjs";
import CommentIcon from "lucide-static/dist/esm/icons/message-circle.mjs";
import DatabaseIcon from "lucide-static/dist/esm/icons/database.mjs";
import DeleteIcon from "lucide-static/dist/esm/icons/trash-2.mjs";
import EditIcon from "lucide-static/dist/esm/icons/pencil.mjs";
import EmailIcon from "lucide-static/dist/esm/icons/mail.mjs";
import FavoriteIcon from "lucide-static/dist/esm/icons/star.mjs";
import ForwardIcon from "lucide-static/dist/esm/icons/send.mjs";
import GaugeIcon from "lucide-static/dist/esm/icons/gauge.mjs";
import GroupIcon from "lucide-static/dist/esm/icons/users.mjs";
import LinkIcon from "lucide-static/dist/esm/icons/link.mjs";
import LockIcon from "lucide-static/dist/esm/icons/lock.mjs";
import LockOpenIcon from "lucide-static/dist/esm/icons/lock-open.mjs";
import MessageIcon from "lucide-static/dist/esm/icons/message-square.mjs";
import MoonIcon from "lucide-static/dist/esm/icons/moon.mjs";
import PropIcon from "lucide-static/dist/esm/icons/hand-heart.mjs";
import RefreshIcon from "lucide-static/dist/esm/icons/refresh-cw.mjs";
import ReplyIcon from "lucide-static/dist/esm/icons/reply.mjs";
import ReportIcon from "lucide-static/dist/esm/icons/triangle-alert.mjs";
import SaveIcon from "lucide-static/dist/esm/icons/save.mjs";
import SearchIcon from "lucide-static/dist/esm/icons/search.mjs";
import SettingsIcon from "lucide-static/dist/esm/icons/settings.mjs";
import SunIcon from "lucide-static/dist/esm/icons/sun.mjs";
import UploadIcon from "lucide-static/dist/esm/icons/upload.mjs";
import UserIcon from "lucide-static/dist/esm/icons/user.mjs";
import UserMinusIcon from "lucide-static/dist/esm/icons/user-minus.mjs";
import { brandIconSvg } from "../brand.js";
import { trustedHtml } from "./html.js";

export type IconName = "add" | "audit" | "avatar" | "blog" | "brand" | "check" | "comment" | "database" | "delete" | "edit" | "email" | "favorite" | "forward" | "github" | "group" | "link" | "lock" | "message" | "moon" | "notifications" | "prop" | "rate-limit" | "reddit" | "refresh" | "reply" | "report" | "save" | "search" | "send" | "settings" | "sun" | "unlock" | "upload" | "user" | "user-minus";

const DefaultAvatarIcon = [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
  '<circle cx="12" cy="9.1" r="3.1" fill="currentColor" stroke="none" />',
  '<path d="M6.3 19.9c.9-3.9 3-5.9 5.7-5.9s4.8 2 5.7 5.9c-1.6 1.1-3.5 1.7-5.7 1.7s-4.1-.6-5.7-1.7Z" fill="currentColor" stroke="none" />',
  '<circle cx="12" cy="12" r="10" />',
  "</svg>"
].join("");

const GithubIcon = [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style="stroke:none">',
  '<path fill-rule="evenodd" clip-rule="evenodd" d="M12 .5C5.65.5.5 5.65.5 12c0 5.09 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56 0-.28-.01-1.21-.02-2.2-3.2.69-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.75 2.69 1.25 3.34.95.1-.74.4-1.25.73-1.54-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.16 1.18A11 11 0 0 1 12 5.98c.98 0 1.95.13 2.87.39 2.19-1.49 3.15-1.18 3.15-1.18.63 1.58.24 2.75.12 3.04.74.81 1.18 1.83 1.18 3.09 0 4.41-2.69 5.38-5.25 5.67.42.36.78 1.06.78 2.14 0 1.55-.01 2.79-.01 3.17 0 .31.2.67.79.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />',
  "</svg>"
].join("");

const RedditIcon = [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style="stroke:none">',
  '<path d="M21.5 12c0-1.18-.96-2.14-2.14-2.14-.58 0-1.1.23-1.49.61-1.42-.9-3.31-1.49-5.41-1.56l.91-4.28 2.97.63a1.52 1.52 0 1 0 .22-1.05l-3.5-.75a.54.54 0 0 0-.64.42L11.36 8.9c-2.04.08-3.89.67-5.29 1.55a2.13 2.13 0 0 0-1.45-.58A2.14 2.14 0 0 0 2.48 12c0 .87.52 1.62 1.26 1.95-.02.17-.03.34-.03.51 0 3.07 3.69 5.57 8.24 5.57s8.24-2.49 8.24-5.57c0-.16-.01-.32-.03-.48.79-.31 1.34-1.08 1.34-1.98Zm-14.2 1.46a1.44 1.44 0 1 1 2.88 0 1.44 1.44 0 0 1-2.88 0Zm7.98 3.62c-.94.94-2.72 1.01-3.28 1.01s-2.34-.07-3.28-1.01a.55.55 0 0 1 .78-.78c.59.59 1.85.69 2.5.69s1.91-.1 2.5-.69a.55.55 0 1 1 .78.78Zm-.01-2.18a1.44 1.44 0 1 1 0-2.88 1.44 1.44 0 0 1 0 2.88Z" />',
  "</svg>"
].join("");

const icons: Record<IconName, string> = {
  add: AddIcon,
  audit: AuditIcon,
  avatar: DefaultAvatarIcon,
  blog: BlogIcon,
  brand: brandIconSvg,
  check: CheckIcon,
  comment: CommentIcon,
  database: DatabaseIcon,
  delete: DeleteIcon,
  edit: EditIcon,
  email: EmailIcon,
  favorite: FavoriteIcon,
  forward: ForwardIcon,
  github: GithubIcon,
  group: GroupIcon,
  link: LinkIcon,
  lock: LockIcon,
  message: MessageIcon,
  moon: MoonIcon,
  notifications: BellIcon,
  prop: PropIcon,
  "rate-limit": GaugeIcon,
  reddit: RedditIcon,
  refresh: RefreshIcon,
  reply: ReplyIcon,
  report: ReportIcon,
  save: SaveIcon,
  search: SearchIcon,
  send: ForwardIcon,
  settings: SettingsIcon,
  sun: SunIcon,
  unlock: LockOpenIcon,
  upload: UploadIcon,
  user: UserIcon,
  "user-minus": UserMinusIcon
};

export function SvgIcon({ svg, label }: { svg: string; label?: string }) {
  // Icon SVG strings are static imports or local constants, not user content.
  return (
    <span
      class="icon"
      aria-hidden={label ? undefined : "true"}
      aria-label={label}
      role={label ? "img" : undefined}
      dangerouslySetInnerHTML={trustedHtml(svg)}
    />
  );
}

export function Icon({ name, label }: { name: IconName; label?: string }) {
  return <SvgIcon svg={icons[name]} label={label} />;
}
