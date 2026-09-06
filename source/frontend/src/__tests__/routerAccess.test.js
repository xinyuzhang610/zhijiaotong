import { beforeEach, describe, expect, it } from 'vitest'
import router from '../router'

describe('tool route access', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('requires authentication without imposing a student-only role', () => {
    const route = router.getRoutes().find(item => item.path === '/tool/:id')

    expect(route?.meta.requiresAuth).toBe(true)
    expect(route?.meta.role).toBeUndefined()
  })

  it.each(['teacher', 'student', 'admin'])('does not redirect an authenticated %s user', async (role) => {
    localStorage.setItem('token', `${role}-token`)
    localStorage.setItem('userRole', role)

    await router.push(`/tool/42?role=${role}`)

    expect(router.currentRoute.value.path).toBe('/tool/42')
  })
})
