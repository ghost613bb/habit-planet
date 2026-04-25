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

  it('allows stage six visuals after day 91', () => {
    const controller = {
      applySnapshot: vi.fn(),
      playMilestoneTransition: vi.fn(),
      jumpToSnapshot: vi.fn(),
    }
    const orchestrator = createStageOrchestrator(controller)

    orchestrator.update(90)
    orchestrator.update(91)

    expect(controller.playMilestoneTransition).toHaveBeenCalledTimes(1)
    expect(controller.applySnapshot).toHaveBeenLastCalledWith(
      expect.objectContaining({
        dayCount: 90,
        stageIndex: 5,
      }),
    )
  })
})
