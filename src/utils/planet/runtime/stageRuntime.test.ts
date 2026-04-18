import { describe, expect, it } from 'vitest'

import { buildStageSnapshot, getStageIndex } from './stageRuntime'
import { downgradeQualityTier, resolveInitialQualityTier } from './qualityTier'

describe('stageRuntime', () => {
  it('maps dayCount into six stages', () => {
    expect(getStageIndex(1)).toBe(1)
    expect(getStageIndex(4)).toBe(2)
    expect(getStageIndex(11)).toBe(3)
    expect(getStageIndex(22)).toBe(4)
    expect(getStageIndex(46)).toBe(5)
    expect(getStageIndex(91)).toBe(6)
  })

  it('builds stage progress within the current stage window', () => {
    expect(buildStageSnapshot(1).stageProgress).toBe(0)
    expect(buildStageSnapshot(3).stageProgress).toBe(1)
    expect(buildStageSnapshot(30).stageProgress).toBeGreaterThan(0)
  })

  it('downgrades quality after repeated slow frames', () => {
    const initial = resolveInitialQualityTier({ deviceMemory: 2, hardwareConcurrency: 4 })
    expect(initial).toBe('tier-1')
    expect(downgradeQualityTier('tier-1', { avgFrameMs: 42 })).toBe('tier-0')
  })
})
