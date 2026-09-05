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

## Repository-local Git worktrees

- Create or use a Git worktree only when the human operator explicitly authorizes it for the current task. Concurrency or a dirty checkout is not permission by itself.
- Put every authorized worktree at `<repository-root>/tmp/worktrees/<name>`; from the repository root, use `./tmp/worktrees/<name>`. Never place worktrees beside repositories or organization directories.
- Keep `tmp`, `temp`, `tmp/worktrees`, and `temp/worktrees` ignored in the repository-root `.gitignore`. Do not commit files from those directories.
- Relocate or remove a worktree only when the operator explicitly requests it. Before removal, preserve and publish intended changes, verify its commit is represented on the target branch, and confirm there are no tracked, untracked, ignored-sensitive, or in-use files that must survive. Remove it with `git worktree remove <path>` without `--force`; never delete a worktree directory with `rm`.
