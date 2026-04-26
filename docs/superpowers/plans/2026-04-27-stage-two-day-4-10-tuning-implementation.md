# 第二阶段第 4-10 天节奏重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让第二阶段第 4-10 天的植被与地表表现按天平滑增长，避免第 4-7 天集中爆发后第 8-10 天缺少变化。

**Architecture:** 新增一份第 4-10 天共享参数配置，由 `VegetationLayer` 和 `TerrainLayer` 统一查表驱动第二阶段逻辑，替换当前分散在 Layer 内的硬编码分支。测试重点验证第 7-10 天的草簇、树和顶部泛绿按天递进，并保证第 11 天继承第 10 天的地表基底。

**Tech Stack:** TypeScript、Vue、Three.js、Vitest

---

### Task 1: 新增第二阶段按天配置

**Files:**
- Create: `src/utils/planet/config/stageTwoDayTuning.ts`
- Test: `src/utils/planet/layers/stageTwoEarlyVegetation.test.ts`

- [ ] **Step 1: 为配置访问写失败用例**

```ts
import { describe, expect, it } from 'vitest'

import { getStageTwoDay, getStageTwoDayTuning } from '../config/stageTwoDayTuning'

describe('第二阶段逐日配置', () => {
  it('会把第 4-10 天映射为固定的逐日配置', () => {
    expect(getStageTwoDay(4)).toBe(4)
    expect(getStageTwoDay(8.9)).toBe(8)
    expect(getStageTwoDay(10)).toBe(10)
  })

  it('第 8-10 天的草簇和泛绿会继续递进', () => {
    const dayEight = getStageTwoDayTuning(8)
    const dayNine = getStageTwoDayTuning(9)
    const dayTen = getStageTwoDayTuning(10)

    expect(dayEight.vegetation.grassPatchCount).toBe(70)
    expect(dayNine.vegetation.grassPatchCount).toBe(84)
    expect(dayTen.vegetation.grassPatchCount).toBe(98)
    expect(dayEight.terrain.grassOverlay.radius).toBeLessThan(dayNine.terrain.grassOverlay.radius)
    expect(dayNine.terrain.grassOverlay.radius).toBeLessThan(dayTen.terrain.grassOverlay.radius)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm test:run src/utils/planet/layers/stageTwoEarlyVegetation.test.ts`

Expected: FAIL，报错找不到 `../config/stageTwoDayTuning`

- [ ] **Step 3: 写最小配置实现**

