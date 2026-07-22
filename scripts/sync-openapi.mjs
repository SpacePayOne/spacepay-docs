#!/usr/bin/env node
/**
 * Refresh api-reference/openapi.json with merchant-facing (/v1/external/*) paths
 * from the testnet OpenAPI document.
 *
 * Usage:
 *   yarn sync:openapi
 *
 * Env:
 *   OPENAPI_SOURCE_URL  default https://api-testnet.spacepay.solutions/docs/swagger.json
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DEST = path.join(ROOT, 'api-reference/openapi.json')
const SOURCE_URL =
  process.env.OPENAPI_SOURCE_URL ||
  'https://api-testnet.spacepay.solutions/docs/swagger.json'

const DEFAULT_SERVERS = [
  { url: 'https://api.spacepay.solutions', description: 'Mainnet' },
  { url: 'https://api-testnet.spacepay.solutions', description: 'Testnet' },
]

async function main() {
  const res = await fetch(SOURCE_URL)
  if (!res.ok) {
    throw new Error(`GET ${SOURCE_URL} failed: ${res.status} ${res.statusText}`)
  }
  const src = await res.json()

  const paths = {}
  const usedTags = new Set()
  for (const [p, methods] of Object.entries(src.paths || {})) {
    if (!p.startsWith('/v1/external/')) continue
    paths[p] = methods
    for (const op of Object.values(methods)) {
      if (op && typeof op === 'object' && Array.isArray(op.tags)) {
        op.tags.forEach((t) => usedTags.add(t))
      }
    }
  }

  const tags = (src.tags || []).filter((t) => usedTags.has(t.name))
  for (const name of usedTags) {
    if (!tags.some((t) => t.name === name)) tags.push({ name })
  }

  const out = {
    openapi: src.openapi || '3.0.0',
    info: {
      title: 'SpacePay External API',
      description:
        src.info?.description || 'Merchant-facing SpacePay API endpoints.',
      version: src.info?.version || '1.0',
    },
    // Always publish consumer base URLs (source swagger often has empty servers).
    servers: DEFAULT_SERVERS,
    tags,
    paths,
    components: src.components || {},
    security: src.security,
  }

  fs.writeFileSync(DEST, JSON.stringify(out, null, 2) + '\n')
  console.log(
    `Wrote ${path.relative(ROOT, DEST)} from ${SOURCE_URL} (${Object.keys(paths).length} paths, ${tags.length} tags)`
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
