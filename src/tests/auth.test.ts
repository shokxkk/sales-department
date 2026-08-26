import { describe, test, expect } from 'vitest'
import { UserRole } from '@prisma/client'
import { hasMinRole } from '@/lib/auth/server'

describe('Role Authorization Tests', () => {
  test('hasMinRole returns correct results based on role hierarchy', () => {
    // SUPER_ADMIN has access to everything
    expect(hasMinRole(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN)).toBe(true)
    expect(hasMinRole(UserRole.SUPER_ADMIN, UserRole.OWNER)).toBe(true)
    expect(hasMinRole(UserRole.SUPER_ADMIN, UserRole.SALES_DIRECTOR)).toBe(true)
    expect(hasMinRole(UserRole.SUPER_ADMIN, UserRole.QUALITY_CONTROL)).toBe(true)

    // COMPANY_ADMIN has access to OWNER, SALES_DIRECTOR, QUALITY_CONTROL, but not SUPER_ADMIN
    expect(hasMinRole(UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN)).toBe(false)
    expect(hasMinRole(UserRole.COMPANY_ADMIN, UserRole.OWNER)).toBe(true)
    expect(hasMinRole(UserRole.COMPANY_ADMIN, UserRole.QUALITY_CONTROL)).toBe(true)

    // QUALITY_CONTROL does not have access to higher roles
    expect(hasMinRole(UserRole.QUALITY_CONTROL, UserRole.SUPER_ADMIN)).toBe(false)
    expect(hasMinRole(UserRole.QUALITY_CONTROL, UserRole.COMPANY_ADMIN)).toBe(false)
    expect(hasMinRole(UserRole.QUALITY_CONTROL, UserRole.OWNER)).toBe(false)
    expect(hasMinRole(UserRole.QUALITY_CONTROL, UserRole.QUALITY_CONTROL)).toBe(true)
  })
})
