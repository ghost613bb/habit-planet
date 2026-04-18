# Habit Planet 3D Rendering Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有 Three.js 星球渲染从“阶段类直接堆场景”演进为“分层场景编排 + 资产注册 + 质量档降级 + 轻量走查面板”的可维护实现。

**Architecture:** 先引入纯函数级的阶段运行时、质量档和资源描述，再用 `StageOrchestrator` 逐步接管 `planetRenderer.ts`。渲染层保留 `PlanetRenderer` 宿主职责，场景内容拆到 `LayerController`，并用轻量 Debug Store 和悬浮面板承接开发与联调走查。

**Tech Stack:** Vue 3、Pinia、Three.js、TypeScript、Vitest、Vite、GSAP

---

## File Structure

**Create**
- `src/utils/planet/runtime/stageRuntime.ts`: 统一阶段阈值、阶段快照、阶段内进度计算。
- `src/utils/planet/runtime/qualityTier.ts`: 质量档判定与降级规则。
- `src/utils/planet/runtime/stageRuntime.test.ts`: 阶段阈值、快照和质量档纯函数测试。
- `src/utils/planet/runtime/assetRegistry.ts`: 资源描述、优先级、预加载与释放策略。
- `src/utils/planet/runtime/assetRegistry.test.ts`: 资产清单和释放策略测试。
- `src/utils/planet/layers/contracts.ts`: 各层控制器接口与上下文类型。
- `src/utils/planet/manifests/habitPlanetManifest.ts`: 六阶段 manifest，声明各阶段需要的层、英雄资产、特效级别和机位预设。
- `src/utils/planet/manifests/habitPlanetManifest.test.ts`: manifest 映射与优先级测试。
- `src/utils/planet/runtime/cameraRig.ts`: 半固定机位、用户偏移、回正逻辑。
- `src/utils/planet/runtime/stageOrchestrator.ts`: 比较快照、生成 transition plan、驱动各层。
- `src/utils/planet/runtime/stageOrchestrator.test.ts`: 日常递增、关键阶段切换和调试跳转测试。
- `src/utils/planet/runtime/legacyStageSceneController.ts`: 过渡期适配器，先桥接旧 `StageManager`。
- `src/utils/planet/layers/TerrainLayer.ts`: 星球表面、草地、土路等地形层。
- `src/utils/planet/layers/VegetationLayer.ts`: 幼苗、草花、灌木、小树、主树层。
- `src/utils/planet/layers/StructureLayer.ts`: 木屋、长椅、秋千、风车等建筑层。
- `src/utils/planet/layers/CharacterLayer.ts`: 兔子、鹿、小鸟、蝴蝶等角色层。
- `src/utils/planet/layers/FxLayer.ts`: 篝火发光、窗户发光、能量光轨等特效层。
- `src/utils/planet/layers/FinaleLayer.ts`: 阶段 6 的生命树、祝贺光环和星尘层。
- `src/stores/planetDebug.ts`: 走查面板状态与本地覆盖输入。
- `src/stores/planetDebug.test.ts`: 走查模式切换和覆盖值测试。
- `src/components/PlanetDebugPanel.vue`: 轻量悬浮走查面板。

**Modify**
- `src/utils/planetRenderer.ts`: 从大一统场景脚本收敛为渲染宿主 + orchestrator 入口。
- `src/components/PlanetCanvas.vue`: 将调试状态和渲染器新接口连通。
- `src/pages/DemoHome.vue`: 接入走查面板与显示逻辑。
- `src/stores/growth.ts`: 与走查模式联动，支持真实值和本地覆盖值共存。
- `src/utils/planet/core/Lights.ts`: 抽出可插值灯光预设。
- `src/utils/planet/types.ts`: 与 manifest/层控制器共用的基础类型。
- `src/utils/planet/stages/index.ts`: 仅在迁移阶段被 `legacyStageSceneController.ts` 引用。

**Tests**
- `src/utils/planet/runtime/stageRuntime.test.ts`
- `src/utils/planet/runtime/assetRegistry.test.ts`
- `src/utils/planet/manifests/habitPlanetManifest.test.ts`
- `src/utils/planet/runtime/stageOrchestrator.test.ts`
- `src/stores/planetDebug.test.ts`
- `src/stores/growth.test.ts`

### Task 1: 阶段运行时与质量档基础

**Files:**
- Create: `src/utils/planet/runtime/stageRuntime.ts`
- Create: `src/utils/planet/runtime/qualityTier.ts`
- Create: `src/utils/planet/runtime/stageRuntime.test.ts`
- Modify: `src/utils/planet/types.ts`

- [ ] **Step 1: 写失败测试，锁定阶段阈值、阶段内进度和质量档规则**

```ts
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
```

- [ ] **Step 2: 运行测试，确认当前实现还不存在**

