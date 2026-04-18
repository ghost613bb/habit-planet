import { describe, expect, it } from 'vitest'

import { habitPlanetManifest } from './habitPlanetManifest'

describe('habitPlanetManifest', () => {
  it('keeps terrain and vegetation active across all growth stages', () => {
    expect(habitPlanetManifest.stages[1].layers).toContain('terrain')
    expect(habitPlanetManifest.stages[4].layers).toContain('vegetation')
  })

  it('adds structure and fx by stage 4', () => {
    expect(habitPlanetManifest.stages[4].heroIds).toEqual(
      expect.arrayContaining(['hut-full', 'windmill', 'rabbit']),
    )
    expect(habitPlanetManifest.stages[4].layers).toContain('fx')
  })
})
