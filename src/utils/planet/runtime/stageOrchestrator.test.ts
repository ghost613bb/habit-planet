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

    orchestrator.update(4)
    orchestrator.update(5)

    expect(controller.applySnapshot).toHaveBeenLastCalledWith(
      expect.objectContaining({ stageIndex: 2 }),
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

    orchestrator.update(3)
    orchestrator.update(4)

    expect(controller.playMilestoneTransition).toHaveBeenCalledTimes(1)
  })

  it('keeps visuals fixed at day five after day 6', () => {
    const controller = {
      applySnapshot: vi.fn(),
      playMilestoneTransition: vi.fn(),
      jumpToSnapshot: vi.fn(),
    }
    const orchestrator = createStageOrchestrator(controller)

    orchestrator.update(5)
    orchestrator.update(6)

    expect(controller.playMilestoneTransition).not.toHaveBeenCalled()
    expect(controller.applySnapshot).toHaveBeenLastCalledWith(
      expect.objectContaining({
        dayCount: 5,
        stageIndex: 2,
        stageProgress: 0.1667,
      }),
    )
  })
})
