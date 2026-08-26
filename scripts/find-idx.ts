import fs from 'fs'
const content = fs.readFileSync('src/lib/ai/openai.provider.ts', 'utf-8')
const idx = content.indexOf('analyzeCall')
console.log('analyzeCall idx:', idx)
if (idx !== -1) {
  console.log('Surrounding:', JSON.stringify(content.substring(idx - 20, idx + 80)))
}
const endIdx = content.indexOf('let attempts = 0')
console.log('endIdx:', endIdx)
