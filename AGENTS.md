# Honeypot R Us public site

- This repository is the static Astro marketing site only.
- Customer and organization workflows belong to the HNPT web server; authentication belongs to the Shared Auth proxy. The site delegates to those services and never handles credentials.
- Keep user and organization login links public, but do not advertise administrative entry points.
- Present only verified capabilities as available. Label in-development and planned deception features explicitly.
- Preserve a responsive, keyboard-accessible sticky header and durable footer.
- Keep the source commit identical between the test and production organization Pages repositories. Derive the Pages origin from the build environment.
- Validate in `honeypot-r-us-test` before promoting the exact reviewed commit to `honeypot-r-us`.
- `.zpkg.toml` is the package/test contract; `package.json` and `package-lock.json` are the locked npm build adapter.
- This site has no command surface, so a `flags-2-env` flag contract is intentionally not added.
- Never commit credentials, Cloudflare tokens, Shared Auth secrets, production data, or attacker-controlled evidence.
