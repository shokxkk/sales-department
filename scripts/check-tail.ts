import fs from 'fs'

const content = fs.readFileSync('src/lib/ai/openai.provider.ts', 'utf-8')
const lines = content.split('\n')
lines.slice(330, 370).forEach((line, idx) => {
  console.log(`${331 + idx}: ${line}`)
})
