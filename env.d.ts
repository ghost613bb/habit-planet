/// <reference types="vite/client" />

declare global {
  interface Window {
    setDayCount?: (next: number) => void
  }
}
