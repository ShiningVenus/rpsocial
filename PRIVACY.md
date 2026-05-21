# Privacy

Bliish.space is self-hosted. The default app does not require external APIs, external analytics, ad networks, or tracking pixels.

## Data Stored By The App

The local SQLite database stores:

- account email;
- username;
- account role;
- password hash;
- session hashes and CSRF tokens;
- short-lived rate-limit counters with action names and hashed account, email, or reset-token keys;
- verification and password reset token hashes;
- profile fields;
- friend relationships;
- favorites;
- user blocks;
- wall posts, group posts, post props, and post comments;
- blogs, blog props, and blog comments;
- groups and group memberships;
- private messages;
- notification records;
- shared skins and skin comments;
- reports, including system-created automod reports;
- automod rule names, patterns, scopes, and actions;
- queued local email outbox messages;
- moderation audit log entries;
- timestamps for account and session activity.

Uploaded profile pictures, post images, and theme songs are stored on the local filesystem under the configured upload directory.

Favorites and props are user action records. The app uses them to render the signed-in user's Favs and Props pages; the Props page is a filtered view of posts and blog entries the user has propped.

## Cookies

Bliish.space uses:

- an HTTP-only session cookie for logged-in users;
- a CSRF token cookie for form protection;
- an HTTP-only color theme cookie.

The default app does not use third-party cookies.

## Locale And Time Display

Signed-in users can save a timezone so the app can display timestamps correctly for their account. The default app does not store locale or date-format preferences.

## Network Requests

The server does not require third-party services during normal user workflows. Password reset and verification messages are written to the local SQLite email outbox. If SMTP is configured, the app also attempts to deliver those messages through the operator's SMTP server.

Skin HTML can include sanitized HTTPS image URLs, CSS background URLs, Google Fonts imports, and sandboxed embeds from whitelisted player hosts such as YouTube, SoundCloud, Vimeo, Spotify, Bandcamp, TikTok, and Dailymotion. Visiting a customized profile can therefore make the visitor's browser request third-party resources chosen by that profile author. Ordinary user text fields do not allow image tags or embeds.

## Export And Delete

Users can export account data from `/account/export.json`.

Users can delete their account from account settings. Deletion removes database rows linked by cascading foreign keys and removes uploaded profile, post image, and theme song files referenced by deleted records. Moderation reports and audit entries may remain with deleted user references cleared where the schema uses `ON DELETE SET NULL`. Operators remain responsible for backups, web server logs, and retained system logs outside the app.

## Operator Responsibilities

Instance operators should publish their own privacy notice covering:

- legal jurisdiction;
- log retention;
- backup retention;
- moderation policy;
- administrator access;
- SMTP provider, if configured;
- reverse proxy and CDN behavior, if any.
