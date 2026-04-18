import type { PlanetQualityTier, PlanetStageIndex } from '../types'

export type LayerUpdateInput = {
  dayCount: number
  stageIndex: PlanetStageIndex
  stageProgress: number
  qualityTier: PlanetQualityTier
}

export interface LayerController {
  id: string
  preload(): Promise<void>
  activate(input: LayerUpdateInput): Promise<void> | void
  update(input: LayerUpdateInput): void
  tick?(elapsedMs: number): void
  deactivate(): void
  dispose(): void
}
