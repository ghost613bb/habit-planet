# 第二阶段第 4-10 天节奏重构设计

## 背景

当前第二阶段的时间窗口是第 4-10 天，但实现上的主要视觉变化集中在第 4-7 天：

- `VegetationLayer` 在第 4、5、6、7 天分别跳到 `32 / 41 / 49 / 98` 个草簇。
- 树数量在第 4、5、6、7 天分别是 `0 / 1 / 2 / 3`。
- `TerrainLayer` 的顶部泛绿只区分少数几档，第 6 天后大多沿用同一组参数。

这会导致第 4-7 天变化明显，而第 8-10 天几乎没有新的成长感，与项目“逐日累积”的展示规则不一致。

## 目标

- 保留第 4-7 天“明显变了”的视觉快感。
- 把第二阶段的成长完整铺满到第 10 天。
- 第 8-10 天重点做“植被补全 + 氛围增强”，而不是再突然加入重型新结构。
- 第 11 天进入下一阶段时，仍保留可感知的里程碑提升空间。

## 范围

本次实现只调整以下两层：

- `VegetationLayer`
- `TerrainLayer`

本次不改：

- `StructureLayer`
- `CharacterLayer`
- `FxLayer`

说明：虽然参数表里讨论过光效和动态节奏，但这一轮代码实现先聚焦植被与地表，让第 8-10 天先恢复连续成长感；光效和动态留作后续独立改造。

## 设计原则

- 第 4-5 天负责“从荒到绿”的第一波明显增长。
- 第 6-7 天负责建立高低层次，但不一次性把内容打满。
- 第 8-10 天负责补草地空隙、补树冠层次、补顶部泛绿连续性。
- 后续天数默认继承第 10 天已经完成的地表生态基底。
- 配置优先，避免在 Layer 内继续扩展按天硬编码分支。

## 配置结构

新增文件：

- `src/utils/planet/config/stageTwoDayTuning.ts`

导出内容：

- `StageTwoDay = 4 | 5 | 6 | 7 | 8 | 9 | 10`
- `StageTwoVegetationTuning`
- `StageTwoTerrainTuning`
- `StageTwoDayTuning`
- `STAGE_TWO_DAY_TUNING`
- `getStageTwoDay(dayCount)`
- `getStageTwoDayTuning(dayCount)`

建议结构：

```ts
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
```

## 每日参数映射

```ts
export const STAGE_TWO_DAY_TUNING = {
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
      bushCount: 4,
      treeCount: 2,
      treeScaleSet: [1.0, 0.88, 0.78],
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
      bushCount: 4,
      treeCount: 2,
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
      bushCount: 4,
      treeCount: 2,
      treeScaleSet: [1.08, 1.0, 0.9],
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
} as const
```

## VegetationLayer 改造方案

### 现状问题

- 第二阶段草簇数量硬编码为 `32 / 41 / 49 / 98`。
- 第二阶段树数量硬编码为 `0 / 1 / 2 / 3`。
- 第二阶段灌木数量硬编码为 `3 / 5 / 5 / 5`。
- 树和灌木的缩放大多由阶段进度驱动，无法体现第 8-10 天“数量不变但成熟度继续提升”。

### 改造目标

- 第二阶段完全改成按天查表。
- 第 8-10 天草簇继续增加。
- 第 9-10 天维持 2 棵树，通过树冠缩放继续体现成熟度提升。
- 第 8-10 天即使树数量不变，也能通过 `treeScaleSet` 继续长高和长厚。

### 实现方案

在 `update()` 中保留第一阶段逻辑，第二阶段改为：

```ts
const stageTwoDay = input.stageIndex === 2 ? getStageTwoDay(input.dayCount) : null
const stageTwoTuning = stageTwoDay != null ? getStageTwoDayTuning(stageTwoDay).vegetation : null
```

使用查表值替换以下逻辑：

- `stageTwoGrassPatchCount`
- `visibleBushCount`
- `visibleTreeCount`
- `unifiedGrassPatchScale`
- 每棵树的缩放
- 每个灌木的缩放

### 预期行为

- 第 7 天：`58` 草簇、`4` 灌木、`2` 棵树。
- 第 8 天：`70` 草簇、`4` 灌木、`2` 棵树，但树冠更成熟。
- 第 9 天：`84` 草簇、`4` 灌木、`2` 棵树，继续提升树冠成熟度。
- 第 10 天：`98` 草簇、`4` 灌木、`2` 棵树，树冠达到第二阶段完整状态。

## TerrainLayer 改造方案

### 现状问题

- 第二阶段顶部泛绿只有 `4-5`、`5`、`6+` 这几档。
- 第 6 天后大多沿用同一组参数，第 8-10 天缺少继续生长感。
- 第二阶段石头数量也按少数硬编码档位控制。

### 改造目标

- 第二阶段顶部泛绿改成第 4-10 天按天查表。
- 第 8-10 天继续扩大覆盖、降低 `topStart`、增强边缘自然度。
- 第 11 天以后默认继承第 10 天地表生态基底。

### 实现方案

在 `update()` 中保留第一阶段逻辑，第二阶段改为：

```ts
const stageTwoDay = input.stageIndex === 2 ? getStageTwoDay(input.dayCount) : null
const stageTwoTuning = stageTwoDay != null ? getStageTwoDayTuning(stageTwoDay).terrain : null
```

改动点：

- 删除第二阶段多组硬编码 overlay 常量。
- 第二阶段直接 `setPlanetGrassOverlay(stageTwoTuning.grassOverlay)`。
- 第 3 阶段及以后默认沿用 `第 10 天 terrain.grassOverlay`。
- 石头数量使用 `stageTwoTuning.rockCount`。
- 地表草层颜色改为优先使用 `stageTwoTuning.groundTint`。

### 预期行为

- 第 8、9、10 天顶部泛绿每天都继续增长，不再只是继承不消失。
- 第 11 天切换新阶段时，地表依然保留第二阶段已经完成的绿色基底。

## 测试方案

新增或调整测试：

- `VegetationLayer`
  - 验证第 7/8/9/10 天草簇数量分别为 `58/70/84/98`
  - 验证第 9/10 天都保持 `2` 棵树
  - 验证第 8 天树数量不变但树缩放大于第 7 天
- `TerrainLayer`
  - 验证第 8/9/10 天 `overlay.radius` 递增
  - 验证第 8/9/10 天 `overlay.topStart` 递减
  - 验证第 11 天 overlay 等于第 10 天 overlay

## 风险与约束

- `grassPatchCount` 不能超过当前锚点总量 `98`。
- `treeScaleSet` 需要与现有三棵树锚点顺序保持一致。
- 第 10 天不新增重型结构，避免削弱第 11 天里程碑感。
- 本次不处理 `FxLayer`，因此第 8-10 天的“氛围增强”主要先由地表泛绿和植被成熟度承担。

## 实施顺序

1. 新增 `stageTwoDayTuning.ts`
2. 改造 `VegetationLayer`
3. 改造 `TerrainLayer`
4. 更新相关测试
