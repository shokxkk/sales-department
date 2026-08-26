import fs from 'fs'

let env = fs.readFileSync('.env', 'utf-8')

if (env.includes('AI_PROVIDER=')) {
  env = env.replace(/AI_PROVIDER=.*/g, 'AI_PROVIDER=aisha')
} else {
  env += '\nAI_PROVIDER=aisha'
}

if (env.includes('AISHA_API_KEY=')) {
  env = env.replace(/AISHA_API_KEY=.*/g, 'AISHA_API_KEY=kAR40Omw.6U2IOUNNfG1hCrLOLIqVnTPnK0qDzI4y')
} else {
  env += '\nAISHA_API_KEY=kAR40Omw.6U2IOUNNfG1hCrLOLIqVnTPnK0qDzI4y'
}

fs.writeFileSync('.env', env, 'utf-8')
console.log('Updated .env successfully!')
