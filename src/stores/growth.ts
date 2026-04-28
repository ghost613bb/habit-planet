import { defineStore } from 'pinia'

let dayCountBridgeTeardown: (() => void) | null = null

// 将“不确定类型”的输入尽量安全地转换为有限数字：
// - number：要求是有限值（排除 NaN/Infinity）
// - string：尝试用 parseFloat 转成数字（同样排除 NaN/Infinity）
// - 其它类型：直接判定为无效
function coerceFiniteNumber(input: unknown): number | null {
  if (typeof input === 'number') return Number.isFinite(input) ? input : null
  if (typeof input === 'string') {
    const n = Number.parseFloat(input)
    return Number.isFinite(n) ? n : null
  }
  return null
}

// 从客户端/调试侧传入的消息载荷里提取 dayCount：
// - 支持直接传 number / string
// - 支持传 JSON 字符串（会递归解析）
// - 支持对象格式：{ dayCount: ... } 或 { type: 'dayCount', value: ... }
// 解析失败时返回 null（上层会忽略该消息）
function extractDayCount(payload: unknown): number | null {
  // 1) 最简单情况：payload 本身就是数值或可解析成数值的字符串
  const direct = coerceFiniteNumber(payload)
  if (direct != null) return direct

  // 2) 兼容某些 WebView/桥接只传字符串：如果是 JSON 字符串，尝试解析后递归处理
  if (typeof payload === 'string') {
    try {
      const parsed: unknown = JSON.parse(payload)
      return extractDayCount(parsed)
    } catch {
      return null
    }
  }

  // 3) 非对象载荷无法从 key/value 中提取
  if (!payload || typeof payload !== 'object') return null

  const data = payload as Record<string, unknown>
  // 4) 约定格式：{ dayCount: number|string }
  const byKey = coerceFiniteNumber(data.dayCount)
  if (byKey != null) return byKey

  // 5) 事件格式：{ type: 'dayCount' | 'dayCountChanged', value: number|string }
  if (data.type === 'dayCount') return coerceFiniteNumber(data.value)
  if (data.type === 'dayCountChanged') return coerceFiniteNumber(data.value)

  return null
}

// 定义生长阶段的ID类型
export type GrowthStageId =
  | 'origin'
  | 'campfire'
  | 'shelter'
  | 'homestead'
  | 'flourish'
  | 'finale'

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
    name: '萌芽初启',
    threshold: 0,
    description: '幼苗刚刚破土',
    vegetation: { grass: 60, flowers: 4, bushes: 0, trees: 0 },
  },
  {
    id: 'campfire',
    name: '篝火升起',
    threshold: 4,
    description: '灌木与篝火点亮家园',
    vegetation: { grass: 120, flowers: 10, bushes: 8, trees: 2 },
  },
  {
    id: 'shelter',
    name: '家园雏形',
    threshold: 11,
    description: '第三棵树与花丛出现',
    vegetation: { grass: 220, flowers: 24, bushes: 18, trees: 4 },
  },
  {
    id: 'homestead',
    name: '温暖家园',
    threshold: 22,
    description: '小屋、风车与光轨点亮场景',
    vegetation: { grass: 360, flowers: 48, bushes: 24, trees: 6 },
  },
  {
    id: 'flourish',
    name: '繁盛之境',
    threshold: 46,
    description: '植被茂盛，长椅与秋千加入',
    vegetation: { grass: 520, flowers: 82, bushes: 38, trees: 8 },
  },
  {
    id: 'finale',
    name: '生命共鸣',
    threshold: 91,
    description: '生命树、光环与星尘展开',
    vegetation: { grass: 620, flowers: 120, bushes: 52, trees: 10 },
  },
]

// 最大的天数阈值
const maxThreshold = 120

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
    // 统一的 dayCount 写入口：
    // - 外部（WebView 消息 / 调试函数）只要拿到 dayCount，都应该走这里
    // - 这里会暂停自动增长，避免自动 tick 和外部输入同时改 value 造成“抢写”
    setDayCount(dayCount: number) {
      this.pause()
      this.setValue(dayCount)
    },
    // 安装 dayCount 桥接（只安装一次）：
    // 1) 监听 message 事件，兼容 H5 WebView / RN WebView 等常见通信方式
    // 2) 暴露 window.setDayCount(n) 作为本地调试入口（控制台直接调用）
    installDayCountBridge() {
      if (dayCountBridgeTeardown) return

      // 处理来自客户端/调试侧的消息：尝试从 event.data 里解析出 dayCount
      const onMessage = (event: MessageEvent) => {
        const next = extractDayCount(event.data)
        if (next == null) return
        this.setDayCount(next)
      }

      // 本地调试入口：window.setDayCount(数字)
      const globalFn = (next: number) => {
        this.setDayCount(next)
      }

      // 标准浏览器事件：window.postMessage(...)
      window.addEventListener('message', onMessage)
      // 部分 WebView 会把消息挂在 document 上（例如某些 RN WebView 实现）
      document.addEventListener('message', onMessage as EventListener)
      ;(window as any).setDayCount = globalFn

      // 记录卸载函数：用于释放监听并移除调试入口，避免热更新/重复挂载导致多次触发
      dayCountBridgeTeardown = () => {
        window.removeEventListener('message', onMessage)
        document.removeEventListener('message', onMessage as EventListener)
        if ((window as any).setDayCount === globalFn) {
          delete (window as any).setDayCount
        }
        dayCountBridgeTeardown = null
      }
    },
    // 卸载 dayCount 桥接：通常用于销毁应用或极端场景下手动释放
    disposeDayCountBridge() {
      dayCountBridgeTeardown?.()
      dayCountBridgeTeardown = null
    },
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