```ts
export type StageTwoDay = 4 | 5 | 6 | 7 | 8 | 9 | 10

export type StageTwoVegetationTuning = {
  grassPatchCount: number
  bushCount: number
  treeCount: number
  treeScaleSet: [number, number, number]
  grassPatchScale: number
  bushScale: number
}

export type StageTwoTerrainTuning = {
  grassOverlay: {
    strength: number
    radius: number
    feather: number
    topStart: number
    topEnd: number
    irregularity: number
    color: string
  }
  rockCount: number
  groundTint: string
}

export type StageTwoDayTuning = {
  vegetation: StageTwoVegetationTuning
  terrain: StageTwoTerrainTuning
}

export const STAGE_TWO_DAY_TUNING: Record<StageTwoDay, StageTwoDayTuning> = {
  4: {
    vegetation: {
      grassPatchCount: 26,
      bushCount: 2,
      treeCount: 0,
      treeScaleSet: [0.78, 0.74, 0.72],
      grassPatchScale: 0.505,
      bushScale: 1.18,
    },
    terrain: {
      grassOverlay: {
        strength: 0.9,
        radius: 1.92,
        feather: 0.78,
        topStart: 0.3,
        topEnd: 0.9,
        irregularity: 0.1,
        color: '#4b8534',
      },
      rockCount: 5,
      groundTint: '#6f7d52',
    },
  },
  5: {
    vegetation: {
      grassPatchCount: 36,
      bushCount: 3,
      treeCount: 1,
      treeScaleSet: [0.82, 0.76, 0.72],
      grassPatchScale: 0.515,
      bushScale: 1.22,
    },
    terrain: {
      grassOverlay: {
        strength: 0.92,
        radius: 2.08,
        feather: 0.86,
        topStart: 0.24,
        topEnd: 0.9,
        irregularity: 0.105,
        color: '#4b8534',
      },
      rockCount: 6,
      groundTint: '#748357',
    },
  },
  6: {
    vegetation: {
      grassPatchCount: 46,
      bushCount: 4,
      treeCount: 1,
      treeScaleSet: [0.9, 0.78, 0.74],
      grassPatchScale: 0.525,
      bushScale: 1.26,
    },
    terrain: {
      grassOverlay: {
        strength: 0.93,
        radius: 2.22,
        feather: 0.92,
        topStart: 0.2,
        topEnd: 0.88,
        irregularity: 0.115,
        color: '#4b8534',
      },
      rockCount: 7,
      groundTint: '#79895c',
    },
  },
  7: {
    vegetation: {
      grassPatchCount: 58,
      bushCount: 4,
      treeCount: 2,
      treeScaleSet: [0.96, 0.82, 0.76],
      grassPatchScale: 0.535,
      bushScale: 1.28,
    },
    terrain: {
      grassOverlay: {
        strength: 0.94,
        radius: 2.34,
        feather: 0.98,
        topStart: 0.16,
        topEnd: 0.88,
        irregularity: 0.125,
        color: '#4b8534',
      },
      rockCount: 7,
      groundTint: '#7d8f60',
    },
  },
  8: {
    vegetation: {
      grassPatchCount: 70,
      bushCount: 5,
      treeCount: 2,
      treeScaleSet: [1, 0.88, 0.78],
      grassPatchScale: 0.545,
      bushScale: 1.32,
    },
    terrain: {
      grassOverlay: {
        strength: 0.95,
        radius: 2.44,
        feather: 1.02,
        topStart: 0.12,
        topEnd: 0.88,
        irregularity: 0.13,
        color: '#4b8534',
      },
      rockCount: 7,
      groundTint: '#809562',
    },
  },
  9: {
    vegetation: {
      grassPatchCount: 84,
      bushCount: 5,
      treeCount: 3,
      treeScaleSet: [1.04, 0.94, 0.82],
      grassPatchScale: 0.555,
      bushScale: 1.34,
    },
    terrain: {
      grassOverlay: {
        strength: 0.96,
        radius: 2.52,
        feather: 1.06,
        topStart: 0.09,
        topEnd: 0.88,
        irregularity: 0.138,
        color: '#4b8534',
      },
      rockCount: 7,
      groundTint: '#849a65',
    },
  },
  10: {
    vegetation: {
      grassPatchCount: 98,
      bushCount: 5,
      treeCount: 3,
      treeScaleSet: [1.08, 1, 0.9],
      grassPatchScale: 0.565,
      bushScale: 1.36,
    },
    terrain: {
      grassOverlay: {
        strength: 0.97,
        radius: 2.6,
        feather: 1.1,
        topStart: 0.06,
        topEnd: 0.88,
        irregularity: 0.145,
        color: '#4b8534',
      },
      rockCount: 7,
      groundTint: '#86a95d',
    },
  },
}

export function getStageTwoDay(dayCount: number): StageTwoDay {
  const safeDay = Math.max(4, Math.min(10, Math.floor(dayCount)))
  return safeDay as StageTwoDay
}

export function getStageTwoDayTuning(dayCount: number): StageTwoDayTuning {
  return STAGE_TWO_DAY_TUNING[getStageTwoDay(dayCount)]
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm test:run src/utils/planet/layers/stageTwoEarlyVegetation.test.ts`

Expected: PASS，新增的配置测试通过

- [ ] **Step 5: 提交**

```bash
git add src/utils/planet/config/stageTwoDayTuning.ts src/utils/planet/layers/stageTwoEarlyVegetation.test.ts
git commit -m "feat: 增加第二阶段逐日节奏配置"
```

### Task 2: 改造 VegetationLayer 为按天查表

**Files:**
- Modify: `src/utils/planet/layers/VegetationLayer.ts`
- Test: `src/utils/planet/layers/stageTwoEarlyVegetation.test.ts`

- [ ] **Step 1: 为第 7-10 天植被节奏写失败用例**

```ts
it('第 7-10 天草簇数量按天增长，第 9 天才出现第 3 棵树', async () => {
  const parentGroup = new Group()
  const vegetationLayer = new VegetationLayer({
    parentGroup,
    planetRadius: 3,
  })

  const getVisibleTreeCount = () =>
    ((vegetationLayer as any).trees as Object3D[]).filter((item) => item.visible).length
  const getVisibleGrassPatchCount = () =>
    ((vegetationLayer as any).grassPatches as Object3D[]).filter((item) => item.visible).length

  vegetationLayer.update({ dayCount: 7, stageIndex: 2 as const, stageProgress: 0.5, qualityTier: 'tier-1' as const })
  await vegetationLayer.preload()
  expect(getVisibleGrassPatchCount()).toBe(58)
  expect(getVisibleTreeCount()).toBe(2)

  vegetationLayer.update({ dayCount: 8, stageIndex: 2 as const, stageProgress: 0.6, qualityTier: 'tier-1' as const })
  expect(getVisibleGrassPatchCount()).toBe(70)
  expect(getVisibleTreeCount()).toBe(2)

  vegetationLayer.update({ dayCount: 9, stageIndex: 2 as const, stageProgress: 0.8, qualityTier: 'tier-1' as const })
  expect(getVisibleGrassPatchCount()).toBe(84)
  expect(getVisibleTreeCount()).toBe(3)

  vegetationLayer.update({ dayCount: 10, stageIndex: 2 as const, stageProgress: 1, qualityTier: 'tier-1' as const })
  expect(getVisibleGrassPatchCount()).toBe(98)
  expect(getVisibleTreeCount()).toBe(3)
})
```