Run: `pnpm test:run -- src/utils/planet/runtime/stageRuntime.test.ts`

Expected: FAIL with `Cannot find module './stageRuntime'` or `Cannot find module './qualityTier'`

- [ ] **Step 3: 写最小实现，统一阶段阈值和快照计算**

```ts
export const STAGE_WINDOWS = [
  { stageIndex: 1, minDay: 1, maxDay: 3 },
  { stageIndex: 2, minDay: 4, maxDay: 10 },
  { stageIndex: 3, minDay: 11, maxDay: 21 },
  { stageIndex: 4, minDay: 22, maxDay: 45 },
  { stageIndex: 5, minDay: 46, maxDay: 90 },
  { stageIndex: 6, minDay: 91, maxDay: Number.POSITIVE_INFINITY },
] as const

export function getStageIndex(dayCount: number): number {
  const safeDay = Math.max(1, Math.floor(dayCount))
  return STAGE_WINDOWS.find((item) => safeDay >= item.minDay && safeDay <= item.maxDay)?.stageIndex ?? 1
}

export function buildStageSnapshot(dayCount: number) {
  const stageIndex = getStageIndex(dayCount)
  const current = STAGE_WINDOWS.find((item) => item.stageIndex === stageIndex)!
  const boundedMax = Number.isFinite(current.maxDay) ? current.maxDay : current.minDay + 1
  const span = Math.max(1, boundedMax - current.minDay)
  const clampedDay = Math.min(Math.max(Math.floor(dayCount), current.minDay), boundedMax)
  const stageProgress = current.maxDay === Number.POSITIVE_INFINITY ? 1 : (clampedDay - current.minDay) / span

  return {
    dayCount: Math.max(1, Math.floor(dayCount)),
    stageIndex,
    stageProgress: Number(stageProgress.toFixed(4)),
    isMilestone: [4, 11, 22, 46, 91].includes(Math.max(1, Math.floor(dayCount))),
  }
}
```

- [ ] **Step 4: 写最小实现，定义质量档和降级规则**

```ts
export type QualityTier = 'tier-0' | 'tier-1' | 'tier-2'

export function resolveInitialQualityTier(input: { deviceMemory?: number; hardwareConcurrency?: number }): QualityTier {
  if ((input.deviceMemory ?? 0) >= 6 && (input.hardwareConcurrency ?? 0) >= 8) return 'tier-2'
  if ((input.deviceMemory ?? 0) >= 2) return 'tier-1'
  return 'tier-0'
}

export function downgradeQualityTier(current: QualityTier, metrics: { avgFrameMs: number }): QualityTier {
  if (metrics.avgFrameMs < 34) return current
  if (current === 'tier-2') return 'tier-1'
  return 'tier-0'
}
```

- [ ] **Step 5: 统一基础类型，避免后续模块重复定义**

```ts
export type PlanetStageIndex = 1 | 2 | 3 | 4 | 5 | 6
export type PlanetQualityTier = 'tier-0' | 'tier-1' | 'tier-2'

export type StageRuntimeSnapshot = {
  dayCount: number
  stageIndex: PlanetStageIndex
  stageProgress: number
  isMilestone: boolean
}
```

- [ ] **Step 6: 运行测试，确认运行时基础稳定**

Run: `pnpm test:run -- src/utils/planet/runtime/stageRuntime.test.ts`

Expected: PASS with `3 passed`

- [ ] **Step 7: 提交**

```bash
git add src/utils/planet/runtime/stageRuntime.ts src/utils/planet/runtime/qualityTier.ts src/utils/planet/runtime/stageRuntime.test.ts src/utils/planet/types.ts
git commit -m "feat: add stage runtime foundations"
```

### Task 2: 资产注册表与阶段 Manifest

**Files:**
- Create: `src/utils/planet/runtime/assetRegistry.ts`
- Create: `src/utils/planet/runtime/assetRegistry.test.ts`
- Create: `src/utils/planet/manifests/habitPlanetManifest.ts`
- Create: `src/utils/planet/manifests/habitPlanetManifest.test.ts`
- Create: `src/utils/planet/layers/contracts.ts`
- Modify: `src/utils/planet/types.ts`

- [ ] **Step 1: 写失败测试，锁定阶段资源清单、预加载集和释放策略**

```ts
import { describe, expect, it } from 'vitest'
import { createAssetRegistry } from './assetRegistry'
import { habitPlanetManifest } from '../manifests/habitPlanetManifest'

describe('assetRegistry', () => {
  it('collects current and next-stage hero assets', () => {
    const registry = createAssetRegistry(habitPlanetManifest.assets)
    expect(registry.getStageAssets(2).heroIds).toContain('campfire')
    expect(registry.getPreloadAssets(2)).toContain('hut-skeleton')
  })

  it('returns releasable optional fx when quality drops', () => {
    const registry = createAssetRegistry(habitPlanetManifest.assets)
    expect(registry.getReleasableAssets({ activeStage: 5, qualityTier: 'tier-0' })).toContain('butterfly-fx')
  })
})
```

