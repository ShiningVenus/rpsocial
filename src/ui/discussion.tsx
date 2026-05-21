import type { Child } from "hono/jsx";
import { classNames } from "./classes.js";
import { MetaSubjectLink } from "./meta.js";
import { ProfileImage } from "./avatars.js";
import { profilePath } from "../paths.js";
import { LocalizedTime } from "./time.js";

export function DiscussionEntry(props: {
  authorId: number;
  authorHandle: string;
  children: Child;
  className?: string;
  createdAt: string;
  pfp: string;
  username: string;
}) {
  return (
    <article class={classNames("discussion-entry", props.className)}>
      <div class="discussion-entry__author">
        <ProfileImage
          alt={`${props.username}'s profile picture`}
          filename={props.pfp}
          loading="lazy"
          variant="avatar-compact"
        />
        <MetaSubjectLink href={profilePath(props.authorHandle)}>{props.username}</MetaSubjectLink>
      </div>
      <div class="discussion-entry__body">
        <div class="discussion-entry__meta"><LocalizedTime value={props.createdAt} /></div>
        {props.children}
      </div>
    </article>
  );
}
