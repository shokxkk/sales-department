'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface NerionLogoProps {
  size?: number | string
  showText?: boolean
  className?: string
  textClassName?: string
  glow?: boolean
}

export function NerionLogo({
  size = 36,
  showText = true,
  className,
  textClassName,
  glow = true,
}: NerionLogoProps) {
  return (
    <div className={cn('inline-flex items-center gap-3 select-none', className)}>
      {/* Fraganus AI Logo Icon */}
      <div
        className={cn(
          'relative flex-shrink-0 flex items-center justify-center transition-transform duration-300 group-hover:scale-105',
          glow && 'drop-shadow-[0_0_12px_rgba(216,255,56,0.4)]'
        )}
        style={{ width: size, height: size }}
      >
        <svg
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          <defs>
            <linearGradient id="fraganusNeon" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#E2FF54" />
              <stop offset="100%" stopColor="#B2FF1A" />
            </linearGradient>
          </defs>

          {/* Top Crescent Arc */}
          <path
            d="M 40 45 C 70 25, 130 25, 160 45 C 135 38, 65 38, 40 45 Z"
            fill="url(#fraganusNeon)"
          />

          {/* Vertical Left Stem of F */}
          <rect x="62" y="60" width="16" height="95" rx="3" fill="url(#fraganusNeon)" />
          <rect x="80" y="60" width="8" height="95" rx="2" fill="url(#fraganusNeon)" />

          {/* Top Horizontal Bar of F */}
          <path
            d="M 62 60 L 140 60 C 145 60, 150 63, 145 70 C 140 76, 130 76, 62 76 Z"
            fill="url(#fraganusNeon)"
          />

          {/* Middle Bar of F */}
          <rect x="94" y="98" width="30" height="12" rx="2" fill="url(#fraganusNeon)" />

          {/* Orbital Ring surrounding F */}
          <ellipse
            cx="100"
            cy="110"
            rx="80"
            ry="45"
            stroke="url(#fraganusNeon)"
            strokeWidth="3.5"
            fill="none"
            transform="rotate(-18 100 110)"
          />

          {/* Dot on Orbit */}
          <circle cx="168" cy="115" r="7" fill="url(#fraganusNeon)" />
        </svg>
      </div>

      {/* Brand Text FRAGANUS AI */}
      {showText && (
        <div className="flex flex-col">
          <span
            className={cn(
              'font-black text-foreground text-base leading-none uppercase font-sans transition-colors flex items-center gap-1.5',
              glow && 'glow-text',
              textClassName
            )}
            style={{ letterSpacing: '0.18em' }}
          >
            FRAGANUS <span style={{ color: '#D8FF38' }}>AI</span>
          </span>
          <span className="text-[8px] font-bold text-primary/80 uppercase tracking-[0.22em] mt-1">
            AI Sales Intelligence
          </span>
        </div>
      )}
    </div>
  )
}
