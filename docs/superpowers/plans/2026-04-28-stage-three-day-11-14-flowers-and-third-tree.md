# 第三阶段第 11-14 天：第三棵树与花丛 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在第 11-14 天（stageIndex=3）继续沿用第 10 天的植被基底，并新增第 3 棵树与花丛（1/2/3/4 丛），第 15 天起继续保留花丛（逐日累积）。

**Architecture:** 扩展 `VegetationLayer` 以支持 `stageIndex === 3` 的植被更新逻辑；新增 `stageThreeDayTuning` 配置表驱动第 11-14 天花丛数量和第三棵树缩放；花丛使用已实现的 `FlowerBush` 资产（程序化模板 + 实例）。

**Tech Stack:** TypeScript、Three.js、Vitest

---

### Task 1: 新增第三阶段逐日配置（11-14）

**Files:**
- Create: `src/utils/planet/config/stageThreeDayTuning.ts`
- Test: `src/utils/planet/config/stageThreeDayTuning.test.ts`

- [ ] **Step 1: 写失败用例（配置映射）**

```ts
import { describe, expect, it } from 'vitest'
import { getStageThreeDay, getStageThreeDayTuning } from './stageThreeDayTuning'

describe('第三阶段逐日配置', () => {
  it('会把第 11-21 天映射为合法天数', () => {
    expect(getStageThreeDay(11)).toBe(11)
    expect(getStageThreeDay(14.9)).toBe(14)
    expect(getStageThreeDay(21)).toBe(21)
  })

  it('第 11-14 天花丛数量为 1/2/3/4，且第 15 天起保持 4', () => {
    expect(getStageThreeDayTuning(11).flowerBushCount).toBe(1)
    expect(getStageThreeDayTuning(12).flowerBushCount).toBe(2)
    expect(getStageThreeDayTuning(13).flowerBushCount).toBe(3)
    expect(getStageThreeDayTuning(14).flowerBushCount).toBe(4)
    expect(getStageThreeDayTuning(15).flowerBushCount).toBe(4)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm run test:run -- src/utils/planet/config/stageThreeDayTuning.test.ts`

Expected: FAIL，找不到模块

- [ ] **Step 3: 最小实现配置**

```ts
export type StageThreeDay = 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21

export type StageThreeDayTuning = {
  flowerBushCount: number
  thirdTreeScale: number
}

const FLOWER_COUNTS_BY_DAY: Record<11 | 12 | 13 | 14, number> = {
  11: 1,
  12: 2,
  13: 3,
  14: 4,
}

export function getStageThreeDay(dayCount: number): StageThreeDay {
  const safeDay = Math.max(11, Math.min(21, Math.floor(dayCount)))
  return safeDay as StageThreeDay
}

export function getStageThreeDayTuning(dayCount: number): StageThreeDayTuning {
  const day = getStageThreeDay(dayCount)
  const flowerBushCount = day <= 14 ? FLOWER_COUNTS_BY_DAY[day as 11 | 12 | 13 | 14] : 4
  // 第三棵树在 11-14 天逐渐长大，之后保持 1
  const thirdTreeScale = day <= 14 ? 0.82 + (day - 11) * 0.06 : 1
  return { flowerBushCount, thirdTreeScale }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm run test:run -- src/utils/planet/config/stageThreeDayTuning.test.ts`

Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/utils/planet/config/stageThreeDayTuning.ts src/utils/planet/config/stageThreeDayTuning.test.ts
git commit -m "feat: 增加第三阶段逐日配置"
```

### Task 2: 改造 VegetationLayer 支持 stageIndex=3，并接入 FlowerBush

**Files:**
- Modify: `src/utils/planet/layers/VegetationLayer.ts`
- Test: `src/utils/planet/layers/stageThreeEarlyGrowth.test.ts`

- [ ] **Step 1: 写失败用例（11-14 天第三棵树 + 花丛）**

Create `src/utils/planet/layers/stageThreeEarlyGrowth.test.ts`:

```ts
import { Group, Object3D } from 'three'
import { describe, expect, it } from 'vitest'

