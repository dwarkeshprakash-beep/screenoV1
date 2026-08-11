import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const config = JSON.parse(
  await readFile(new URL('../vercel.json', import.meta.url), 'utf8')
)
const apiSource = await readFile(new URL('../src/services/api.js', import.meta.url), 'utf8')

assert.match(apiSource, /import\.meta\.env\.PROD/)
assert.match(apiSource, /VITE_USE_SAME_ORIGIN_API\s*!==\s*'false'/)

const [apiRewrite, healthRewrite, spaRewrite] = config.rewrites || []

assert.deepEqual(apiRewrite, {
  source: '/api/:path*',
  destination: 'https://screenov1.onrender.com/api/:path*',
})
assert.deepEqual(healthRewrite, {
  source: '/health',
  destination: 'https://screenov1.onrender.com/health',
})
assert.deepEqual(spaRewrite, {
  source: '/(.*)',
  destination: '/index.html',
})

console.log('Deployment configuration is valid: API rewrites precede the SPA fallback.')