- [ ] **Step 2: 运行目标测试确认失败**

Run: `pnpm test:run src/utils/planet/layers/stageTwoEarlyVegetation.test.ts`

Expected: FAIL，当前实现仍返回第 7-10 天统一的 `98` 个草簇和 `3` 棵树

- [ ] **Step 3: 写最小实现替换硬编码分支**

```ts
import { getStageTwoDay, getStageTwoDayTuning } from '../config/stageTwoDayTuning'

const stageTwoDay = input.stageIndex === 2 ? getStageTwoDay(input.dayCount) : null
const stageTwoTuning = stageTwoDay != null ? getStageTwoDayTuning(stageTwoDay).vegetation : null

const stageTwoGrassPatchCount = stageTwoTuning?.grassPatchCount ?? 0
const totalVisibleGrassPatchCount =
  stageTwoDay == null ? stageOneGrassPatchCount : stageTwoGrassPatchCount

const unifiedGrassPatchScale =
  stageOneDay != null && stageOneDay >= 2
    ? 0.3 * GRASS_PATCH_SCALE_BOOST
    : stageTwoTuning?.grassPatchScale ?? null

const visibleTreeCount =
  input.stageIndex === 1 ? 0 : stageTwoTuning?.treeCount ?? 0

const visibleBushCount =
  input.stageIndex === 1
    ? 0
    : stageTwoTuning?.bushCount ?? (2 + Math.round(input.stageProgress * 2))

for (let i = 0; i < this.bushes.length; i += 1) {
  const bush = this.bushes[i]
  if (!bush) continue
  bush.visible = i < visibleBushCount
  bush.scale.setScalar(
    stageTwoTuning != null
      ? stageTwoTuning.bushScale
      : (0.75 + input.stageProgress * 0.25) * BUSH_SCALE_BOOST,
  )
}

for (let i = 0; i < this.trees.length; i += 1) {
  const tree = this.trees[i]
  if (!tree) continue
  tree.visible = i < visibleTreeCount
  tree.scale.setScalar(
    stageTwoTuning != null
      ? stageTwoTuning.treeScaleSet[i] ?? 1
      : 0.7 + input.stageProgress * 0.3,
  )
}
```

- [ ] **Step 4: 运行植被测试确认通过**

Run: `pnpm test:run src/utils/planet/layers/stageTwoEarlyVegetation.test.ts src/utils/planet/layers/stageOneGrounding.test.ts`

Expected: PASS，第 7-10 天草簇与树数量按表驱动，旧的阶段 1/2 测试不回归

- [ ] **Step 5: 提交**

```bash
git add src/utils/planet/layers/VegetationLayer.ts src/utils/planet/layers/stageTwoEarlyVegetation.test.ts
git commit -m "feat: 调整第二阶段植被逐日节奏"
```

### Task 3: 改造 TerrainLayer 为按天查表

**Files:**
- Modify: `src/utils/planet/layers/TerrainLayer.ts`
- Test: `src/utils/planet/layers/stageOneGrounding.test.ts`
- Test: `src/utils/planet/layers/stageTwoEarlyVegetation.test.ts`

- [ ] **Step 1: 为第 8-10 天顶部泛绿递进写失败用例**

