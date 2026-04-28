# 花丛资产 FlowerBush Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增一个程序化低模花丛资产 `FlowerBush.ts`，支持实例化与配色变体，并补齐最小单测验证构造与缩放、配色差异。

**Architecture:** 参考 `LeafyTree.ts` / `LowPolyWideTree.ts` 的“模板 + 实例”模式：内部维护一个可复用的 `flowerBushTemplate`（程序化生成），`preloadFlowerBushTemplate()` 保持异步签名以便未来替换为 glTF 加载；`createFlowerBushInstance()` 克隆模板并应用 `targetHeight`、`rotationY`、`paletteVariant`。

**Tech Stack:** TypeScript、Three.js、Vitest

---

### Task 1: 新增 FlowerBush 资产文件

**Files:**
- Create: `src/utils/planet/assets/FlowerBush.ts`

- [ ] **Step 1: 写一个会失败的单测（先定义使用方式）**

Create `src/utils/planet/assets/FlowerBush.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { Group } from 'three'

import { createFlowerBushInstance, preloadFlowerBushTemplate } from './FlowerBush'

describe('FlowerBush', () => {
  it('preload 返回可用模板', async () => {
    const template = await preloadFlowerBushTemplate()
    expect(template).toBeInstanceOf(Group)
    expect(template.children.length).toBeGreaterThan(0)
  })

  it('createFlowerBushInstance 可按 targetHeight 缩放', async () => {
    await preloadFlowerBushTemplate()
    const a = createFlowerBushInstance({ targetHeight: 0.4, paletteVariant: 'pink' })
    const b = createFlowerBushInstance({ targetHeight: 0.8, paletteVariant: 'pink' })
    expect(a.scale.y).toBeLessThan(b.scale.y)
  })

  it('不同 paletteVariant 的花瓣颜色应不同', async () => {
    await preloadFlowerBushTemplate()
    const pink = createFlowerBushInstance({ targetHeight: 0.6, paletteVariant: 'pink' })
    const yellow = createFlowerBushInstance({ targetHeight: 0.6, paletteVariant: 'yellow' })
    const blue = createFlowerBushInstance({ targetHeight: 0.6, paletteVariant: 'blue' })

    // 仅校验“存在至少一种材质颜色差异”，避免依赖具体 Mesh 名字
    const collectColors = (root: Group) => {
      const colors: string[] = []
      root.traverse((obj) => {
        const anyObj = obj as any
        const mat = anyObj.material
        if (!mat) return
        if (Array.isArray(mat)) return
        if (!mat.color) return
        colors.push(`#${mat.color.getHexString()}`)
      })
      return colors
    }

    expect(new Set(collectColors(pink)).size).toBeGreaterThan(0)
    expect(new Set(collectColors(yellow)).size).toBeGreaterThan(0)
    expect(new Set(collectColors(blue)).size).toBeGreaterThan(0)
    expect(collectColors(pink).join(',')).not.toBe(collectColors(yellow).join(','))
    expect(collectColors(pink).join(',')).not.toBe(collectColors(blue).join(','))
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm run test:run -- src/utils/planet/assets/FlowerBush.test.ts`

Expected: FAIL，找不到 `./FlowerBush`

- [ ] **Step 3: 写最小实现**

Create `src/utils/planet/assets/FlowerBush.ts`:

```ts
import {
  Group,
  Mesh,
  MeshLambertMaterial,
  SphereGeometry,
  PlaneGeometry,
  Color,
} from 'three'

export type FlowerBushPaletteVariant = 'pink' | 'yellow' | 'blue'

let flowerBushTemplate: Group | null = null
let flowerBushLoadPromise: Promise<Group> | null = null

type Palette = {
  leaf: string
  petal: string
  center: string
}

const PALETTES: Record<FlowerBushPaletteVariant, Palette> = {
  pink: { leaf: '#5aa45e', petal: '#ff8fb9', center: '#ffd166' },
  yellow: { leaf: '#58a35c', petal: '#ffd166', center: '#fff3b0' },
  blue: { leaf: '#579f5a', petal: '#6da8ff', center: '#ffe8a3' },
}

