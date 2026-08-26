import fs from 'fs'

const content = fs.readFileSync('src/lib/ai/openai.provider.ts', 'utf-8')
const lines = content.split('\n')
console.log('Total lines:', lines.length)
console.log('\n--- Lines 240 to 330 ---')
lines.slice(239, 330).forEach((line, idx) => {
  console.log(`${240 + idx}: ${line}`)
})