- [ ] **Step 2: 运行测试，确认 manifest 与 registry 还不存在**

Run: `pnpm test:run -- src/utils/planet/runtime/assetRegistry.test.ts`

Expected: FAIL with `Cannot find module './assetRegistry'`

- [ ] **Step 3: 定义层控制器契约，先把职责边界锁死**

```ts
export type LayerUpdateInput = {
  dayCount: number
  stageIndex: 1 | 2 | 3 | 4 | 5 | 6
  stageProgress: number
  qualityTier: 'tier-0' | 'tier-1' | 'tier-2'
}

export interface LayerController {
  id: string
  preload(): Promise<void>
  activate(input: LayerUpdateInput): Promise<void> | void
  update(input: LayerUpdateInput): void
  deactivate(): void
  dispose(): void
}
```

- [ ] **Step 4: 写最小 manifest，声明六阶段的层、英雄资产和机位**

```ts
export const habitPlanetManifest = {
  stages: {
    1: { cameraPreset: 'seed', layers: ['terrain', 'vegetation'], heroIds: ['sprout'] },
    2: { cameraPreset: 'campfire', layers: ['terrain', 'vegetation', 'fx'], heroIds: ['campfire'] },
    3: { cameraPreset: 'shelter', layers: ['terrain', 'vegetation', 'structure'], heroIds: ['hut-skeleton'] },
    4: { cameraPreset: 'home', layers: ['terrain', 'vegetation', 'structure', 'character', 'fx'], heroIds: ['hut-full', 'windmill', 'rabbit'] },
    5: { cameraPreset: 'flourish', layers: ['terrain', 'vegetation', 'structure', 'character', 'fx'], heroIds: ['bench', 'swing'] },
    6: { cameraPreset: 'finale', layers: ['terrain', 'vegetation', 'structure', 'character', 'fx', 'finale'], heroIds: ['life-tree'] },
  },
  assets: [
    { id: 'sprout', scope: 'hero', stages: [1], preloadAt: [1], degradeTo: null },
    { id: 'campfire', scope: 'hero', stages: [2], preloadAt: [2], degradeTo: null },
    { id: 'hut-skeleton', scope: 'hero', stages: [3], preloadAt: [2, 3], degradeTo: null },
    { id: 'windmill', scope: 'hero', stages: [4, 5, 6], preloadAt: [4], degradeTo: 'windmill-static' },
    { id: 'butterfly-fx', scope: 'optional-fx', stages: [5], preloadAt: [5], degradeTo: null },
    { id: 'life-tree', scope: 'hero', stages: [6], preloadAt: [5, 6], degradeTo: 'glow-tree-basic' },
  ],
} as const
```

- [ ] **Step 5: 写最小 registry，实现当前阶段、下一阶段和可释放资源查询**

```ts
export function createAssetRegistry(assets: readonly AssetDescriptor[]) {
  return {
    getStageAssets(stageIndex: number) {
      const active = assets.filter((item) => item.stages.includes(stageIndex as never))
      return {
        all: active.map((item) => item.id),
        heroIds: active.filter((item) => item.scope === 'hero').map((item) => item.id),
      }
    },
    getPreloadAssets(stageIndex: number) {
      return assets.filter((item) => item.preloadAt.includes((stageIndex + 1) as never)).map((item) => item.id)
    },
    getReleasableAssets(input: { activeStage: number; qualityTier: 'tier-0' | 'tier-1' | 'tier-2' }) {
      if (input.qualityTier !== 'tier-0') return []
      return assets
        .filter((item) => item.scope === 'optional-fx' && item.stages.includes(input.activeStage as never))
        .map((item) => item.id)
    },
  }
}
```

- [ ] **Step 6: 运行测试，确认资源映射稳定**

Run: `pnpm test:run -- src/utils/planet/runtime/assetRegistry.test.ts src/utils/planet/manifests/habitPlanetManifest.test.ts`

Expected: PASS with `4 passed`

- [ ] **Step 7: 提交**

```bash
git add src/utils/planet/runtime/assetRegistry.ts src/utils/planet/runtime/assetRegistry.test.ts src/utils/planet/manifests/habitPlanetManifest.ts src/utils/planet/manifests/habitPlanetManifest.test.ts src/utils/planet/layers/contracts.ts src/utils/planet/types.ts
git commit -m "feat: add stage manifest and asset registry"
```

### Task 3: 引入 Orchestrator 并桥接现有 Renderer

**Files:**
- Create: `src/utils/planet/runtime/cameraRig.ts`
- Create: `src/utils/planet/runtime/stageOrchestrator.ts`
- Create: `src/utils/planet/runtime/stageOrchestrator.test.ts`
- Create: `src/utils/planet/runtime/legacyStageSceneController.ts`
- Modify: `src/utils/planetRenderer.ts`
- Modify: `src/utils/planet/core/Lights.ts`

