#!/usr/bin/env node
/**
 * Sync supported chains/tokens into developer-docs/supported-chains.mdx.
 *
 * Default source (until public APIs return the full registry):
 *   data/token-registry/chains.json
 *   data/token-registry/tokens.json
 *
 * Usage:
 *   yarn sync:chains
 *   yarn sync:chains --source=api
 *
 * Env (optional):
 *   SOURCE=local|api
 *   CHAINS_JSON / TOKENS_JSON  local file paths
 *   MAINNET_API_BASE / TESTNET_API_BASE  when SOURCE=api
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const TARGET = path.join(ROOT, 'developer-docs/supported-chains.mdx')
const START = '{/* supported-chains:start */}'
const END = '{/* supported-chains:end */}'

const DEFAULT_CHAINS_JSON = path.join(
  ROOT,
  'data/token-registry/chains.json'
)
const DEFAULT_TOKENS_JSON = path.join(
  ROOT,
  'data/token-registry/tokens.json'
)

const MAINNET_API_BASE =
  process.env.MAINNET_API_BASE || 'https://api.spacepay.solutions'
const TESTNET_API_BASE =
  process.env.TESTNET_API_BASE || 'https://api-testnet.spacepay.solutions'

function parseSource() {
  const arg = process.argv.find((a) => a.startsWith('--source='))
  if (arg) return arg.slice('--source='.length)
  return process.env.SOURCE || 'local'
}

async function fetchJson(url) {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`GET ${url} failed: ${res.status} ${res.statusText}`)
  }
  return res.json()
}

