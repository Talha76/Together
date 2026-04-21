# MEGA Session Script — `fetch failed` / ETIMEDOUT

Incident report for `node scripts/mega-session.js` hanging and exiting with `Login failed: fetch failed`. Keep this so the next time it recurs we skip the debug loop.

---

## Symptom

```
Logging into MEGA as <email> ...
Login failed: fetch failed
```

- No HTTP status, no MEGA API error body.
- Script exits ~20–75 s after launch (OS connect timeout), not instantly.
- `curl https://g.api.mega.co.nz/` succeeds from the same shell, so "network is fine" intuition misleads.

---

## Root cause

Node 18+ global `fetch` is backed by **undici**. Undici's default `Agent` uses **Happy Eyeballs** (`autoSelectFamily: true`) — it races an IPv4 and an IPv6 socket and takes whichever connects first.

MEGA publishes both A and AAAA records:

```
g.api.mega.co.nz.  A     66.203.125.11..16
g.api.mega.co.nz.  AAAA  2a0b:e46:1:100::11..16
```

On networks where the IPv6 path to `2a0b:e46:1::/48` is **silently black-holed** (no RST, no ICMP unreachable — packets just vanish), the v6 socket neither connects nor errors. Undici's race waits until the OS TCP timeout on the v6 attempt fires before falling back, and `megajs` surfaces that as the generic `fetch failed` / `ETIMEDOUT`.

`curl` without `-6` prefers IPv4 by default, so manual `curl` checks hide the bug.

### Why the weaker fixes don't work

| Attempt                                        | Result                                                                                            |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `NODE_OPTIONS='--dns-result-order=ipv4first'`  | Only reorders the DNS lookup. Undici still opens a v6 socket via `autoSelectFamily`. Still hangs. |
| `dns.setDefaultResultOrder('ipv4first')` alone | Same as above.                                                                                    |
| `--network-family-autoselection=false`         | Works in some Node builds but not all; behavior differs across 18/20/22.                          |

Only hard-disabling v6 on the undici dispatcher reliably works.

---

## Fix (shipped)

Top of `scripts/mega-session.js`:

```js
require("dns").setDefaultResultOrder("ipv4first");
const { Agent, setGlobalDispatcher } = require("undici");
setGlobalDispatcher(new Agent({ connect: { family: 4 } }));
```

- `undici` ships inside Node, no extra dep.
- `setGlobalDispatcher` replaces the dispatcher that global `fetch` uses, so `megajs` (which calls global `fetch`) inherits v4-only connects without any library patch.
- `setDefaultResultOrder('ipv4first')` is belt-and-suspenders for any non-undici `dns.lookup` inside megajs.

Verified: login completes in ~1 s with the patch; without it, `fetch('https://g.api.mega.co.nz/cs?id=0', {method:'POST'})` returns `ETIMEDOUT` after ~1.5 s then `megajs` gives up.

---

## Recurrence checklist

If `node scripts/mega-session.js` prints `Login failed: fetch failed` again:

1. Confirm network is actually reachable on v4:
   ```bash
   curl -4 -sS -o /dev/null -w '%{http_code}\n' -X POST -H 'content-type: application/json' \
     -d '[{"a":"us0","user":"x@y.z"}]' https://g.api.mega.co.nz/cs?id=0
   ```
   Expect `200`. If not, the problem is the network, not this bug — check VPN / firewall / DNS.
2. Confirm v6 hang reproduces:
   ```bash
   node -e "fetch('https://g.api.mega.co.nz/cs?id=0',{method:'POST',headers:{'content-type':'application/json'},body:'[{\"a\":\"us0\",\"user\":\"x@y.z\"}]'}).then(r=>console.log(r.status)).catch(e=>console.log('ERR',e.cause?.code))"
   ```
   If it prints `ERR ETIMEDOUT`, this is the same bug.
3. Confirm the v4 dispatcher patch is still present at top of `scripts/mega-session.js`. Someone may have reformatted or stripped it.
4. If patch present but issue persists:
   - Check `node --version` — needs undici (Node ≥ 18).
   - Check for an HTTP(S) proxy env var (`HTTP_PROXY`, `HTTPS_PROXY`) — a broken corporate proxy will surface identically. Unset to test.
   - Try explicit IP: resolve `g.api.mega.co.nz` to a v4 address and `curl` it with `-H 'Host: g.api.mega.co.nz'` to rule out SNI / TLS issues.
5. If any other Node script in this repo later talks to MEGA (or any service with broken AAAA), apply the same `setGlobalDispatcher` snippet at the top.

---

## Related reading

- undici Happy Eyeballs: `autoSelectFamily` option on `Agent` / `Client`.
- Node issue tracker: search `undici ETIMEDOUT IPv6 autoSelectFamily`.
- MEGA API endpoint used: `POST https://g.api.mega.co.nz/cs` (command channel).