- [ ] **Step 1: 写失败测试，锁定三类更新路径**

```ts
import { describe, expect, it, vi } from 'vitest'
import { createStageOrchestrator } from './stageOrchestrator'

describe('stageOrchestrator', () => {
  it('marks N to N+1 inside same stage as incremental', () => {
    const controller = { applySnapshot: vi.fn(), playMilestoneTransition: vi.fn(), jumpToSnapshot: vi.fn() }
    const orchestrator = createStageOrchestrator(controller)
    orchestrator.update(12)
    orchestrator.update(13)
    expect(controller.applySnapshot).toHaveBeenLastCalledWith(expect.objectContaining({ stageIndex: 3 }))
    expect(controller.playMilestoneTransition).not.toHaveBeenCalled()
  })

  it('plays milestone transition when crossing 21 to 22', () => {
    const controller = { applySnapshot: vi.fn(), playMilestoneTransition: vi.fn(), jumpToSnapshot: vi.fn() }
    const orchestrator = createStageOrchestrator(controller)
    orchestrator.update(21)
    orchestrator.update(22)
    expect(controller.playMilestoneTransition).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: 运行测试，确认 orchestrator 尚未接入**

Run: `pnpm test:run -- src/utils/planet/runtime/stageOrchestrator.test.ts`

Expected: FAIL with `Cannot find module './stageOrchestrator'`

- [ ] **Step 3: 实现半固定机位骨架，统一默认机位与用户偏移**

```ts
export function createCameraRig() {
  let preset = { azimuth: 0, polar: 1.1, distance: 12, targetY: 0.4 }
  let userDelta = { azimuth: 0, polar: 0, distance: 0 }

  return {
    setPreset(next: typeof preset) {
      preset = next
    },
    setUserDelta(next: Partial<typeof userDelta>) {
      userDelta = { ...userDelta, ...next }
    },
    resolve() {
      return {
        azimuth: preset.azimuth + userDelta.azimuth,
        polar: preset.polar + userDelta.polar,
        distance: preset.distance + userDelta.distance,
        targetY: preset.targetY,
      }
    },
  }
}
```

- [ ] **Step 4: 实现 orchestrator，先桥接旧 StageManager，避免一次性重写全部场景**

```ts
export function createStageOrchestrator(controller: {
  applySnapshot: (snapshot: StageRuntimeSnapshot) => void
  playMilestoneTransition: (fromSnapshot: StageRuntimeSnapshot, toSnapshot: StageRuntimeSnapshot) => void
  jumpToSnapshot: (snapshot: StageRuntimeSnapshot) => void
}) {
  let current: StageRuntimeSnapshot | null = null

  return {
    update(dayCount: number) {
      const next = buildStageSnapshot(dayCount)
      if (!current) {
        current = next
        controller.applySnapshot(next)
        return
      }

      const sameStage = current.stageIndex === next.stageIndex
      if (sameStage) {
        current = next
        controller.applySnapshot(next)
        return
      }

      controller.playMilestoneTransition(current, next)
      current = next
    },
    jump(dayCount: number) {
      const next = buildStageSnapshot(dayCount)
      current = next
      controller.jumpToSnapshot(next)
    },
  }
}
```

- [ ] **Step 5: 新增旧 StageManager 适配器，把老逻辑藏到过渡层**

```ts
export function createLegacyStageSceneController(stageManager: StageManager) {
  return {
    applySnapshot(snapshot: StageRuntimeSnapshot) {
      stageManager.update(snapshot.dayCount)
    },
    playMilestoneTransition(_fromSnapshot: StageRuntimeSnapshot, toSnapshot: StageRuntimeSnapshot) {
      stageManager.update(toSnapshot.dayCount)
    },
    jumpToSnapshot(snapshot: StageRuntimeSnapshot) {
      stageManager.update(snapshot.dayCount)
    },
  }
}
```

- [ ] **Step 6: 修改 renderer，只保留宿主职责并把更新入口切给 orchestrator**

```ts
const stageManager = new StageManager(scene, planetGroup)
const legacyController = createLegacyStageSceneController(stageManager)
const orchestrator = createStageOrchestrator(legacyController)

return {
  setDayCount(count: number) {
    const oldDayCount = dayCount
    if (Math.floor(count) > Math.floor(oldDayCount)) triggerClickFeedback()
    dayCount = count
    orchestrator.update(dayCount)
  },
  jumpToDayCount(count: number) {
    dayCount = count
    orchestrator.jump(dayCount)
  },
}
```

- [ ] **Step 7: 让灯光接受预设参数，而不是每次阶段切换整套重建**

```ts
export type LightPreset = {
  ambientIntensity: number
  keyIntensity: number
  fireVisible: boolean
  windowGlow: number
}

