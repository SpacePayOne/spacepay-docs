---
name: sync-supported-chains
description: Sync SpacePay supported chains and tokens into developer-docs/blockchain-concepts.mdx from local token-registry dumps or public APIs. Use when updating supported networks/tokens, refreshing blockchain concepts, or when the user asks to sync chains from the API or data files.
---

# Sync supported chains and tokens

Canonical docs page: `developer-docs/blockchain-concepts.mdx` (section between `{/* supported-chains:start */}` and `{/* supported-chains:end */}`).

Other pages must **link** to that page — do not duplicate chain/token lists.

## Sources

Default is **local** until the public APIs return the full enabled registry.

| Source            | How                                               | Data                             |
| ----------------- | ------------------------------------------------- | -------------------------------- |
| `local` (default) | `data/token-registry/chains.json` + `tokens.json` | DB-style snake_case dump         |
| `api`             | Public HTTP APIs                                  | Paginated `{ data, pagination }` |

```bash
yarn sync:chains                 # local dump
yarn sync:chains --source=api    # live APIs
SOURCE=api yarn sync:chains
```

Optional env:

- `CHAINS_JSON` / `TOKENS_JSON` — override local file paths
- `MAINNET_API_BASE` (default `https://api.spacepay.solutions`)
- `TESTNET_API_BASE` (default `https://api-testnet.spacepay.solutions`)

## Refresh workflow

1. If the registry dump changed, replace files under `data/token-registry/` (or point `CHAINS_JSON` / `TOKENS_JSON` at new files).
2. Run `yarn sync:chains`.
3. Review the diff in `developer-docs/blockchain-concepts.mdx`.
4. Keep other pages pointing at `/developer-docs/blockchain-concepts`.
5. When public APIs expose the full set, switch to `yarn sync:chains --source=api`.

## Formatting rules (script applies)

- Consumer-facing copy only (no mentions of local dumps, sync scripts, or internal APIs)
- Render mainnet and testnet as markdown tables: Network | Chain ID | Token | Contract address
- Include only tokens with `status: active` (skip `blocked`, etc.)
- Sort chains and tokens alphabetically
- EVM: show full CAIP-2 id (`eip155:N`); if the source only has a numeric id, prefix with `eip155:`
- Non-EVM: show full CAIP-2 id as returned
- Native assets: Contract address cell is `Native` (never print `0xeeee…`)
- Non-native: include `contract_address` / `contractAddress`
- Mainnet vs testnet split uses `is_testnet` / `isTestnet`

## Notes

- Local dumps may list chains with `is_enabled: false`; still document them while the API catch-up is pending.
- Do not invent chains/tokens that are absent from the chosen source.
