import { defineStore } from 'pinia'

// 定义生长阶段的ID类型
export type GrowthStageId = 'origin' | 'awakening' | 'vibrant' | 'civilization' | 'resonance'

// 定义植被配置类型，控制不同阶段的植物数量
export type VegetationConfig = {
  grass: number   // 草的数量
  flowers: number // 花的数量
  bushes: number  // 灌木数量
  trees: number   // 树木数量
}

// 定义生长阶段的详细信息结构
export type GrowthStage = {
  id: GrowthStageId
  name: string
  threshold: number     // 触发该阶段所需的天数阈值
  description: string   // 阶段描述
  vegetation: VegetationConfig // 该阶段对应的植被配置
}

// 定义所有生长阶段的数据配置
export const growthStages: GrowthStage[] = [
  {
    id: 'origin',
    name: '荒芜原点',
    threshold: 0,
    description: '沉睡的岩石',
    vegetation: { grass: 0, flowers: 0, bushes: 0, trees: 0 },
  },
  {
    id: 'awakening',
    name: '苏醒时刻',
    threshold: 3,
    description: '第一抹绿色',
    vegetation: { grass: 120, flowers: 10, bushes: 0, trees: 2 },
  },
  {
    id: 'vibrant',
    name: '生机勃发',
    threshold: 10,
    description: '森林的呼吸',
    vegetation: { grass: 380, flowers: 40, bushes: 20, trees: 15 },
  },
  {
    id: 'civilization',
    name: '文明火种',
    threshold: 22,
    description: '温暖的归属',
    vegetation: { grass: 520, flowers: 90, bushes: 60, trees: 25 },
  },
  {
    id: 'resonance',
    name: '星际共鸣',
    threshold: 35,
    description: '灵魂的羁绊',
    vegetation: { grass: 650, flowers: 140, bushes: 120, trees: 40 },
  },
]

// 最大的天数阈值
const maxThreshold = 50 

// 定义 Pinia Store，用于管理生长的状态
export const useGrowthStore = defineStore('growth', {
  // 状态定义
  state: () => ({
    value: 0,        // 当前的天数/进度值
    playing: false,  // 是否正在自动播放/增长
    ratePerSecond: 2, // 自动增长的速率（每秒增加的天数），设为2方便观察
  }),
  // 计算属性
  getters: {
    stages: () => growthStages, // 获取所有阶段配置
    maxValue: () => maxThreshold, // 获取最大进度值
    // 根据当前 value 计算当前所处的阶段索引
    stageIndex: (state) => {
      for (let i = growthStages.length - 1; i >= 0; i -= 1) {
        if (state.value >= growthStages[i]!.threshold) return i
      }
      return 0
    },
    // 获取当前阶段的详细对象
    stage: (state) => {
      for (let i = growthStages.length - 1; i >= 0; i -= 1) {
        if (state.value >= growthStages[i]!.threshold) return growthStages[i]
      }
      return growthStages[0]
    },
    // 获取下一个阶段的对象（如果有）
    nextStage: (state) => {
      let idx = -1
      for (let i = growthStages.length - 1; i >= 0; i -= 1) {
        if (state.value >= growthStages[i]!.threshold) {
          idx = i
          break
        }
      }
      return growthStages[idx + 1] ?? null
    },
  },
  // 操作方法
  actions: {
    // 开始自动增长
    play() {
      this.playing = true
    },
    // 暂停自动增长
    pause() {
      this.playing = false
    },
    // 切换播放/暂停状态
    toggle() {
      this.playing = !this.playing
    },
    // 重置状态到初始值
    reset() {
      this.value = 0
      this.playing = false
    },
    // 手动设置当前天数
    setValue(value: number) {
      const v = Number.isFinite(value) ? value : 0
      // 限制值在 0 到 maxThreshold 之间
      this.value = Math.min(maxThreshold, Math.max(0, v))
    },
    // 每一帧调用的更新函数，用于处理自动增长逻辑
    tick(deltaSeconds: number) {
      if (!this.playing) return
      // 计算增量：时间间隔 * 速率
      const delta = Math.max(0, deltaSeconds) * this.ratePerSecond
      const next = this.value + delta
      // 如果达到最大值，停止播放
      if (next >= maxThreshold) {
        this.value = maxThreshold
        this.playing = false
        return
      }
      this.value = next
    },
  },
})