```ts
it('第 8-10 天顶部泛绿继续递进，并在第 11 天继承第 10 天结果', () => {
  resetPlanetGrassOverlay()
  const parentGroup = new Group()
  const grassMesh = new Mesh(
    new SphereGeometry(3.05, 16, 16),
    new MeshLambertMaterial({ color: '#6b7045' }),
  )
  const terrainLayer = new TerrainLayer({
    parentGroup,
    grassMesh,
    planetRadius: 3,
  })

  terrainLayer.update({ dayCount: 8, stageIndex: 2 as const, stageProgress: 0.6, qualityTier: 'tier-1' as const })
  const dayEightOverlay = getPlanetGrassOverlayState()

  terrainLayer.update({ dayCount: 9, stageIndex: 2 as const, stageProgress: 0.8, qualityTier: 'tier-1' as const })
  const dayNineOverlay = getPlanetGrassOverlayState()

  terrainLayer.update({ dayCount: 10, stageIndex: 2 as const, stageProgress: 1, qualityTier: 'tier-1' as const })
  const dayTenOverlay = getPlanetGrassOverlayState()

  terrainLayer.update({ dayCount: 11, stageIndex: 3 as const, stageProgress: 0, qualityTier: 'tier-1' as const })
  const dayElevenOverlay = getPlanetGrassOverlayState()

  expect(dayEightOverlay.radius).toBeLessThan(dayNineOverlay.radius)
  expect(dayNineOverlay.radius).toBeLessThan(dayTenOverlay.radius)
  expect(dayEightOverlay.topStart).toBeGreaterThan(dayNineOverlay.topStart)
  expect(dayNineOverlay.topStart).toBeGreaterThan(dayTenOverlay.topStart)
  expect(dayElevenOverlay).toEqual(dayTenOverlay)
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm test:run src/utils/planet/layers/stageOneGrounding.test.ts src/utils/planet/layers/stageTwoEarlyVegetation.test.ts`

Expected: FAIL，当前第 8-10 天 overlay 仍沿用同一组参数

- [ ] **Step 3: 写最小实现替换第二阶段地表硬编码**

```ts
import { STAGE_TWO_DAY_TUNING, getStageTwoDay, getStageTwoDayTuning } from '../config/stageTwoDayTuning'

const stageTwoDay = input.stageIndex === 2 ? getStageTwoDay(input.dayCount) : null
const stageTwoTuning = stageTwoDay != null ? getStageTwoDayTuning(stageTwoDay).terrain : null
const persistedStageTwoTerrain = STAGE_TWO_DAY_TUNING[10].terrain

if (stageTwoTuning != null) {
  setPlanetGrassOverlay(stageTwoTuning.grassOverlay)
} else if (input.stageIndex >= 3) {
  setPlanetGrassOverlay(persistedStageTwoTerrain.grassOverlay)
} else {
  resetPlanetGrassOverlay()
}

grassMaterial.color.set(
  stageTwoTuning?.groundTint ??
    (input.stageIndex >= 5 ? '#86a95d' : input.stageIndex >= 3 ? '#7e9460' : '#6b7045'),
)

if (stageTwoTuning != null) {
  this.rocks.visible = true
  this.rocks.count = stageTwoTuning.rockCount
  return
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm test:run src/utils/planet/layers/stageOneGrounding.test.ts src/utils/planet/layers/stageTwoEarlyVegetation.test.ts`

Expected: PASS，第 8-10 天 overlay 逐日递进，第 11 天继承第 10 天结果

- [ ] **Step 5: 提交**

```bash
git add src/utils/planet/layers/TerrainLayer.ts src/utils/planet/layers/stageOneGrounding.test.ts src/utils/planet/layers/stageTwoEarlyVegetation.test.ts
git commit -m "feat: 调整第二阶段地表逐日节奏"
```

### Task 4: 全量回归与收尾

**Files:**
- Modify: `src/utils/planet/layers/stageOneGrounding.test.ts`
- Modify: `src/utils/planet/layers/stageTwoEarlyVegetation.test.ts`

- [ ] **Step 1: 补齐最终断言并检查诊断**

```ts
expect(getVisibleGrassPatchCount()).toBe(98)
expect(getVisibleTreeCount()).toBe(3)
expect(stageThreeOverlay).toEqual(dayTenOverlay)
```

- [ ] **Step 2: 运行类型和目标测试**

Run: `pnpm test:run src/utils/planet/layers/stageOneGrounding.test.ts src/utils/planet/layers/stageTwoEarlyVegetation.test.ts`

Expected: PASS，两个测试文件全部通过

Run: `pnpm build`

Expected: PASS，`vue-tsc --build` 和 `vite build` 完成

- [ ] **Step 3: 检查诊断并整理差异**

Run: `git diff -- src/utils/planet/config/stageTwoDayTuning.ts src/utils/planet/layers/VegetationLayer.ts src/utils/planet/layers/TerrainLayer.ts src/utils/planet/layers/stageOneGrounding.test.ts src/utils/planet/layers/stageTwoEarlyVegetation.test.ts`

Expected: 只包含第二阶段逐日节奏相关改动

- [ ] **Step 4: 最终提交**

```bash
git add src/utils/planet/config/stageTwoDayTuning.ts src/utils/planet/layers/VegetationLayer.ts src/utils/planet/layers/TerrainLayer.ts src/utils/planet/layers/stageOneGrounding.test.ts src/utils/planet/layers/stageTwoEarlyVegetation.test.ts
git commit -m "feat: 重构第二阶段逐日生长节奏"
```
