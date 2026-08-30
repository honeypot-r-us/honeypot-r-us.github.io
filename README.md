# Honeypot R Us marketing site — test

This public repository is the mandatory pre-production proving ground for the
Astro marketing site. Changes are validated here before the exact reviewed
candidate is promoted to `honeypot-r-us/honeypot-r-us.github.io`.

The production site is intended for <https://honeypot-r-us.github.io/> and the
custom domain <https://honeypotrus.com/>. This test repository must not carry
production credentials or advertise test-only behavior as production-ready.

Project-wide contribution and security rules are inherited from
`../.openai/AGENTS.md` in the coordinated local workspace.

## Routes

- `/platform/` — event plane, correlation, evidence, and outcomes.
- `/honeypots/` — decoy and lure delivery states.
- `/quarantine/` — leased quarantine and the HNPT-owned playpen.
- `/integrations/` — NATS, OpenTelemetry, webhook, sync, and SIEM plans.
- `/developers/` — Rust, Dart, TypeScript, CLI, API, and 17-language SDKs.
- `/security/` — Shared Auth and HNPT authorization boundaries.
- `/pricing/`, `/company/`, and `/login/` — pilot, company, and account paths.

The site labels capabilities as foundation available, contract available, in
development, roadmap, reserved, or safety invariant. A roadmap item must never
be presented as deployed.

## Local verification

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run check
npm test
npm run build
npm run test:browser
```

`.zpkg.toml` is the ecosystem package and test contract. The npm manifest and
lockfile are the native Astro build adapter. This static site has no executable
CLI surface and therefore does not invent a flags-2-env contract.

`PUBLIC_SITE_URL` selects the canonical origin at build time. GitHub Actions
derives it from the repository owner, allowing the same source commit to build
correct canonical URLs in the test and production organization Pages sites.