export function applyLightPreset(lights: PlanetLights, preset: LightPreset) {
  lights.ambient.intensity = preset.ambientIntensity
  lights.sun.intensity = preset.keyIntensity
  lights.fire.visible = preset.fireVisible
  lights.window.material.emissiveIntensity = preset.windowGlow
}
```

- [ ] **Step 8: 运行测试，确认 orchestrator 和 renderer 的桥接稳定**

Run: `pnpm test:run -- src/utils/planet/runtime/stageOrchestrator.test.ts`

Expected: PASS with `2 passed`

- [ ] **Step 9: 提交**

```bash
git add src/utils/planet/runtime/cameraRig.ts src/utils/planet/runtime/stageOrchestrator.ts src/utils/planet/runtime/stageOrchestrator.test.ts src/utils/planet/runtime/legacyStageSceneController.ts src/utils/planetRenderer.ts src/utils/planet/core/Lights.ts
git commit -m "refactor: route renderer updates through stage orchestrator"
```

### Task 4: 落地地形、植被、建筑和基础特效层

**Files:**
- Create: `src/utils/planet/layers/TerrainLayer.ts`
- Create: `src/utils/planet/layers/VegetationLayer.ts`
- Create: `src/utils/planet/layers/StructureLayer.ts`
- Create: `src/utils/planet/layers/FxLayer.ts`
- Modify: `src/utils/planet/manifests/habitPlanetManifest.ts`
- Modify: `src/utils/planet/runtime/stageOrchestrator.ts`
- Modify: `src/utils/planetRenderer.ts`

- [ ] **Step 1: 写失败测试，锁定阶段 1 到阶段 4 的关键元素映射**

```ts
import { describe, expect, it } from 'vitest'
import { habitPlanetManifest } from '../manifests/habitPlanetManifest'

describe('habitPlanetManifest layers', () => {
  it('keeps terrain and vegetation active across all growth stages', () => {
    expect(habitPlanetManifest.stages[1].layers).toContain('terrain')
    expect(habitPlanetManifest.stages[4].layers).toContain('vegetation')
  })

  it('adds structure and fx by stage 4', () => {
    expect(habitPlanetManifest.stages[4].heroIds).toEqual(expect.arrayContaining(['hut-full', 'windmill', 'rabbit']))
    expect(habitPlanetManifest.stages[4].layers).toContain('fx')
  })
})
```

- [ ] **Step 2: 运行测试，确认 manifest 还未覆盖分层能力**

Run: `pnpm test:run -- src/utils/planet/manifests/habitPlanetManifest.test.ts`

Expected: FAIL with missing `terrain`/`structure` assertions

- [ ] **Step 3: 写地形层，先固化星球表面、草地和土路的阶段内插值**

```ts
export class TerrainLayer implements LayerController {
  id = 'terrain'

  activate(input: LayerUpdateInput) {
    this.update(input)
  }

  update(input: LayerUpdateInput) {
    this.grassMesh.visible = input.stageIndex >= 1
    this.grassMesh.scale.setScalar(0.2 + input.stageProgress * 0.8)
    this.pathMesh.visible = input.stageIndex >= 3
    this.pathMaterial.opacity = input.stageIndex >= 3 ? 0.35 + input.stageProgress * 0.45 : 0
  }
}
```

- [ ] **Step 4: 写植被层，优先保证阶段辨识度而不是对象级精细控制**

```ts
export class VegetationLayer implements LayerController {
  id = 'vegetation'

  update(input: LayerUpdateInput) {
    this.setSproutVisible(input.stageIndex === 1)
    this.setBushCount(input.stageIndex >= 2 ? 6 + Math.round(input.stageProgress * 8) : 0)
    this.setTreeCount(input.stageIndex >= 2 ? Math.min(input.stageIndex + 1, 4) : 0)
    this.setFlowerDensity(input.stageIndex >= 3 ? 0.4 + input.stageProgress * 0.5 : 0.15)
    this.setMainTreeMode(input.stageIndex === 6 ? 'life-tree' : 'default-tree')
  }
}
```

- [ ] **Step 5: 写建筑层和基础特效层，覆盖木屋骨架、完整木屋、风车、窗户和光轨**

```ts
export class StructureLayer implements LayerController {
  id = 'structure'

  update(input: LayerUpdateInput) {
    this.hutSkeleton.visible = input.stageIndex === 3
    this.hutFull.visible = input.stageIndex >= 4
    this.windmill.visible = input.stageIndex >= 4
    this.windmillRotorSpeed = input.stageIndex >= 4 ? 0.2 + input.stageProgress * 0.4 : 0
    this.bench.visible = input.stageIndex >= 5
    this.swing.visible = input.stageIndex >= 5
  }
}

