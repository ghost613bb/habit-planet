import { describe, expect, it, vi } from 'vitest'

import { createStageOrchestrator } from './stageOrchestrator'

describe('stageOrchestrator', () => {
  it('marks N to N+1 inside same stage as incremental', () => {
    const controller = {
      applySnapshot: vi.fn(),
      playMilestoneTransition: vi.fn(),
      jumpToSnapshot: vi.fn(),
    }
    const orchestrator = createStageOrchestrator(controller)

    orchestrator.update(12)
    orchestrator.update(13)

    expect(controller.applySnapshot).toHaveBeenLastCalledWith(
      expect.objectContaining({ stageIndex: 3 }),
    )
    expect(controller.playMilestoneTransition).not.toHaveBeenCalled()
  })

  it('plays milestone transition when crossing 21 to 22', () => {
    const controller = {
      applySnapshot: vi.fn(),
      playMilestoneTransition: vi.fn(),
      jumpToSnapshot: vi.fn(),
    }
    const orchestrator = createStageOrchestrator(controller)

    orchestrator.update(21)
    orchestrator.update(22)

    expect(controller.playMilestoneTransition).toHaveBeenCalledTimes(1)
  })
})
