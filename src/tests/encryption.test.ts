import { describe, test, expect, beforeAll } from 'vitest'
import { encrypt, decrypt, encryptJson, decryptJson } from '@/lib/encryption'

describe('AES-256-GCM Token Encryption Tests', () => {
  beforeAll(() => {
    // Set development key for tests to avoid depending on external env
    process.env.ENCRYPTION_KEY = '0000000000000000000000000000000000000000000000000000000000000000'
  })

  test('encrypt and decrypt should preserve original string', () => {
    const secretToken = 'xoxb-amocrm-secret-token-1234567890'
    const encrypted = encrypt(secretToken)
    expect(encrypted).not.toBe(secretToken)
    expect(encrypted.split(':').length).toBe(3)

    const decrypted = decrypt(encrypted)
    expect(decrypted).toBe(secretToken)
  })

  test('encryptJson and decryptJson should serialize and deserialize correctly', () => {
    const configObj = {
      domain: 'mycompany.amocrm.ru',
      accountId: 123456,
      scopes: ['leads', 'contacts'],
    }

    const encrypted = encryptJson(configObj)
    const decrypted = decryptJson<typeof configObj>(encrypted)

    expect(decrypted.domain).toBe(configObj.domain)
    expect(decrypted.accountId).toBe(configObj.accountId)
    expect(decrypted.scopes).toEqual(configObj.scopes)
  })
})
