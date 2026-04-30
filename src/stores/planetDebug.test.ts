import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { usePlanetDebugStore } from './planetDebug'
import {
  CAMPFIRE_SURFACE_PHI,
  CAMPFIRE_SURFACE_THETA,
} from '@/utils/planet/layers/campfirePlacement'

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

  it('keeps campfire debug placement disabled and resettable by default', () => {
    const store = usePlanetDebugStore()

    expect(store.campfireDebugEnabled).toBe(false)
    expect(store.campfireDebugPhi).toBe(CAMPFIRE_SURFACE_PHI)
    expect(store.campfireDebugTheta).toBe(CAMPFIRE_SURFACE_THETA)

    store.setCampfireDebugEnabled(true)
    store.setCampfireDebugPhi(0.42)
    store.setCampfireDebugTheta(1.73)
    store.resetCampfireDebugPlacement()

    expect(store.campfireDebugEnabled).toBe(true)
    expect(store.campfireDebugPhi).toBe(CAMPFIRE_SURFACE_PHI)
    expect(store.campfireDebugTheta).toBe(CAMPFIRE_SURFACE_THETA)
  })

  it('normalizes invalid campfire phi input', () => {
    const store = usePlanetDebugStore()

    store.setCampfireDebugPhi(-10)
    expect(store.campfireDebugPhi).toBeCloseTo(0.01)

    store.setCampfireDebugPhi(Number.NaN)
    expect(store.campfireDebugPhi).toBe(CAMPFIRE_SURFACE_PHI)
  })
})