export class FxLayer implements LayerController {
  id = 'fx'

  update(input: LayerUpdateInput) {
    this.fireLight.visible = input.stageIndex >= 2
    this.windowGlow.visible = input.stageIndex >= 4
    this.orbitRing.visible = input.stageIndex >= 4
    this.orbitRing.intensity = input.qualityTier === 'tier-0' ? 0.5 : 1
  }
}
```

- [ ] **Step 6: 修改 renderer/orchestrator，优先让阶段 1 到阶段 4 走新分层实现**

```ts
const layers = [
  new TerrainLayer(layerContext),
  new VegetationLayer(layerContext),
  new StructureLayer(layerContext),
  new FxLayer(layerContext),
]

const controller = createLayerSceneController({
  manifest: habitPlanetManifest,
  assetRegistry,
  layers,
})

const orchestrator = createStageOrchestrator(controller)
```

- [ ] **Step 7: 运行测试并做一次基础类型检查**

Run: `pnpm test:run -- src/utils/planet/manifests/habitPlanetManifest.test.ts src/utils/planet/runtime/stageOrchestrator.test.ts`

Expected: PASS with updated stage 1-4 coverage

Run: `pnpm type-check`

Expected: PASS with no TypeScript errors

- [ ] **Step 8: 提交**

```bash
git add src/utils/planet/layers/TerrainLayer.ts src/utils/planet/layers/VegetationLayer.ts src/utils/planet/layers/StructureLayer.ts src/utils/planet/layers/FxLayer.ts src/utils/planet/manifests/habitPlanetManifest.ts src/utils/planet/runtime/stageOrchestrator.ts src/utils/planetRenderer.ts
git commit -m "feat: add layered stage rendering for terrain vegetation and structures"
```

### Task 5: 完成阶段 5/6、角色层与终局降级策略

**Files:**
- Create: `src/utils/planet/layers/CharacterLayer.ts`
- Create: `src/utils/planet/layers/FinaleLayer.ts`
- Modify: `src/utils/planet/manifests/habitPlanetManifest.ts`
- Modify: `src/utils/planet/runtime/assetRegistry.ts`
- Modify: `src/utils/planet/runtime/stageOrchestrator.ts`
- Modify: `src/utils/planetRenderer.ts`

- [ ] **Step 1: 写失败测试，锁定阶段 5/6 的降级规则**

```ts
import { describe, expect, it } from 'vitest'
import { createAssetRegistry } from '../runtime/assetRegistry'
import { habitPlanetManifest } from '../manifests/habitPlanetManifest'

describe('stage 5/6 degradation', () => {
  it('keeps life-tree on tier-0 but releases optional butterflies and stardust', () => {
    const registry = createAssetRegistry(habitPlanetManifest.assets)
    expect(registry.getStageAssets(6).heroIds).toContain('life-tree')
    expect(registry.getReleasableAssets({ activeStage: 6, qualityTier: 'tier-0' })).toEqual(
      expect.arrayContaining(['butterfly-fx', 'stardust-fx'])
    )
  })
})
```

- [ ] **Step 2: 运行测试，确认高阶段降级策略尚未完整**

Run: `pnpm test:run -- src/utils/planet/runtime/assetRegistry.test.ts`

Expected: FAIL with missing stage 6 asset expectations

- [ ] **Step 3: 写角色层，允许低端机把持续飞行动画降级为低频更新**

```ts
export class CharacterLayer implements LayerController {
  id = 'character'

  update(input: LayerUpdateInput) {
    this.rabbit.visible = input.stageIndex >= 4
    this.deer.visible = input.stageIndex >= 6
    this.bird.visible = input.stageIndex >= 5 && input.qualityTier !== 'tier-0'
    this.butterfly.visible = input.stageIndex >= 5 && input.qualityTier === 'tier-2'
    this.flightTickStep = input.qualityTier === 'tier-0' ? 3 : 1
  }
}
```

- [ ] **Step 4: 写终局层，保生命树与终局升级感，把高成本粒子定义成增强项**

```ts
export class FinaleLayer implements LayerController {
  id = 'finale'

