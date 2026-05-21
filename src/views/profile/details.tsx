import { defaultInterestNames, type UserProfile } from "../../models.js";
import { hasSocialLinks, socialLinkPlatforms } from "../../socialLinks.js";
import { Panel } from "../../ui/panels.js";
import { SocialLinkIcon } from "../../ui/socialLinks.js";
import { profileSkinPart } from "../../skins/rendering.js";

export function ProfileSocialLinks({ profile }: { profile: UserProfile }) {
  if (!hasSocialLinks(profile.socialLinks)) return null;

  return (
    <Panel className="profile__links profile-card" dataAttributes={profileSkinPart("links")} title={`${profile.username}'s links`}>
      <ul class="profile-social-links link-list">
        {socialLinkPlatforms.map((platform) => {
          const href = profile.socialLinks[platform.id];
          return href ? (
            <li>
              <a href={href} target="_blank" rel="me nofollow noopener noreferrer">
                <SocialLinkIcon platform={platform} />
                <span>{platform.label}</span>
              </a>
            </li>
          ) : null;
        })}
      </ul>
    </Panel>
  );
}

export function ProfileInterests({ profile }: { profile: UserProfile }) {
  const interests = defaultInterestNames
    .map((name) => ({ name, value: profile.interests[name] }))
    .filter((interest) => interest.value.trim());
  if (!interests.length) return null;

  return (
    <Panel className="profile__interests profile-card" dataAttributes={profileSkinPart("interests")} title={`${profile.username}'s interests`}>
      <table class="details-table">
        <tbody>
          {interests.map(({ name, value }) => (
            <tr>
              <td><p>{name}</p></td>
              <td><p>{value}</p></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}
