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
          background:
            radial-gradient(ellipse 80% 60% at 60% 40%, rgba(26,122,60,0.18) 0%, transparent 70%),
            linear-gradient(160deg, #1a1a1a 0%, #111111 40%, #0d130d 100%);
          background-size: cover;
          background-position: center 30%;
        }
        .lp-hero-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            rgba(17,17,17,0.0) 0%,
            rgba(17,17,17,0.0) 30%,
            rgba(17,17,17,0.55) 60%,
            rgba(17,17,17,0.97) 100%
          );
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
      </div>
    </>
  )
}