function createPetalCross(palette: Palette) {
  const group = new Group()
  const petalMat = new MeshLambertMaterial({ color: new Color(palette.petal), flatShading: true })
  const plane = new PlaneGeometry(0.14, 0.07, 1, 1)

  const p1 = new Mesh(plane, petalMat)
  p1.rotation.y = 0
  const p2 = new Mesh(plane, petalMat)
  p2.rotation.y = Math.PI / 2
  const p3 = new Mesh(plane, petalMat)
  p3.rotation.y = Math.PI / 4
  const p4 = new Mesh(plane, petalMat)
  p4.rotation.y = -Math.PI / 4

  group.add(p1, p2, p3, p4)

  const center = new Mesh(
    new SphereGeometry(0.03, 6, 6),
    new MeshLambertMaterial({ color: new Color(palette.center), flatShading: true }),
  )
  center.position.y = 0.01
  group.add(center)

  return group
}

function createProceduralTemplate() {
  const root = new Group()

  // 叶团：低段数球体
  const leafMat = new MeshLambertMaterial({ color: '#5aa45e', flatShading: true })
  const leafGeo = new SphereGeometry(0.12, 7, 6)
  const leaf1 = new Mesh(leafGeo, leafMat)
  leaf1.position.set(0.06, 0.1, 0)
  const leaf2 = new Mesh(leafGeo, leafMat)
  leaf2.position.set(-0.05, 0.09, -0.04)
  const leaf3 = new Mesh(leafGeo, leafMat)
  leaf3.position.set(-0.01, 0.08, 0.06)

  leaf1.scale.set(1.05, 0.85, 1)
  leaf2.scale.set(0.95, 0.8, 0.92)
  leaf3.scale.set(0.9, 0.78, 0.95)
  root.add(leaf1, leaf2, leaf3)

  // 花朵位置（局部坐标）
  const flowerAnchors = [
    { x: 0.08, y: 0.18, z: 0.02, yaw: 0.2 },
    { x: -0.07, y: 0.17, z: -0.01, yaw: 1.0 },
    { x: -0.01, y: 0.19, z: 0.08, yaw: -0.6 },
    { x: 0.02, y: 0.16, z: -0.08, yaw: 0.5 },
  ]

  // 默认用 pink，实例化时再按 paletteVariant 遍历替换材质颜色
  const flowerBase = createPetalCross(PALETTES.pink)
  flowerAnchors.forEach((anchor, index) => {
    const flower = flowerBase.clone(true)
    flower.position.set(anchor.x, anchor.y, anchor.z)
    flower.rotation.y = anchor.yaw + index * 0.35
    flower.scale.setScalar(index % 2 === 0 ? 1 : 0.9)
    root.add(flower)
  })

  return root
}

function applyPalette(root: Group, palette: Palette) {
  root.traverse((obj) => {
    if (!(obj instanceof Mesh)) return
    const mat = obj.material
    if (!(mat instanceof MeshLambertMaterial)) return
    // 通过近似匹配原色来区分叶/瓣/花心：模板的 leaf 为 '#5aa45e'，petal 为 '#ff8fb9'，center 为 '#ffd166'
    const hex = `#${mat.color.getHexString()}`
    if (hex === '#5aa45e') mat.color.set(palette.leaf)
    else if (hex === '#ff8fb9') mat.color.set(palette.petal)
    else if (hex === '#ffd166') mat.color.set(palette.center)
  })
}

export async function preloadFlowerBushTemplate() {
  if (flowerBushTemplate) return flowerBushTemplate
  if (!flowerBushLoadPromise) {
    flowerBushTemplate = createProceduralTemplate()
    flowerBushLoadPromise = Promise.resolve(flowerBushTemplate)
  }
  return flowerBushLoadPromise
}

export function createFlowerBushInstance(options?: {
  targetHeight?: number
  rotationY?: number
  paletteVariant?: FlowerBushPaletteVariant
}) {
  const targetHeight = options?.targetHeight ?? 0.55
  const rotationY = options?.rotationY ?? 0
  const paletteVariant = options?.paletteVariant ?? 'pink'

  const base = flowerBushTemplate ?? createProceduralTemplate()
  const instance = base.clone(true)
  applyPalette(instance, PALETTES[paletteVariant])
  instance.scale.setScalar(targetHeight)
  instance.rotation.y = rotationY
  return instance
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm run test:run -- src/utils/planet/assets/FlowerBush.test.ts`

Expected: PASS，3 条用例全部通过

- [ ] **Step 5: 提交**

```bash
git add src/utils/planet/assets/FlowerBush.ts src/utils/planet/assets/FlowerBush.test.ts
git commit -m "feat: 增加花丛资产"
```
