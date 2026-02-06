import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useGrowthStore } from './growth'

// 描述 useGrowthStore 的测试套件
describe('useGrowthStore', () => {
  // 在每个测试用例运行前，重新初始化 Pinia 实例
  // 确保每个测试都在干净的状态下运行，互不干扰
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  // 测试用例 1: 验证初始状态是否正确
  it('starts at stage 0', () => {
    const store = useGrowthStore()
    expect(store.value).toBe(0) // 初始天数应为 0
    expect(store.stageIndex).toBe(0) // 初始阶段索引应为 0 (荒芜)
    expect(store.stage?.threshold).toBe(0) // 初始阶段的阈值应为 0
  })

  // 测试用例 2: 验证播放功能和最大值限制
  it('advances value while playing and stops at max', () => {
    const store = useGrowthStore()
    store.ratePerSecond = 20 // 设置较快的增长速率以便测试
    store.play() // 开始播放
    store.tick(10) // 模拟经过 10 秒
    
    // 期望值应该达到最大值 (因为 20 * 10 = 200 > 50)
    expect(store.value).toBe(store.maxValue) 
    // 达到最大值后应该自动停止播放
    expect(store.playing).toBe(false)
  })

  // 测试用例 3: 验证 setValue 方法的边界检查
  it('clamps setValue into range', () => {
    const store = useGrowthStore()
    
    store.setValue(-10) // 尝试设置为负数
    expect(store.value).toBe(0) // 应该被修正为 0
    
    store.setValue(store.maxValue + 100) // 尝试设置为超过最大值
    expect(store.value).toBe(store.maxValue) // 应该被修正为最大值
  })

  // 测试用例 4: 验证阶段升级逻辑
  it('updates stageIndex based on thresholds', () => {
    const store = useGrowthStore()
    
    store.setValue(0)
    expect(store.stageIndex).toBe(0) // 0 天 -> 阶段 0
    
    store.setValue(10)
    expect(store.stageIndex).toBeGreaterThanOrEqual(1) // 10 天 -> 至少是阶段 1
    
    store.setValue(store.maxValue)
    expect(store.stageIndex).toBe(store.stages.length - 1) // 最大天数 -> 最后一个阶段
  })
})
