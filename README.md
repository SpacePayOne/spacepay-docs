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
```

## OpenAPI

Mintlify loads the live spec from:

```text
https://api.spacepay.solutions/docs/swagger.json
```

Testnet is also available at `https://api-testnet.spacepay.solutions/docs/swagger.json` (not wired into `docs.json` by default). Visitors can download the configured spec from the contextual menu on API reference pages (`download-spec` in `docs.json`).

## Publishing changes

Install the GitHub app from your [Mintlify dashboard](https://dashboard.mintlify.com/settings/organization/github-app) to propagate changes from this repo to your deployment. Changes deploy to production automatically after pushing to the default branch.

## Troubleshooting

- If the local preview is out of sync with production: upgrade the local CLI with `yarn upgrade mint`.
- If a page loads as a 404: make sure you are running in the repo root with a valid `docs.json`.

## Resources

- [Mintlify documentation](https://mintlify.com/docs)
