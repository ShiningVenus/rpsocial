# Security Policy

Bliish.space deployments are operator-managed instances.

## Reporting Vulnerabilities

Report sensitive issues through the repository's private vulnerability reporting channel if one is configured. If not, contact the maintainer privately before publishing details.

For non-sensitive issues, open a public issue with:

- affected version or commit;
- affected route or feature;
- expected behavior;
- actual behavior;
- reproduction steps;
- impact assessment.

## Supported Versions

Security fixes target the current main branch unless a release branch states otherwise.

## Security Boundaries

Bliish.space currently treats these areas as security-critical:

- password hashing;
- cookie sessions;
- CSRF checks;
- profile HTML and skin sanitization;
- upload validation and normalization;
- oversized request rejection;
- form action rate limiting;
- security headers;
- account export and deletion;
- role-based admin and moderator actions;
- report moderation;
- post, comment, and upload deletion paths;
- private profile visibility.

## Non-Goals

Bliish.space does not provide:

- hosted abuse monitoring;
- centralized moderation;
- managed backups;
- managed email reputation;
- DDoS protection;
- security guarantees for modified custom skins or reverse proxy configs.

Instance operators are responsible for host hardening, TLS, backups, logs, and abuse response.