  update(input: LayerUpdateInput) {
    const isFinalStage = input.stageIndex === 6
    this.lifeTree.visible = isFinalStage
    this.congratsHalo.visible = isFinalStage
    this.stardust.visible = isFinalStage && input.qualityTier !== 'tier-0'
    this.haloIntensity = isFinalStage ? 0.8 + input.stageProgress * 0.4 : 0
  }
}
```

- [ ] **Step 5: 扩充 manifest 和 registry，明确英雄资产不能被降级移除**

```ts
{ id: 'life-tree', scope: 'hero', stages: [6], preloadAt: [5, 6], degradeTo: 'glow-tree-basic' },
{ id: 'stardust-fx', scope: 'optional-fx', stages: [6], preloadAt: [6], degradeTo: null },
{ id: 'butterfly-fx', scope: 'optional-fx', stages: [5, 6], preloadAt: [5], degradeTo: null },
```

```ts
getReleasableAssets(input) {
  return assets
    .filter((item) => item.scope === 'optional-fx')
    .filter((item) => item.stages.includes(input.activeStage as never))
    .map((item) => item.id)
}
```

- [ ] **Step 6: 让 orchestrator 在慢帧下触发自动降级，并把结果回传给 renderer**

```ts
onFrameMetrics(metrics: { avgFrameMs: number }) {
  qualityTier = downgradeQualityTier(qualityTier, metrics)
  controller.applySnapshot({ ...currentSnapshot, qualityTier })
}
```

- [ ] **Step 7: 运行测试和构建，确认高阶段和降级路径都可用**

Run: `pnpm test:run -- src/utils/planet/runtime/assetRegistry.test.ts src/utils/planet/runtime/stageOrchestrator.test.ts`

Expected: PASS with stage 5/6 degradation cases

Run: `pnpm build`

Expected: PASS with Vite production build completed

- [ ] **Step 8: 提交**

```bash
git add src/utils/planet/layers/CharacterLayer.ts src/utils/planet/layers/FinaleLayer.ts src/utils/planet/manifests/habitPlanetManifest.ts src/utils/planet/runtime/assetRegistry.ts src/utils/planet/runtime/stageOrchestrator.ts src/utils/planetRenderer.ts
git commit -m "feat: add high-stage layers and quality degradation"
```

### Task 6: 轻量 3D 视觉走查面板

**Files:**
- Create: `src/stores/planetDebug.ts`
- Create: `src/stores/planetDebug.test.ts`
- Create: `src/components/PlanetDebugPanel.vue`
- Modify: `src/stores/growth.ts`
- Modify: `src/components/PlanetCanvas.vue`
- Modify: `src/pages/DemoHome.vue`

- [ ] **Step 1: 写失败测试，锁定真实数据跟随和本地覆盖模式**

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { usePlanetDebugStore } from './planetDebug'

describe('planetDebugStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('keeps real mode by default', () => {
    const store = usePlanetDebugStore()
    expect(store.mode).toBe('follow-real')
    expect(store.effectiveDayCount(27)).toBe(27)
  })

  it('uses local override after enabling walkthrough mode', () => {
    const store = usePlanetDebugStore()
    store.enableWalkthrough(46)
    expect(store.effectiveDayCount(3)).toBe(46)
  })
})
```

- [ ] **Step 2: 运行测试，确认走查 store 还不存在**

Run: `pnpm test:run -- src/stores/planetDebug.test.ts`

Expected: FAIL with `Cannot find module './planetDebug'`

- [ ] **Step 3: 写走查 store，封装模式切换、阶段快捷值和恢复真实值**

```ts
export const usePlanetDebugStore = defineStore('planetDebug', {
  state: () => ({
    visible: false,
    mode: 'follow-real' as 'follow-real' | 'local-override',
    overrideDayCount: 1,
    qualityTierLabel: 'tier-1' as 'tier-0' | 'tier-1' | 'tier-2',
  }),
  actions: {
    enableWalkthrough(dayCount: number) {
      this.mode = 'local-override'
      this.overrideDayCount = dayCount
      this.visible = true
    },
    followReal() {
      this.mode = 'follow-real'
    },
    setOverrideDayCount(dayCount: number) {
      this.overrideDayCount = Math.max(1, Math.floor(dayCount))
    },
  },
  getters: {
    effectiveDayCount: (state) => (realDayCount: number) =>
      state.mode === 'local-override' ? state.overrideDayCount : realDayCount,
  },
})
```

- [ ] **Step 4: 写轻量走查面板，只保留必要动作**

```vue
<template>
  <aside v-if="store.visible" class="panel">
    <div class="row">模式：{{ store.mode }}</div>
    <div class="row">质量档：{{ store.qualityTierLabel }}</div>
    <input type="number" :value="store.overrideDayCount" @input="onInput" />
    <div class="actions">
      <button @click="jump(1)">阶段 1</button>
      <button @click="jump(4)">阶段 2</button>
      <button @click="jump(11)">阶段 3</button>
      <button @click="jump(22)">阶段 4</button>
      <button @click="jump(46)">阶段 5</button>
      <button @click="jump(91)">阶段 6</button>
    </div>
    <button @click="emit('replay-transition')">重播过渡</button>
    <button @click="store.followReal()">恢复真实值</button>
  </aside>
</template>
```

- [ ] **Step 5: 修改 growth store 和页面，让真实数据与走查覆盖值共存**

```ts
const debugStore = usePlanetDebugStore()

const effectiveDayCount = computed(() => debugStore.effectiveDayCount(store.value))
```

