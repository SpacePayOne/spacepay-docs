# SpacePay One docs

Public-facing documentation site powered by [Mintlify](https://mintlify.com).

## Local preview

Requires Node.js 24+:

```bash
yarn install
yarn dev
```

Open http://localhost:3000.

## Format

Uses [`@mintlify/prettier-config`](https://www.npmjs.com/package/@mintlify/prettier-config):

```bash
yarn format        # write
yarn format:check  # CI check
yarn validate      # Mintlify build
yarn broken-links  # internal link check
yarn sync:chains   # refresh supported chains/tokens (local data/token-registry dump by default)
yarn sync:openapi  # refresh filtered external OpenAPI from staging
```

Supported networks and tokens are maintained in `developer-docs/blockchain-concepts.mdx` only. Run `yarn sync:chains` (see `.cursor/skills/sync-supported-chains/SKILL.md`) after registry changes. Use `yarn sync:chains --source=api` once the public APIs expose the full enabled set.

## OpenAPI

API reference pages are generated from `api-reference/openapi.json` (merchant-facing `/v1/external/*` endpoints only) with Mintlify’s interactive playground — same pattern as AlphaGrid. The sidebar groups them under **Payments & Deposits** and **Withdrawals**.

Refresh the filtered spec from staging:

```bash
yarn sync:openapi
```

Visitors can download the configured spec from the contextual menu on API pages (`download-spec` in `docs.json`).

## Publishing changes

Install the GitHub app from your [Mintlify dashboard](https://dashboard.mintlify.com/settings/organization/github-app) to propagate changes from this repo to your deployment. Changes deploy to production automatically after pushing to the default branch.

## Troubleshooting

- If the local preview is out of sync with production: upgrade the local CLI with `yarn upgrade mint`.
- If a page loads as a 404: make sure you are running in the repo root with a valid `docs.json`.

## Resources

- [Mintlify documentation](https://mintlify.com/docs)
