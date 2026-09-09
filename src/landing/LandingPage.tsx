import { Globe2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import './landing.css'

type LandingLocale = 'en' | 'ru' | 'kk'

const copy: Record<LandingLocale, {
  signIn: string; openApp: string; heroTitle: string; heroCopy: string
  openLimiter: string; viewGitHub: string; finalTitle: string; finalCopy: string; privacy: string
}> = {
  en: {
    signIn: 'Sign in', openApp: 'Open app', heroTitle: 'Your time is finite.\nPlan it that way.',
    heroCopy: 'Limiter combines a Pomodoro timer, weekly time budgets, and a simple work journal.',
    openLimiter: 'Open Limiter', viewGitHub: 'View on GitHub', finalTitle: 'Make the week count.',
    finalCopy: 'Start with demo data. Create an account when you want to keep it.', privacy: 'Privacy',
  },
  ru: {
    signIn: 'Войти', openApp: 'Открыть приложение', heroTitle: 'Ваше время ограничено.\nПланируйте его осознанно.',
    heroCopy: 'Limiter объединяет Pomodoro-таймер, недельные лимиты времени и простой журнал работы.',
    openLimiter: 'Открыть Limiter', viewGitHub: 'Посмотреть на GitHub', finalTitle: 'Используйте неделю с пользой.',
    finalCopy: 'Попробуйте демоверсию. Создайте аккаунт, когда захотите сохранить данные.', privacy: 'Конфиденциальность',
  },
  kk: {
    signIn: 'Кіру', openApp: 'Қолданбаны ашу', heroTitle: 'Уақытыңыз шектеулі.\nОны саналы жоспарлаңыз.',
    heroCopy: 'Limiter Pomodoro таймерін, апталық уақыт лимиттерін және қарапайым жұмыс журналын біріктіреді.',
    openLimiter: 'Limiter-ді ашу', viewGitHub: 'GitHub-та көру', finalTitle: 'Аптаны тиімді өткізіңіз.',
    finalCopy: 'Демо нұсқасын қолданып көріңіз. Деректерді сақтағыңыз келсе, аккаунт ашыңыз.', privacy: 'Құпиялық',
  },
}

const languages: Array<{ id: LandingLocale; label: string }> = [
  { id: 'en', label: 'English' },
  { id: 'ru', label: 'Русский' },
  { id: 'kk', label: 'Қазақша' },
]

function GithubMark() {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12 .7A11.3 11.3 0 0 0 8.4 22.8c.6.1.8-.3.8-.6v-2.2c-3.4.7-4.1-1.4-4.1-1.4-.5-1.4-1.3-1.8-1.3-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-6A4.7 4.7 0 0 1 5.7 8c-.1-.3-.5-1.6.1-3.3 0 0 1-.3 3.4 1.3a11.8 11.8 0 0 1 6.2 0c2.4-1.6 3.4-1.3 3.4-1.3.6 1.7.2 3 .1 3.3a4.7 4.7 0 0 1 1.2 3.2c0 4.7-2.8 5.7-5.5 6 .4.4.8 1.1.8 2.2v2.8c0 .4.2.7.8.6A11.3 11.3 0 0 0 12 .7Z" /></svg>
}

export function LandingPage() {
  const [locale, setLocale] = useState<LandingLocale>(() => {
    const saved = localStorage.getItem('lim.landing.locale')
    return saved === 'ru' || saved === 'kk' ? saved : 'en'
  })
  const [menuOpen, setMenuOpen] = useState(false)
  const [videoPlaying, setVideoPlaying] = useState(false)
  const [videoStarted, setVideoStarted] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const t = copy[locale]

  useEffect(() => {
    document.documentElement.lang = locale === 'kk' ? 'kk' : locale
    localStorage.setItem('lim.landing.locale', locale)
  }, [locale])

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    video.muted = true
    video.defaultMuted = true

    const tryPlay = () => {
      video.play().then(() => {
        setVideoPlaying(true)
        setVideoStarted(true)
        window.removeEventListener('pointerdown', retryAfterInteraction)
        window.removeEventListener('touchstart', retryAfterInteraction)
      }).catch(() => {
        // Safari can defer autoplay until the first user interaction.
      })
    }
    const retryAfterInteraction = () => tryPlay()

    video.load()
    tryPlay()
    window.addEventListener('pointerdown', retryAfterInteraction, { once: true, passive: true })
    window.addEventListener('touchstart', retryAfterInteraction, { once: true, passive: true })

    return () => {
      window.removeEventListener('pointerdown', retryAfterInteraction)
      window.removeEventListener('touchstart', retryAfterInteraction)
    }
  }, [])

  const toggleVideo = () => {
    const video = videoRef.current
    if (!video) return
    video.muted = true
    if (videoPlaying) {
      video.pause()
      setVideoPlaying(false)
      return
    }
    video.play().catch(() => undefined)
  }

  return (
    <div className="landing-page">
      <nav className="landing-nav" aria-label="Main navigation">
        <Link className="landing-brand" to="/" aria-label="Limiter home"><span className="landing-mark" /> <span>Limiter</span></Link>
        <div className="landing-nav-actions">
          <a className="landing-icon-button" href="https://github.com/codepharm99/limiter" aria-label="GitHub" title="GitHub"><GithubMark /></a>
          <div className="landing-language" ref={pickerRef}>
            <button className="landing-icon-button" type="button" aria-label="Choose language" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}><Globe2 size={18} strokeWidth={1.8} /></button>
            {menuOpen && <div className="landing-language-menu" role="menu">
              {languages.map((language) => <button className={`landing-language-option${language.id === locale ? ' is-current' : ''}`} key={language.id} type="button" role="menuitem" onClick={() => { setLocale(language.id); setMenuOpen(false) }}>{language.label}</button>)}
            </div>}
          </div>
          <Link className="landing-open" to="/app">{t.openApp}</Link>
        </div>
      </nav>

      <main>
        <section className="landing-hero">
          <video ref={videoRef} className={`landing-video${videoStarted ? ' is-visible' : ''}`} autoPlay muted loop playsInline controls={false} preload="auto" poster="/landing/limiter-montage-poster.jpg" aria-hidden="true" tabIndex={-1} onPlay={() => { setVideoPlaying(true); setVideoStarted(true) }} onPause={() => setVideoPlaying(false)}><source src="/landing/limiter-montage.mp4" type="video/mp4" /></video>
          <button className="landing-video-play" type="button" aria-label={videoPlaying ? 'Pause background video' : 'Play background video'} onPointerDown={(event) => event.stopPropagation()} onClick={toggleVideo}><span className={`landing-video-icon${videoPlaying ? ' is-pause' : ' is-play'}`} aria-hidden="true" /></button>
          <div className="landing-hero-content">
            <h1>{t.heroTitle.split('\n').map((line, index) => <span key={line}>{index > 0 && <br />}{line}</span>)}</h1>
            <p>{t.heroCopy}</p>
            <div className="landing-actions"><Link className="landing-button landing-button-primary" to="/app">{t.openLimiter}</Link><a className="landing-button landing-button-secondary" href="https://github.com/codepharm99/limiter">{t.viewGitHub}</a></div>
          </div>
        </section>
        <section className="landing-final"><h2>{t.finalTitle}</h2><p>{t.finalCopy}</p><Link className="landing-button landing-button-primary" to="/app">{t.openLimiter}</Link></section>
      </main>
      <footer className="landing-footer"><span>Limiter · MIT licensed</span><span>{t.privacy}</span></footer>
    </div>
  )
}
