# GitHub SSH (stable push when HTTPS :443 times out)

`github.com:443` HTTPS git often times out on this laptop. Prefer **SSH via `ssh.github.com:443`** with the **buusdocst deploy key** — not the whole-tree Contents API push.

## Status (this laptop)

- Key: `~/.ssh/id_ed25519_shield` (comment `preventive-shield-laptop`; fingerprint authenticates as `otas0/buusdocst`, **write** enabled)
- Deploy key on `otas0/buusdocst`: **Allow write access** — rename title in UI to `buusdocst-laptop` if still labeled `preventive-shield-laptop` (API rename may 404)
- **Do not** put `id_ed25519_buusdo` first for this repo — that key is bound to **another** Buusdo-line repo and causes `Permission denied to deploy key`
- Host alias + remote:

```text
Host github.com-buusdocst
  HostName ssh.github.com
  User git
  Port 443
  IdentityFile ~/.ssh/id_ed25519_shield
  IdentitiesOnly yes
  IdentityAgent none
```

```bash
git remote set-url origin git@github.com-buusdocst:otas0/buusdocst.git
ssh -T git@github.com-buusdocst   # expect: Hi otas0/buusdocst!
git fetch origin && git push origin HEAD
```

## One-time setup (other machines)

```bash
ssh-keygen -t ed25519 -C "buusdocst-laptop" -f ~/.ssh/id_ed25519_shield -N ""
# GitHub → otas0/buusdocst → Settings → Deploy keys → Add (Allow write access)
# Append the Host github.com-buusdocst block above to ~/.ssh/config
git remote set-url origin git@github.com-buusdocst:otas0/buusdocst.git
ssh -T git@github.com-buusdocst && git fetch origin
```

## Hold

- Do **not** generate keys or rewrite remotes from CI.
- Prefer `git push` over SSH. Use `node scripts/push-via-github-api.mjs` **only** as last resort (slow whole-tree upload).

## Related

- Local CF timeout ≠ outage: [LOCAL_CF_CONNECTIVITY.md](LOCAL_CF_CONNECTIVITY.md)
- Workers formal name note: [OPS_CF_WRAPUP.md](OPS_CF_WRAPUP.md)
