# GitHub SSH (avoid github.com:443 git timeouts)

When `git fetch`/`git push` over HTTPS times out but `gh api` / `api.github.com` works, switch the repo remote to SSH.

## Status (this laptop)

- Key: `~/.ssh/id_ed25519_shield` (+ `.pub`)
- Deploy key on `otas0/buusdocst`: **write**, title `buusdocst-laptop` (rename in Settings → Deploy keys if still labeled `preventive-shield-laptop`)
- `~/.ssh/config` → `Host github.com` via `ssh.github.com:443` + that IdentityFile
- `origin` → `git@github.com:otas0/buusdocst.git` (`ssh -T` OK)

## One-time setup (other machines)

```bash
ssh-keygen -t ed25519 -C "preventive-shield-laptop" -f ~/.ssh/id_ed25519_shield -N ""
# Add .pub as a GitHub deploy key (Allow write) or user SSH key
cat > ~/.ssh/config <<'EOF'
Host github.com
  HostName ssh.github.com
  User git
  Port 443
  IdentityFile ~/.ssh/id_ed25519_shield
  IdentitiesOnly yes
EOF
git remote set-url origin git@github.com:otas0/buusdocst.git
ssh -T git@github.com && git fetch origin
```

**Note:** Port **443** to `ssh.github.com` often works when `github.com:443` git HTTPS is filtered. Deploy keys are **repo-scoped**.

## Hold

Do **not** generate keys or rewrite remotes from CI. Operator laptop only.

## Related

- Content sync without git: `node scripts/push-via-github-api.mjs` (API)
- Local CF timeout ≠ outage: [LOCAL_CF_CONNECTIVITY.md](LOCAL_CF_CONNECTIVITY.md) — use Actions **Production health**