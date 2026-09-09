import buttonUrl from '../assets/sounds/button.wav'
import celebrationUrl from '../assets/sounds/celebration.wav'
import notificationUrl from '../assets/sounds/notification.wav'
import selectUrl from '../assets/sounds/select.wav'
import tapUrl from '../assets/sounds/tap_01.wav'
import toggleOffUrl from '../assets/sounds/toggle_off.wav'
import toggleOnUrl from '../assets/sounds/toggle_on.wav'
import transitionUpUrl from '../assets/sounds/transition_up.wav'

export type SoundName = 'tap' | 'select' | 'toggle' | 'toggleOff' | 'button' | 'celebrate' | 'up' | 'notification'

const URLS: Record<SoundName, string> = {
  tap: tapUrl,
  select: selectUrl,
  toggle: toggleOnUrl,
  toggleOff: toggleOffUrl,
  button: buttonUrl,
  celebrate: celebrationUrl,
  up: transitionUpUrl,
  notification: notificationUrl,
}

const KEY = 'lim.sounds'

export function soundsEnabled(): boolean {
  return localStorage.getItem(KEY) !== '0'
}

export function setSoundsEnabled(on: boolean) {
  localStorage.setItem(KEY, on ? '1' : '0')
}

/* Browsers block audible playback initiated outside a user gesture (Firefox,
   iOS Safari), so the completion sound fired from a timer tick stays silent.
   WebAudio sidesteps this: the context is created/resumed inside the first
   pointer/keyboard gesture, and buffers scheduled later keep playing. */
let ctx: AudioContext | null = null
const buffers = new Map<SoundName, AudioBuffer>()
const failed = new Set<SoundName>()

type LegacyWindow = Window & { webkitAudioContext?: typeof AudioContext }

function ensureCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AC = window.AudioContext ?? (window as LegacyWindow).webkitAudioContext
  if (!AC) return null
  if (!ctx) {
    try {
      ctx = new AC()
    } catch {
      return null
    }
  }
  return ctx
}

async function load(name: SoundName) {
  const c = ensureCtx()
  if (!c || buffers.has(name) || failed.has(name)) return
  try {
    const res = await fetch(URLS[name])
    if (!res.ok) throw new Error(String(res.status))
    buffers.set(name, await c.decodeAudioData(await res.arrayBuffer()))
  } catch {
    failed.add(name)
  }
}

/** Must run inside a real user gesture so later non-gesture playback is allowed. */
export function primeAudio() {
  const c = ensureCtx()
  if (!c) return
  if (c.state === 'suspended') c.resume().catch(() => {})
  for (const name of Object.keys(URLS) as SoundName[]) void load(name)
}

if (typeof window !== 'undefined') {
  for (const type of ['pointerdown', 'keydown'] as const) {
    window.addEventListener(type, primeAudio, { capture: true, passive: true })
  }
}

function fallbackPlay(name: SoundName, volume: number) {
  try {
    const audio = new Audio(URLS[name])
    audio.volume = volume
    const played = audio.play()
    if (played && typeof played.catch === 'function') played.catch(() => {})
  } catch {
    /* jsdom and friends */
  }
}

function play(name: SoundName, volume = 0.4) {
  if (!soundsEnabled()) return
  const c = ensureCtx()
  if (!c) return fallbackPlay(name, volume)
  const buffer = buffers.get(name)
  if (!buffer) {
    if (!failed.has(name)) void load(name).then(() => play(name, volume))
    else fallbackPlay(name, volume)
    return
  }
  if (c.state === 'suspended') {
    // Gesture-driven calls succeed here; timer-driven ones fail silently.
    c.resume().catch(() => {})
  }
  try {
    const source = c.createBufferSource()
    source.buffer = buffer
    const gain = c.createGain()
    gain.gain.value = volume
    source.connect(gain).connect(c.destination)
    source.start()
  } catch {
    /* stay silent */
  }
}

/** UI feedback for any pressed/toggled/selected control. Throttled per frame. */
let lastPlay = 0
export function uiSound(name: SoundName = 'tap', volume = 0.4) {
  const now = performance.now()
  if (now - lastPlay < 40) return
  lastPlay = now
  play(name, volume)
}
