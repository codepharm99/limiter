import { vi } from 'vitest'

// Node's experimental global `localStorage` (undefined without
// --localstorage-file) shadows the one jsdom would provide, so give every
// test file a working in-memory storage.
if (typeof globalThis.localStorage?.getItem !== 'function') {
  const map = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    get length() {
      return map.size
    },
    clear: () => map.clear(),
    getItem: (key: string) => map.get(key) ?? null,
    key: (index: number) => [...map.keys()][index] ?? null,
    removeItem: (key: string) => {
      map.delete(key)
    },
    setItem: (key: string, value: string) => {
      map.set(key, String(value))
    },
  })
}

// jsdom does not implement media playback; the landing video expects promises.
if (typeof HTMLMediaElement !== 'undefined') {
  HTMLMediaElement.prototype.play = function play() {
    return Promise.resolve()
  }
  HTMLMediaElement.prototype.pause = function pause() {}
  HTMLMediaElement.prototype.load = function load() {}
}
