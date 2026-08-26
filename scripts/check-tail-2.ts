import fs from 'fs'
const content = fs.readFileSync('src/lib/ai/openai.provider.ts', 'utf-8')
const lines = content.split('\n')
lines.slice(350, 420).forEach((line, idx) => {
  console.log(`${351 + idx}: ${line}`)
})
