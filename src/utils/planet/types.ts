/**
 * 植被配置
 * 定义了当前阶段各类植物的数量或密度
 */
export type VegetationConfig = {
  grass: number   // 草的数量/密度
  flowers: number // 花的数量/密度
  bushes: number  // 灌木丛的数量/密度
  trees: number   // 树木的数量/密度
}

/**
 * 星球生长阶段定义
 * 根据打卡天数（threshold）来决定星球的植被状态
 */
export type Stage = {
  threshold: number // 达到该阶段所需的天数或进度值
  vegetation: VegetationConfig // 该阶段对应的植被配置
}

export type PlanetStageIndex = 1 | 2 | 3 | 4 | 5 | 6

export type PlanetQualityTier = 'tier-0' | 'tier-1' | 'tier-2'

export type StageRuntimeSnapshot = {
  dayCount: number
  stageIndex: PlanetStageIndex
  stageProgress: number
  isMilestone: boolean
}

export type AssetScope = 'hero' | 'shared' | 'optional-fx'

export type AssetSource =
  | 'existing-reuse'
  | 'required-model'
  | 'procedural-kitbash'
  | 'procedural-fx'

export type AssetDescriptor = {
  id: string
  scope: AssetScope
  stages: PlanetStageIndex[]
  preloadAt: PlanetStageIndex[]
  source: AssetSource
  degradeTo: string | null
}
