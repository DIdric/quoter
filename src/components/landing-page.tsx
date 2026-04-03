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
  const [formSubmitted, setFormSubmitted] = useState(false)
  const [formData, setFormData] = useState({ name: '', company: '', email: '', phone: '', info: '' })

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

  useEffect(() => {
    const steps = document.querySelectorAll('.lp-step')
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            setTimeout(() => entry.target.classList.add('visible'), i * 150)
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.15 }
    )
    steps.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const cards = document.querySelectorAll('.lp-result-card')
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            setTimeout(() => entry.target.classList.add('visible'), i * 120)
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1 }
    )
    cards.forEach((el) => observer.observe(el))
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
          display: flex;
          align-items: center;
          text-decoration: none;
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
        .lp-nav-login {
          color: rgba(255,255,255,0.7);
          font-family: var(--font-display), 'Instrument Sans', sans-serif;
          font-weight: 500;
          font-size: 14px;
          text-decoration: none;
          transition: color 0.2s;
        }
        .lp-nav-login:hover { color: var(--white); }
        .lp-nav-right {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        @media (max-width: 640px) {
          .lp-nav { padding: 16px 20px; }
          .lp-nav-cta { display: none; }
          .lp-nav-login { display: none; }
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

        /* ── HOE HET WERKT ── */
        .lp-hoe {
          background: var(--beton);
          border-radius: 20px 20px 0 0;
          padding: 100px 48px;
          margin-top: -20px;
        }
        .lp-hoe-inner {
          max-width: 1100px;
          margin: 0 auto;
        }
        .lp-hoe .lp-section-label { color: var(--diepgroen); }
        .lp-hoe-h2 {
          font-family: var(--font-display), 'Instrument Sans', sans-serif;
          font-size: clamp(32px, 4.5vw, 56px);
          font-weight: 700;
          letter-spacing: -1.5px;
          line-height: 1.1;
          margin-bottom: 60px;
          color: var(--black);
        }
        .lp-hoe-h2 .accent { color: var(--diepgroen); }
        .lp-steps {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 48px;
          position: relative;
        }
        .lp-steps::before {
          content: '';
          position: absolute;
          top: 24px;
          left: calc(16.67% + 8px);
          right: calc(16.67% + 8px);
          height: 1px;
          background: rgba(0,0,0,0.15);
        }
        .lp-step {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.5s ease, transform 0.5s ease;
        }
        .lp-step.visible {
          opacity: 1;
          transform: translateY(0);
        }
        .lp-step-num {
          width: 48px; height: 48px;
          border-radius: 50%;
          background: var(--black);
          color: var(--green);
          font-family: var(--font-mono), 'IBM Plex Mono', monospace;
          font-size: 14px;
          font-weight: 500;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
          position: relative;
          z-index: 1;
        }
        .lp-step-title {
          font-family: var(--font-display), 'Instrument Sans', sans-serif;
          font-size: 20px;
          font-weight: 700;
          color: var(--black);
          margin-bottom: 12px;
          letter-spacing: -0.4px;
        }
        .lp-step-desc {
          font-size: 15px;
          color: #555;
          line-height: 1.65;
          margin-bottom: 16px;
        }
        .lp-step-detail {
          font-family: var(--font-mono), 'IBM Plex Mono', monospace;
          font-size: 11px;
          color: var(--diepgroen);
          letter-spacing: 0.07em;
          text-transform: uppercase;
        }
        @media (max-width: 768px) {
          .lp-hoe { padding: 80px 20px; border-radius: 12px 12px 0 0; }
          .lp-steps { grid-template-columns: 1fr; gap: 40px; }
          .lp-steps::before { display: none; }
        }

        /* ── RESULTATEN ── */
        .lp-resultaten {
          background: var(--black);
          padding: 100px 48px;
        }
        .lp-resultaten-inner {
          max-width: 1100px;
          margin: 0 auto;
        }
        .lp-results-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2px;
          margin-top: 60px;
        }
        .lp-result-card {
          background: #111;
          border: 1px solid #222;
          padding: 48px 40px;
          position: relative;
          overflow: hidden;
          transition: border-color 0.3s;
          opacity: 0;
          transform: translateY(20px);
          transition: border-color 0.3s, opacity 0.5s ease, transform 0.5s ease;
        }
        .lp-result-card.visible {
          opacity: 1;
          transform: translateY(0);
        }
        .lp-result-card:hover { border-color: rgba(58,222,106,0.3); }
        .lp-result-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: var(--green);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.4s ease;
        }
        .lp-result-card:hover::before { transform: scaleX(1); }
        .lp-result-num {
          font-family: var(--font-display), 'Instrument Sans', sans-serif;
          font-size: clamp(52px, 6vw, 72px);
          font-weight: 700;
          color: var(--green);
          line-height: 1;
          letter-spacing: -2px;
          display: block;
          margin-bottom: 12px;
        }
        .lp-result-label {
          font-family: var(--font-display), 'Instrument Sans', sans-serif;
          font-size: 17px;
          font-weight: 600;
          color: var(--white);
          margin-bottom: 10px;
        }
        .lp-result-desc {
          font-size: 14px;
          color: var(--veldsteen);
          line-height: 1.6;
          max-width: 320px;
        }
        @media (max-width: 768px) {
          .lp-resultaten { padding: 80px 20px; }
          .lp-results-grid { grid-template-columns: 1fr; }
          .lp-result-card { padding: 36px 24px; }
        }

        /* ── DESIGN PARTNER ── */
        .lp-partner {
          background: var(--black);
          padding: 100px 48px;
          border-top: 1px solid #1e1e1e;
        }
        .lp-partner-inner {
          max-width: 1100px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 80px;
          align-items: start;
        }
        .lp-partner-left p {
          font-size: 16px;
          color: rgba(255,255,255,0.55);
          line-height: 1.7;
          margin-bottom: 36px;
        }
        .lp-partner-h2 {
          font-family: var(--font-display), 'Instrument Sans', sans-serif;
          font-size: clamp(32px, 4.5vw, 52px);
          font-weight: 700;
          letter-spacing: -1.5px;
          line-height: 1.1;
          margin-bottom: 20px;
          color: var(--white);
        }
        .lp-partner-h2 .accent { color: var(--green); }
        .lp-perks {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .lp-perk {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 15px;
          color: rgba(255,255,255,0.8);
        }
        .lp-perk-check {
          width: 22px; height: 22px;
          border-radius: 50%;
          background: rgba(58,222,106,0.15);
          border: 1.5px solid var(--green);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .lp-partner-card {
          background: #161616;
          border: 1px solid #2a2a2a;
          border-radius: 16px;
          padding: 36px;
          position: sticky;
          top: 100px;
        }
        .lp-partner-badge {
          display: inline-block;
          font-family: var(--font-mono), 'IBM Plex Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--green);
          background: rgba(58,222,106,0.1);
          border: 1px solid rgba(58,222,106,0.2);
          padding: 5px 12px;
          border-radius: 100px;
          margin-bottom: 20px;
        }
        .lp-partner-price {
          font-family: var(--font-display), 'Instrument Sans', sans-serif;
          font-size: 42px;
          font-weight: 700;
          color: var(--white);
          letter-spacing: -1px;
          line-height: 1;
          margin-bottom: 6px;
        }
        .lp-partner-price span {
          font-size: 18px;
          font-weight: 400;
          color: var(--veldsteen);
          letter-spacing: 0;
        }
        .lp-partner-sub {
          font-family: var(--font-mono), 'IBM Plex Mono', monospace;
          font-size: 13px;
          color: var(--green);
          margin-bottom: 28px;
        }
        .lp-form-group { margin-bottom: 12px; }
        .lp-form-group input,
        .lp-form-group textarea {
          width: 100%;
          background: #0d0d0d;
          border: 1px solid #2a2a2a;
          border-radius: 8px;
          color: var(--white);
          font-family: var(--font-body), 'Work Sans', sans-serif;
          font-size: 14px;
          padding: 12px 16px;
          outline: none;
          transition: border-color 0.2s;
          resize: none;
        }
        .lp-form-group input::placeholder,
        .lp-form-group textarea::placeholder { color: #555; }
        .lp-form-group input:focus,
        .lp-form-group textarea:focus { border-color: rgba(58,222,106,0.4); }
        .lp-form-submit {
          width: 100%;
          background: var(--green);
          color: var(--black);
          font-family: var(--font-display), 'Instrument Sans', sans-serif;
          font-weight: 700;
          font-size: 15px;
          padding: 14px 24px;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.2s;
          margin-top: 6px;
          letter-spacing: -0.2px;
        }
        .lp-form-submit:hover:not(:disabled) { opacity: 0.85; transform: translateY(-1px); }
        .lp-form-submit:disabled { background: #1A7A3C; cursor: default; }
        .lp-form-note {
          font-family: var(--font-mono), 'IBM Plex Mono', monospace;
          font-size: 12px;
          color: #444;
          text-align: center;
          margin-top: 12px;
        }
        @media (max-width: 900px) {
          .lp-partner { padding: 80px 20px; }
          .lp-partner-inner { grid-template-columns: 1fr; gap: 48px; }
          .lp-partner-card { position: static; }
        }

        /* ── PRICING ── */
        .lp-pricing {
          background: #0d0d0d;
          padding: 100px 48px;
          border-top: 1px solid #1a1a1a;
          text-align: center;
        }
        .lp-pricing-inner {
          max-width: 800px;
          margin: 0 auto;
        }
        .lp-pricing-h2 {
          font-family: var(--font-display), 'Instrument Sans', sans-serif;
          font-size: clamp(32px, 4.5vw, 56px);
          font-weight: 700;
          letter-spacing: -1.5px;
          line-height: 1.1;
          margin-bottom: 16px;
          color: var(--white);
        }
        .lp-pricing-h2 .accent { color: var(--green); }
        .lp-pricing-sub {
          font-size: 16px;
          color: var(--veldsteen);
          margin-bottom: 60px;
        }
        .lp-pricing-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          text-align: left;
        }
        .lp-plan {
          background: #161616;
          border: 1px solid #232323;
          border-radius: 14px;
          padding: 36px 32px;
          transition: border-color 0.3s;
        }
        .lp-plan.featured {
          border-color: rgba(58,222,106,0.35);
          background: #181f1b;
        }
        .lp-plan-name {
          font-family: var(--font-display), 'Instrument Sans', sans-serif;
          font-size: 13px;
          font-weight: 600;
          color: var(--veldsteen);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .lp-plan-badge {
          font-family: var(--font-mono), 'IBM Plex Mono', monospace;
          font-size: 10px;
          color: var(--green);
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .lp-plan-price {
          font-family: var(--font-display), 'Instrument Sans', sans-serif;
          font-size: 40px;
          font-weight: 700;
          color: var(--white);
          letter-spacing: -1.5px;
          line-height: 1;
          margin-bottom: 6px;
        }
        .lp-plan-price sub {
          font-size: 16px;
          font-weight: 400;
          color: var(--veldsteen);
          vertical-align: middle;
          letter-spacing: 0;
        }
        .lp-plan-desc {
          font-size: 13px;
          color: var(--veldsteen);
          margin-bottom: 28px;
          min-height: 32px;
        }
        .lp-plan-features {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 28px;
          padding: 0;
        }
        .lp-plan-features li {
          font-size: 14px;
          color: rgba(255,255,255,0.7);
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .lp-plan-features li::before {
          content: '';
          width: 5px; height: 5px;
          border-radius: 50%;
          background: var(--green);
          flex-shrink: 0;
        }
        .lp-plan-cta {
          display: block;
          text-align: center;
          padding: 13px;
          border-radius: 8px;
          font-family: var(--font-display), 'Instrument Sans', sans-serif;
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s;
          cursor: pointer;
          border: none;
          width: 100%;
        }
        .lp-plan-cta.outline {
          border: 1px solid #333;
          color: var(--white);
          background: transparent;
        }
        .lp-plan-cta.outline:hover { border-color: var(--green); color: var(--green); }
        .lp-plan-cta.solid {
          background: var(--green);
          color: var(--black);
        }
        .lp-plan-cta.solid:hover { opacity: 0.85; }
        @media (max-width: 640px) {
          .lp-pricing { padding: 80px 20px; }
          .lp-pricing-row { grid-template-columns: 1fr; }
        }

        /* ── FOOTER ── */
        .lp-footer {
          padding: 40px 48px;
          background: var(--black);
          border-top: 1px solid #1a1a1a;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }
        .lp-footer-logo {
          display: flex;
          align-items: center;
        }
        .lp-footer-links {
          display: flex;
          align-items: center;
          gap: 24px;
        }
        .lp-footer-links a {
          font-size: 13px;
          color: var(--veldsteen);
          text-decoration: none;
          transition: color 0.2s;
        }
        .lp-footer-links a:hover { color: var(--white); }
        @media (max-width: 640px) {
          .lp-footer { padding: 32px 20px; flex-direction: column; align-items: flex-start; }
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
            <img src="/Logo Quoter.svg" alt="Quoter" style={{ height: 28 }} />
          </a>
          <div className="lp-nav-right">
            <Link href="/login" className="lp-nav-login">Inloggen</Link>
            <a href="#partner" className="lp-nav-cta">Aanmelden &rarr;</a>
          </div>
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
        {/* HOE HET WERKT */}
        <section id="hoe" className="lp-hoe">
          <div className="lp-hoe-inner">
            <span className="lp-section-label">Hoe het werkt</span>
            <h2 className="lp-hoe-h2">
              Drie stappen.<br />
              <span className="accent">Offerte verstuurd.</span>
            </h2>
            <div className="lp-steps">
              <div className="lp-step">
                <div className="lp-step-num">01</div>
                <div className="lp-step-title">Stuur een foto of PDF</div>
                <p className="lp-step-desc">Een foto van de tekening, een voice-memo van de bouwplaats of een PDF. Dat is alles wat Quoter nodig heeft.</p>
                <div className="lp-step-detail">→ Foto / Spraak / PDF</div>
              </div>
              <div className="lp-step">
                <div className="lp-step-num">02</div>
                <div className="lp-step-title">AI maakt de offerte</div>
                <p className="lp-step-desc">Binnen 10 minuten staat er een volledige, professionele offerte klaar — inclusief materialen, uren en marge.</p>
                <div className="lp-step-detail">→ ~10 minuten</div>
              </div>
              <div className="lp-step">
                <div className="lp-step-num">03</div>
                <div className="lp-step-title">Aanpassen &amp; versturen</div>
                <p className="lp-step-desc">Alles is bewerkbaar. Logo erbij, uitsluitingen toevoegen, en met één klik versturen naar je klant.</p>
                <div className="lp-step-detail">→ PDF / Link / Dashboard</div>
              </div>
            </div>
          </div>
        </section>

        {/* RESULTATEN */}
        <section id="resultaten" className="lp-resultaten">
          <div className="lp-resultaten-inner">
            <span className="lp-section-label">Resultaten</span>
            <h2 className="lp-h2">
              Getallen die<br />voor zichzelf spreken.
            </h2>
            <div className="lp-results-grid">
              <div className="lp-result-card">
                <span className="lp-result-num">5+</span>
                <div className="lp-result-label">uur per week minder administratie</div>
                <p className="lp-result-desc">Tijd die je terugkrijgt. Voor je gezin, voor je bedrijf, voor jezelf.</p>
              </div>
              <div className="lp-result-card">
                <span className="lp-result-num">80%</span>
                <div className="lp-result-label">sneller je offerte verstuurd</div>
                <p className="lp-result-desc">De bouwplaats verlaten en de offerte staat al klaar. Zonder een avond te verliezen.</p>
              </div>
              <div className="lp-result-card">
                <span className="lp-result-num">€0</span>
                <div className="lp-result-label">meerwerk onbetaald gelaten</div>
                <p className="lp-result-desc">Elke wijziging op de bouw, elk extra uur — Quoter vangt het op. Altijd.</p>
              </div>
              <div className="lp-result-card">
                <span className="lp-result-num">10 min</span>
                <div className="lp-result-label">van input naar verzonden offerte</div>
                <p className="lp-result-desc">Foto insturen, koffie pakken. Offerte staat klaar voordat de koffie koud is.</p>
              </div>
            </div>
          </div>
        </section>

        {/* DESIGN PARTNER */}
        <section id="partner" className="lp-partner">
          <div className="lp-partner-inner">
            <div className="lp-partner-left">
              <span className="lp-section-label">Design Partner Programma</span>
              <h2 className="lp-partner-h2">
                Wees één van de<br />eerste <span className="accent">3 bouwers.</span>
              </h2>
              <p>We zoeken drie aannemers die als eerste mogen testen. Jij krijgt volledige toegang en levenslange korting. Wij vragen 10 minuten feedback per week. Dat is alles.</p>
              <div className="lp-perks">
                {[
                  'Volledige toegang tot Quoter',
                  'Onbeperkt offertes genereren',
                  'Directe lijn met het team',
                  'Levenslange korting als founding user',
                  'Eerste 2 weken volledig gratis',
                ].map((perk) => (
                  <div key={perk} className="lp-perk">
                    <div className="lp-perk-check">
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4l2.5 3L9 1" stroke="#3ADE6A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    {perk}
                  </div>
                ))}
              </div>
            </div>

            <div className="lp-partner-card">
              <span className="lp-partner-badge">Beperkte plaatsen</span>
              <div className="lp-partner-price">Gratis <span>/ 2 weken</span></div>
              <div className="lp-partner-sub">Daarna €49 /maand &bull; Founding user korting</div>
              {formSubmitted ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#3ADE6A', fontFamily: 'var(--font-mono)', fontSize: '14px' }}>
                  Aanmelding ontvangen ✓<br />
                  <span style={{ color: '#555', fontSize: '12px', marginTop: 8, display: 'block' }}>We nemen binnen 24 uur contact op.</span>
                </div>
              ) : (
                <>
                  <div className="lp-form-group">
                    <input type="text" placeholder="Je naam" value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="lp-form-group">
                    <input type="text" placeholder="Bedrijfsnaam" value={formData.company} onChange={e => setFormData(f => ({ ...f, company: e.target.value }))} />
                  </div>
                  <div className="lp-form-group">
                    <input type="email" placeholder="E-mailadres" value={formData.email} onChange={e => setFormData(f => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div className="lp-form-group">
                    <input type="tel" placeholder="Telefoonnummer (optioneel)" value={formData.phone} onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))} />
                  </div>
                  <div className="lp-form-group">
                    <textarea rows={3} placeholder="Kort: wat voor klussen doe je? (optioneel)" value={formData.info} onChange={e => setFormData(f => ({ ...f, info: e.target.value }))} />
                  </div>
                  <button
                    className="lp-form-submit"
                    onClick={() => { if (formData.name.trim() && formData.email.trim()) setFormSubmitted(true) }}
                  >
                    Meld me aan als Design Partner &rarr;
                  </button>
                  <div className="lp-form-note">We nemen binnen 24 uur contact op.</div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" className="lp-pricing">
          <div className="lp-pricing-inner">
            <span className="lp-section-label" style={{ display: 'block', marginBottom: 20 }}>Prijzen</span>
            <h2 className="lp-pricing-h2">Simpel. <span className="accent">Eerlijk.</span></h2>
            <p className="lp-pricing-sub">Geen verrassingen. Geen verborgen kosten.</p>
            <div className="lp-pricing-row">
              <div className="lp-plan">
                <div className="lp-plan-name">Gratis</div>
                <div className="lp-plan-price">€0 <sub>/maand</sub></div>
                <div className="lp-plan-desc">Om te voelen hoe het werkt.</div>
                <ul className="lp-plan-features">
                  <li>3 offertes genereren</li>
                  <li>PDF download</li>
                  <li>Deelbare link</li>
                </ul>
                <Link href="/auth/signup" className="lp-plan-cta outline">Gratis starten</Link>
              </div>
              <div className="lp-plan featured">
                <div className="lp-plan-name">
                  Pro
                  <span className="lp-plan-badge">— Aanbevolen</span>
                </div>
                <div className="lp-plan-price">€49 <sub>/maand</sub></div>
                <div className="lp-plan-desc">Voor de aannemer die tijd terugwil.</div>
                <ul className="lp-plan-features">
                  <li>Onbeperkt offertes</li>
                  <li>PDF, link &amp; dashboard</li>
                  <li>Eigen logo &amp; huisstijl</li>
                  <li>Marge-inzicht per project</li>
                  <li>Prioriteit support</li>
                </ul>
                <Link href="#partner" className="lp-plan-cta solid">Pro starten &rarr;</Link>
              </div>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="lp-footer">
          <div className="lp-footer-logo">
            <img src="/Logo Quoter.svg" alt="Quoter" style={{ height: 24 }} />
          </div>
          <div className="lp-footer-links">
            <a href="mailto:hallo@quoter.nl">hallo@quoter.nl</a>
            <a href="/privacy">Privacy</a>
            <a href="/voorwaarden">Voorwaarden</a>
          </div>
        </footer>
      </div>
    </>
  )
}
