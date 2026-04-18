<template>
  <section class="debugCard">
    <button
      type="button"
      class="debugToggle"
      @click="debugStore.toggleAdvanced()">
      <span>高级调试</span>
      <span>{{ debugStore.advancedOpen ? '收起' : '展开' }}</span>
    </button>

    <div
      v-if="debugStore.advancedOpen"
      class="debugBody">
      <div class="debugRow">
        <span>当前 Day</span>
        <span>{{ currentDay }}</span>
      </div>
      <div class="debugRow">
        <span>质量档</span>
        <span>{{ debugStore.qualityText }}</span>
      </div>

      <div class="shortcutGrid">
        <button
          v-for="shortcut in debugStore.stageShortcuts"
          :key="shortcut.dayCount"
          type="button"
          class="shortcutBtn"
          @click="emit('jump-day', shortcut.dayCount)">
          {{ shortcut.label }}
        </button>
      </div>

      <div class="customJump">
        <input
          class="dayInput"
          type="number"
          min="1"
          :max="maxDay"
          :value="debugStore.customDayCount"
          @input="onDayInput" />
        <button
          type="button"
          class="actionChip"
          @click="emit('jump-day', debugStore.customDayCount)">
          跳转
        </button>
      </div>

      <button
        type="button"
        class="actionChip wide"
        @click="emit('replay-transition')">
        重播当前阶段过渡
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { usePlanetDebugStore } from '@/stores/planetDebug'

defineProps<{
  currentDay: number
  maxDay: number
}>()

const emit = defineEmits<{
  (e: 'jump-day', dayCount: number): void
  (e: 'replay-transition'): void
}>()

const debugStore = usePlanetDebugStore()

function onDayInput(event: Event) {
  const target = event.target as HTMLInputElement
  debugStore.setCustomDayCount(Number(target.value))
}
</script>

<style scoped>
.debugCard {
  margin-top: 10px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
}

.debugToggle {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.92);
  padding: 10px 12px;
  cursor: pointer;
}

.debugBody {
  padding: 0 12px 12px;
}

.debugRow {
  display: flex;
  justify-content: space-between;
  color: rgba(255, 255, 255, 0.82);
  font-size: 12px;
  margin-bottom: 8px;
}

.shortcutGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin: 10px 0;
}

.shortcutBtn,
.actionChip {
  border-radius: 999px;
  padding: 8px 10px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.92);
  cursor: pointer;
}

.customJump {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.dayInput {
  flex: 1;
  min-width: 0;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(0, 0, 0, 0.25);
  color: white;
  padding: 8px 10px;
}

.wide {
  width: 100%;
}
</style>