async function fetchRegistry(base) {
  const [chains, tokens] = await Promise.all([
    fetchJson(`${base}/v1/external/chains?limit=1000`),
    fetchJson(`${base}/v1/external/tokens?limit=1000`),
  ])
  return {
    chains: (chains.data || []).map(normalizeChain),
    tokens: (tokens.data || []).map(normalizeToken),
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function normalizeChain(raw) {
  return {
    chainId: String(raw.chainId ?? raw.chain_id),
    name: raw.name,
    nativeSymbol: raw.nativeSymbol ?? raw.native_symbol,
    nativeDecimals: raw.nativeDecimals ?? raw.native_decimals,
    isEnabled: raw.isEnabled ?? raw.is_enabled ?? true,
    isTestnet: Boolean(raw.isTestnet ?? raw.is_testnet),
  }
}

function normalizeToken(raw) {
  const chain = raw.chain
    ? normalizeChain(raw.chain)
    : {
        chainId: String(raw.chainId ?? raw.chain_id),
        name: undefined,
        isTestnet: undefined,
        isEnabled: undefined,
      }

  return {
    id: raw.id,
    symbol: raw.symbol,
    contractAddress: raw.contractAddress ?? raw.contract_address,
    assetType: raw.assetType ?? raw.asset_type,
    status: raw.status || 'active',
    chain,
  }
}

function loadLocalRegistry() {
  const chainsPath = process.env.CHAINS_JSON || DEFAULT_CHAINS_JSON
  const tokensPath = process.env.TOKENS_JSON || DEFAULT_TOKENS_JSON
  const chainsRaw = readJson(chainsPath)
  const tokensRaw = readJson(tokensPath)
  const chainsList = Array.isArray(chainsRaw) ? chainsRaw : chainsRaw.data || []
  const tokensList = Array.isArray(tokensRaw) ? tokensRaw : tokensRaw.data || []

  return {
    chains: chainsList.map(normalizeChain),
    tokens: tokensList.map(normalizeToken),
    sourceLabel: `${path.relative(ROOT, chainsPath)} + ${path.relative(ROOT, tokensPath)}`,
  }
}

function groupByChain(chains, tokens) {
  const by = new Map()
  for (const c of chains) {
    by.set(String(c.chainId), { ...c, tokens: [] })
  }
  for (const t of tokens) {
    if (t.status && t.status !== 'active') continue
    const cid = String(t.chain.chainId)
    if (!by.has(cid)) {
      by.set(cid, {
        chainId: cid,
        name: t.chain.name || cid,
        isTestnet: Boolean(t.chain.isTestnet),
        isEnabled: t.chain.isEnabled,
        tokens: [],
      })
    }
    const entry = by.get(cid)
    if (!entry.name && t.chain.name) entry.name = t.chain.name
    entry.tokens.push(t)
  }
  return [...by.values()]
    .filter((c) => c.tokens.length > 0)
    .sort((a, b) => String(a.name).localeCompare(String(b.name)))
}

function displayChainId(caipOrNum) {
  const s = String(caipOrNum)
  if (/^eip155:\d+$/.test(s)) return `\`${s}\``
  if (/^\d+$/.test(s)) return `\`eip155:${s}\``
  return `\`${s}\``
}

function renderTokenContract(t) {
  if (t.assetType === 'native') return 'Native'
  return `\`${t.contractAddress}\``
}

function renderChainsTable(chains) {
  const rows = []
  for (const c of chains) {
    const sortedTokens = [...c.tokens].sort((a, b) =>
      a.symbol.localeCompare(b.symbol)
    )
    for (const t of sortedTokens) {
      rows.push(
        `| ${c.name} | ${displayChainId(c.chainId)} | ${t.symbol} | ${renderTokenContract(t)} |`
      )
    }
  }

  return [
    '| Network | Chain ID | Token | Contract address |',
    '| ------- | -------- | ----- | ---------------- |',
    ...rows,
    '',
  ].join('\n')
}

function renderSection({ mainnetChains, testnetChains }) {
  const parts = [
    '## Supported Chains and Assets',
    '',
    'SpacePay supports the following blockchain networks and assets.',
    '',
    '### Mainnet',
    '',
    renderChainsTable(mainnetChains),
    '### Testnet networks',
    '',
  ]

  if (testnetChains.length > 0) {
    parts.push(renderChainsTable(testnetChains))
    parts.push(
      'See [Testing](/developer-docs/testing) for environment URLs and test scenarios.',
      ''
    )
  } else {
    parts.push(
      'No testnet networks are currently listed.',
      '',
      'See [Testing](/developer-docs/testing) for environment URLs and test scenarios.',
      ''
    )
  }

  return parts.join('\n').trimEnd() + '\n'
}

function replaceMarkedSection(fileContents, sectionMarkdown) {
  const startIdx = fileContents.indexOf(START)
  const endIdx = fileContents.indexOf(END)
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    throw new Error(
      `Missing ${START} / ${END} markers in ${path.relative(ROOT, TARGET)}`
    )
  }
  const before = fileContents.slice(0, startIdx + START.length)
  const after = fileContents.slice(endIdx)
  return `${before}\n${sectionMarkdown}${after}`
}

async function loadSource(source) {
  if (source === 'api') {
    const [mainnet, testnet] = await Promise.all([
      fetchRegistry(MAINNET_API_BASE),
      fetchRegistry(TESTNET_API_BASE),
    ])
    const mainnetChains = groupByChain(mainnet.chains, mainnet.tokens).filter(
      (c) => !c.isTestnet
    )
    const testnetChains = groupByChain(testnet.chains, testnet.tokens).filter(
      (c) => c.isTestnet
    )
    return {
      mainnetChains,
      testnetChains,
      logLabel: `API ${MAINNET_API_BASE} + ${TESTNET_API_BASE}`,
    }
  }

  if (source !== 'local') {
    throw new Error(`Unknown SOURCE="${source}". Use local or api.`)
  }

  const local = loadLocalRegistry()
  const grouped = groupByChain(local.chains, local.tokens)
  return {
    mainnetChains: grouped.filter((c) => !c.isTestnet),
    testnetChains: grouped.filter((c) => c.isTestnet),
    logLabel: local.sourceLabel,
  }
}

async function main() {
  const source = parseSource()
  const { mainnetChains, testnetChains, logLabel } = await loadSource(source)

  const section = renderSection({
    mainnetChains,
    testnetChains,
  })
  const current = fs.readFileSync(TARGET, 'utf8')
  const next = replaceMarkedSection(current, section)
  fs.writeFileSync(TARGET, next)

  const mainnetTokenCount = mainnetChains.reduce(
    (n, c) => n + c.tokens.length,
    0
  )
  const testnetTokenCount = testnetChains.reduce(
    (n, c) => n + c.tokens.length,
    0
  )

  console.log(
    `Updated ${path.relative(ROOT, TARGET)} from ${logLabel} (source=${source}; mainnet: ${mainnetChains.length} chains / ${mainnetTokenCount} tokens; testnet: ${testnetChains.length} chains / ${testnetTokenCount} tokens)`
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
