'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Instrument_Sans, Work_Sans, IBM_Plex_Mono } from 'next/font/google'

const displayFont = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600', '700'],
})
const bodyFont = Work_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['300', '400', '500'],
})
const monoFont = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500'],
})

export function LandingPage() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const items = document.querySelectorAll('.lp-pijn-item')
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            setTimeout(() => entry.target.classList.add('visible'), i * 120)
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.15 }
    )
    items.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <style>{`
        .lp-root {
          --green: #3ADE6A;
          --black: #111111;
          --white: #ffffff;
          --beton: #F4F4F0;
          --veldsteen: #7A7A7A;
          --diepgroen: #1A7A3C;
          background: var(--black);
          color: var(--white);
          font-family: var(--font-body), 'Work Sans', sans-serif;
          font-size: 16px;
          line-height: 1.6;
          overflow-x: hidden;
          min-height: 100vh;
        }

        /* ── NAV ── */
        .lp-nav {
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 48px;
          transition: background 0.3s ease, backdrop-filter 0.3s ease;
        }
        .lp-nav.scrolled {
          background: rgba(17,17,17,0.92);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(58,222,106,0.12);
        }
        .lp-nav-logo {
          font-family: var(--font-display), 'Instrument Sans', sans-serif;
          font-size: 22px;
          font-weight: 700;
          color: var(--white);
          text-decoration: none;
          letter-spacing: -0.5px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .lp-q-mark {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: var(--green);
          color: var(--black);
          border-radius: 8px;
          font-size: 18px;
          font-weight: 700;
          line-height: 1;
        }
        .lp-nav-cta {
          background: var(--green);
          color: var(--black);
          font-family: var(--font-display), 'Instrument Sans', sans-serif;
          font-weight: 600;
          font-size: 14px;
          padding: 10px 22px;
          border-radius: 8px;
          text-decoration: none;
          transition: opacity 0.2s;
          white-space: nowrap;
        }
        .lp-nav-cta:hover { opacity: 0.85; }

        @media (max-width: 640px) {
          .lp-nav { padding: 16px 20px; }
          .lp-nav-cta { display: none; }
        }

        /* ── HERO ── */
        .lp-hero {
          position: relative;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 0 48px 80px;
          overflow: hidden;
        }
        .lp-hero-bg {
          position: absolute;
          inset: 0;
          background-image: url('/spencer-davis-SVfXlChg9HI-unsplash.jpg');
          background-size: cover;
          background-position: center 35%;
        }
        .lp-hero-overlay {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(to right, rgba(17,17,17,0.82) 0%, rgba(17,17,17,0.35) 55%, rgba(17,17,17,0.05) 100%),
            linear-gradient(to top, rgba(17,17,17,0.96) 0%, rgba(17,17,17,0.0) 50%);
        }
        .lp-hero-content {
          position: relative;
          z-index: 2;
          max-width: 760px;
          opacity: 0;
          transform: translateY(28px);
          animation: lpFadeUp 0.9s ease 0.3s forwards;
        }
        .lp-hero-tag {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: var(--font-mono), 'IBM Plex Mono', monospace;
          font-size: 12px;
          letter-spacing: 0.08em;
          color: var(--green);
          background: rgba(58,222,106,0.12);
          border: 1px solid rgba(58,222,106,0.25);
          padding: 6px 14px;
          border-radius: 100px;
          margin-bottom: 28px;
          text-transform: uppercase;
        }
        .lp-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--green);
          animation: lpPulse 2s infinite;
          flex-shrink: 0;
        }
        .lp-h1 {
          font-family: var(--font-display), 'Instrument Sans', sans-serif;
          font-size: clamp(42px, 6vw, 80px);
          font-weight: 700;
          line-height: 1.05;
          letter-spacing: -2px;
          color: var(--white);
          margin-bottom: 24px;
        }
        .lp-h1 em {
          font-style: normal;
          color: var(--green);
        }
        .lp-hero-sub {
          font-size: clamp(16px, 2vw, 20px);
          color: rgba(255,255,255,0.72);
          font-weight: 300;
          max-width: 520px;
          line-height: 1.55;
          margin-bottom: 40px;
        }
        .lp-hero-actions {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }
        .lp-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: var(--green);
          color: var(--black);
          font-family: var(--font-display), 'Instrument Sans', sans-serif;
          font-weight: 700;
          font-size: 15px;
          padding: 14px 28px;
          border-radius: 10px;
          text-decoration: none;
          transition: transform 0.2s, opacity 0.2s;
          letter-spacing: -0.2px;
        }
        .lp-btn-primary:hover { transform: translateY(-2px); opacity: 0.9; }
        .lp-btn-ghost {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: rgba(255,255,255,0.65);
          font-size: 14px;
          text-decoration: none;
          transition: color 0.2s;
          border-bottom: 1px solid rgba(255,255,255,0.2);
          padding-bottom: 2px;
        }
        .lp-btn-ghost:hover { color: var(--white); border-color: var(--white); }

        /* ── HERO STATS ── */
        .lp-hero-stats {
          position: absolute;
          bottom: 80px;
          right: 48px;
          z-index: 2;
          display: flex;
          flex-direction: column;
          gap: 12px;
          opacity: 0;
          animation: lpFadeUp 0.9s ease 0.7s forwards;
        }
        .lp-stat-pill {
          background: rgba(17,17,17,0.72);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(58,222,106,0.2);
          border-radius: 12px;
          padding: 12px 18px;
          text-align: right;
        }
        .lp-stat-number {
          font-family: var(--font-mono), 'IBM Plex Mono', monospace;
          font-size: 22px;
          font-weight: 500;
          color: var(--green);
          display: block;
          line-height: 1;
        }
        .lp-stat-label {
          font-size: 11px;
          color: rgba(255,255,255,0.5);
          text-transform: uppercase;
          letter-spacing: 0.07em;
          margin-top: 4px;
          display: block;
        }

        @media (max-width: 640px) {
          .lp-hero { padding: 0 20px 60px; }
          .lp-hero-stats {
            position: static;
            flex-direction: row;
            flex-wrap: wrap;
            margin-top: 32px;
            animation: lpFadeUp 0.9s ease 0.7s forwards;
          }
          .lp-stat-pill { text-align: left; flex: 1; min-width: 120px; }
        }

        /* ── PIJN ── */
        .lp-pijn {
          background: var(--black);
          padding: 100px 48px;
        }
        .lp-pijn-inner {
          max-width: 1100px;
          margin: 0 auto;
        }
        .lp-section-label {
          font-family: var(--font-mono), 'IBM Plex Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.12em;
          color: var(--green);
          text-transform: uppercase;
          margin-bottom: 20px;
          display: block;
        }
        .lp-h2 {
          font-family: var(--font-display), 'Instrument Sans', sans-serif;
          font-size: clamp(32px, 4.5vw, 56px);
          font-weight: 700;
          letter-spacing: -1.5px;
          line-height: 1.1;
          margin-bottom: 60px;
          color: var(--white);
        }
        .lp-h2 .accent { color: var(--green); }
        .lp-pijn-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2px;
        }
        .lp-pijn-item {
          background: #161616;
          padding: 36px 32px;
          border-top: 2px solid transparent;
          transition: border-color 0.3s, background 0.3s;
          opacity: 0;
          transform: translateY(20px);
          transition: border-color 0.3s, background 0.3s, opacity 0.5s ease, transform 0.5s ease;
        }
        .lp-pijn-item.visible {
          opacity: 1;
          transform: translateY(0);
        }
        .lp-pijn-item:hover {
          border-color: var(--green);
          background: #1c1c1c;
        }
        .lp-pijn-num {
          font-family: var(--font-mono), 'IBM Plex Mono', monospace;
          font-size: 11px;
          color: var(--veldsteen);
          letter-spacing: 0.1em;
          margin-bottom: 20px;
          display: block;
        }
        .lp-pijn-title {
          font-family: var(--font-display), 'Instrument Sans', sans-serif;
          font-size: 20px;
          font-weight: 600;
          color: var(--white);
          margin-bottom: 12px;
          letter-spacing: -0.3px;
        }
        .lp-pijn-desc {
          font-size: 15px;
          color: rgba(255,255,255,0.5);
          line-height: 1.6;
        }
        @media (max-width: 768px) {
          .lp-pijn { padding: 80px 20px; }
          .lp-pijn-grid { grid-template-columns: 1fr; gap: 2px; }
        }

        /* ── ANIMATIONS ── */
        @keyframes lpFadeUp {
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes lpPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
      `}</style>

      <div
        className={`lp-root ${displayFont.variable} ${bodyFont.variable} ${monoFont.variable}`}
      >
        {/* NAV */}
        <nav className={`lp-nav${scrolled ? ' scrolled' : ''}`}>
          <a href="/" className="lp-nav-logo">
            <span className="lp-q-mark">Q</span>
            Quoter
          </a>
          <a href="#partner" className="lp-nav-cta">
            Design Partner worden &rarr;
          </a>
        </nav>

        {/* HERO */}
        <section className="lp-hero">
          <div className="lp-hero-bg" />
          <div className="lp-hero-overlay" />

          <div className="lp-hero-content">
            <div className="lp-hero-tag">
              <span className="lp-dot" />
              Design Partner Programma open
            </div>
            <h1 className="lp-h1">
              Je avond<br />is van <em>jou.</em>
            </h1>
            <p className="lp-hero-sub">
              Voor de vakman die briljant is in bouwen — maar verdrinkt in offertes,
              nacalculaties en vergeten meerwerk. Quoter maakt je offerte in 10 minuten.
            </p>
            <div className="lp-hero-actions">
              <Link href="/auth/signup" className="lp-btn-primary">
                Gratis testen &rarr;
              </Link>
              <a href="#hoe" className="lp-btn-ghost">
                Hoe het werkt
              </a>
            </div>
          </div>

          <div className="lp-hero-stats">
            <div className="lp-stat-pill">
              <span className="lp-stat-number">5+</span>
              <span className="lp-stat-label">uur/week bespaard</span>
            </div>
            <div className="lp-stat-pill">
              <span className="lp-stat-number">80%</span>
              <span className="lp-stat-label">sneller verstuurd</span>
            </div>
            <div className="lp-stat-pill">
              <span className="lp-stat-number">€0</span>
              <span className="lp-stat-label">meerwerk onbetaald</span>
            </div>
          </div>
        </section>

        {/* HET PROBLEEM */}
        <section className="lp-pijn">
          <div className="lp-pijn-inner">
            <span className="lp-section-label">Het probleem</span>
            <h2 className="lp-h2">
              Je bouwt de mooiste klussen.<br />
              Het <span className="accent">papierwerk</span> vreet je avond op.
            </h2>
            <div className="lp-pijn-grid">
              <div className="lp-pijn-item">
                <span className="lp-pijn-num">01</span>
                <div className="lp-pijn-title">Offertes tot 23:00</div>
                <p className="lp-pijn-desc">Je bent al uren thuis maar bent nog niet klaar. Elk project opnieuw maten invoeren, prijzen opzoeken, netjes opmaken.</p>
              </div>
              <div className="lp-pijn-item">
                <span className="lp-pijn-num">02</span>
                <div className="lp-pijn-title">Vergeten meerwerk</div>
                <p className="lp-pijn-desc">Die extra wand, die onverwachte fundering — mondeling afgesproken op de bouw, vergeten te factureren. Geld dat gewoon verdwijnt.</p>
              </div>
              <div className="lp-pijn-item">
                <span className="lp-pijn-num">03</span>
                <div className="lp-pijn-title">Geen grip op marge</div>
                <p className="lp-pijn-desc">Je weet pas na de kwartaalaangifte of je project winstgevend was. Tegen die tijd kun je er niets meer aan doen.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