```vue
<PlanetCanvas
  :stages="store.stages"
  :stage-index="store.stageIndex"
  :day-count="effectiveDayCount"
/>
<PlanetDebugPanel @replay-transition="replayCurrentTransition" />
```

- [ ] **Step 6: 修改 PlanetCanvas，把 jump/replay 等控制透给 renderer**

```ts
function replayCurrentTransition() {
  renderer?.replayCurrentTransition()
}

defineExpose({
  replayCurrentTransition,
  jumpToDayCount: (value: number) => renderer?.jumpToDayCount(value),
})
```

- [ ] **Step 7: 运行走查和 store 测试**

Run: `pnpm test:run -- src/stores/planetDebug.test.ts src/stores/growth.test.ts`

Expected: PASS with debug override and growth tests

- [ ] **Step 8: 提交**

```bash
git add src/stores/planetDebug.ts src/stores/planetDebug.test.ts src/components/PlanetDebugPanel.vue src/stores/growth.ts src/components/PlanetCanvas.vue src/pages/DemoHome.vue
git commit -m "feat: add lightweight 3d walkthrough panel"
```

### Task 7: 收尾验证与迁移清理

**Files:**
- Modify: `src/utils/planetRenderer.ts`
- Modify: `src/utils/planet/stages/index.ts`
- Modify: `src/utils/planet/stages/Stage4.ts`
- Modify: `src/utils/planet/stages/Stage5.ts`
- Modify: `src/utils/planet/stages/Stage6.ts`
- Modify: `docs/superpowers/specs/2026-04-18-habit-planet-3d-rendering-layer-design.md`

- [ ] **Step 1: 写回归测试，锁定关键阶段切换与终局降级不回退**

```ts
import { describe, expect, it } from 'vitest'
import { buildStageSnapshot } from '../runtime/stageRuntime'

describe('final regression checkpoints', () => {
  it('keeps stage boundaries stable', () => {
    expect(buildStageSnapshot(45).stageIndex).toBe(4)
    expect(buildStageSnapshot(46).stageIndex).toBe(5)
    expect(buildStageSnapshot(91).stageIndex).toBe(6)
  })
})
```

- [ ] **Step 2: 运行全量测试，确认收尾前没有回归**

Run: `pnpm test:run`

Expected: PASS with all Vitest suites green

- [ ] **Step 3: 运行类型检查和生产构建，确认计划中的主链路完整**

Run: `pnpm type-check`

Expected: PASS with no TypeScript errors

Run: `pnpm build`

Expected: PASS with production bundle built successfully

- [ ] **Step 4: 清理旧阶段脚本的责任，避免新旧双轨继续发散**

```ts
// src/utils/planet/stages/index.ts
// 仅保留 legacy 适配层所需导出；所有新功能禁止继续写入 Stage1~Stage6。
export { StageManager }
```

```ts
// src/utils/planet/stages/Stage4.ts / Stage5.ts / Stage6.ts
// 添加迁移注释，明确这些文件只用于过渡期兼容，后续功能写入 LayerController。
```

- [ ] **Step 5: 同步规格文档，补“已实现 vs 计划中”的迁移状态说明**

```md
## 实现状态

- 已接入 Stage Orchestrator
- 已接入 LayerController
- 高阶段特效按 QualityTier 自动降级
- Debug 走查面板支持本地覆盖和重播过渡
```

- [ ] **Step 6: 提交**

```bash
git add src/utils/planetRenderer.ts src/utils/planet/stages/index.ts src/utils/planet/stages/Stage4.ts src/utils/planet/stages/Stage5.ts src/utils/planet/stages/Stage6.ts docs/superpowers/specs/2026-04-18-habit-planet-3d-rendering-layer-design.md
git commit -m "chore: finalize 3d rendering layer migration"
```

## Self-Review

**Spec coverage**
- 资产加载策略：Task 2 和 Task 5 覆盖 `AssetRegistry`、预加载、释放与降级。
- 场景状态管理与动画过渡：Task 1、Task 3、Task 4 覆盖 `StageSnapshot`、`StageOrchestrator`、半固定机位和关键阶段过渡。
- 性能优化规范：Task 1、Task 2、Task 5 覆盖 `QualityTier`、可释放特效和高阶段自动降级。
- Debug 模式设计：Task 6 覆盖走查面板、本地覆盖模式、重播过渡和恢复真实值。

**Placeholder scan**
- 未使用 `TODO`、`TBD`、`后续补`、`类似上一任务` 等占位写法。
- 每个任务都给出具体文件路径、测试命令、预期输出和最小代码骨架。

**Type consistency**
- 阶段索引统一为 `1 | 2 | 3 | 4 | 5 | 6`。
- 质量档统一为 `'tier-0' | 'tier-1' | 'tier-2'`。
- 所有运行时输入统一使用 `StageRuntimeSnapshot` 或 `LayerUpdateInput`。
