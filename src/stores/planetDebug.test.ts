import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { usePlanetDebugStore } from './planetDebug'

describe('usePlanetDebugStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('keeps advanced area closed by default', () => {
    const store = usePlanetDebugStore()
    expect(store.advancedOpen).toBe(false)
    expect(store.qualityTierLabel).toBe('tier-1')
  })

  it('clamps custom day count into positive integers', () => {
    const store = usePlanetDebugStore()
    store.setCustomDayCount(-4)
    expect(store.customDayCount).toBe(1)

    store.setCustomDayCount(46.7)
    expect(store.customDayCount).toBe(46)
  })
})
