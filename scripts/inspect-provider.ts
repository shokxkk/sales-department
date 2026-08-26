import fs from 'fs'
const content = fs.readFileSync('src/lib/ai/openai.provider.ts', 'utf-8')
const lines = content.split('\n')
console.log('Total lines:', lines.length)
lines.forEach((line, idx) => {
  if (line.includes('async ') || line.includes('AuditAnal')) {
    console.log(`Line ${idx + 1}: ${line}`)
  }
})