import { VegetationLayer } from './VegetationLayer'

describe('阶段 3 早期（第 11-14 天）', () => {
  it('第 11-14 天出现第 3 棵树，并新增 1/2/3/4 丛花丛', async () => {
    const parentGroup = new Group()
    const vegetationLayer = new VegetationLayer({
      parentGroup,
      planetRadius: 3,
    })

    const getVisibleTreeCount = () =>
      ((vegetationLayer as any).trees as Object3D[]).filter((item) => item.visible).length
    const getVisibleFlowerCount = () =>
      ((vegetationLayer as any).flowerBushes as Object3D[]).filter((item) => item.visible).length

    vegetationLayer.update({ dayCount: 11, stageIndex: 3 as const, stageProgress: 0, qualityTier: 'tier-1' as const })
    await vegetationLayer.preload()
    expect(getVisibleTreeCount()).toBe(3)
    expect(getVisibleFlowerCount()).toBe(1)

    vegetationLayer.update({ dayCount: 12, stageIndex: 3 as const, stageProgress: 0.2, qualityTier: 'tier-1' as const })
    expect(getVisibleTreeCount()).toBe(3)
    expect(getVisibleFlowerCount()).toBe(2)

    vegetationLayer.update({ dayCount: 13, stageIndex: 3 as const, stageProgress: 0.5, qualityTier: 'tier-1' as const })
    expect(getVisibleFlowerCount()).toBe(3)

    vegetationLayer.update({ dayCount: 14, stageIndex: 3 as const, stageProgress: 1, qualityTier: 'tier-1' as const })
    expect(getVisibleFlowerCount()).toBe(4)
  })

  it('第 15 天起继续保留 4 丛花丛（逐日累积）', async () => {
    const parentGroup = new Group()
    const vegetationLayer = new VegetationLayer({
      parentGroup,
      planetRadius: 3,
    })

    vegetationLayer.update({ dayCount: 15, stageIndex: 3 as const, stageProgress: 0, qualityTier: 'tier-1' as const })
    await vegetationLayer.preload()

    const flowerBushes = (vegetationLayer as any).flowerBushes as Object3D[]
    expect(flowerBushes.filter((item) => item.visible).length).toBe(4)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm run test:run -- src/utils/planet/layers/stageThreeEarlyGrowth.test.ts`

Expected: FAIL，当前 stageIndex=3 直接 return，且不存在 flowerBushes

- [ ] **Step 3: 实现最小改造**

要点：
- 移除 `isLegacyStage = input.stageIndex >= 3` 的直接 return
- `stageIndex === 3` 时：
  - 基底沿用 `getStageTwoDayTuning(10).vegetation`
  - 追加：第三棵树（`trees[2]`）可见且按 `stageThreeDayTuning.thirdTreeScale` 缩放
  - 新增 `flowerBushes: Group[]`，并在首次需要时懒加载 `preloadFlowerBushTemplate()`
  - 花丛数量按 `stageThreeDayTuning.flowerBushCount` 显示前 N 个
  - 花丛实例使用 `createFlowerBushInstance({ targetHeight, rotationY, paletteVariant })`

- [ ] **Step 4: 运行阶段 3 测试与回归测试**

Run: `npm run test:run -- src/utils/planet/layers/stageThreeEarlyGrowth.test.ts src/utils/planet/layers/stageTwoEarlyVegetation.test.ts src/utils/planet/layers/stageOneGrounding.test.ts`

Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/utils/planet/layers/VegetationLayer.ts src/utils/planet/layers/stageThreeEarlyGrowth.test.ts
git commit -m "feat: 第11到第14天新增花丛与第三棵树"
```

### Task 3: 本地验证（可选）

**Files:**
- None

- [ ] **Step 1: 启动开发服务器并手动切天数观察**

Run: `npm run dev`

Expected: 可通过调试面板把天数切到 11-14 观察花丛数量与第三棵树出现

