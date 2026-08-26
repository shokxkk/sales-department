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
  size = 32,
  showText = true,
  className,
  textClassName,
  glow = true,
}: NerionLogoProps) {
  return (
    <div className={cn('inline-flex items-center gap-3 select-none', className)}>
      {/* Stylized Futuristic Neon "N" Icon */}
      <div
        className={cn(
          'relative flex-shrink-0 flex items-center justify-center transition-transform duration-300 group-hover:scale-105',
          glow && 'drop-shadow-[0_0_12px_rgba(178,255,26,0.4)]'
        )}
        style={{ width: size, height: size }}
      >
        <svg
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Background subtle glow effect */}
          <defs>
            <linearGradient id="nerionNeon" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#d4ff26" />
              <stop offset="50%" stopColor="#b4ff1a" />
              <stop offset="100%" stopColor="#8ce600" />
            </linearGradient>
            <filter id="nerionGlow" x1="-20%" y1="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Left Vertical / Upper Diagonal Segment of N */}
          <path
            d="M24 20 L52 20 L52 44 L38 60 L24 60 Z"
            fill="url(#nerionNeon)"
          />
          <path
            d="M24 20 L24 100 L38 100 L38 48 Z"
            fill="url(#nerionNeon)"
          />

          {/* Dynamic Intersecting Blade Slash Top-Right to Bottom-Left */}
          <polygon
            points="102,12 106,16 16,108 12,104"
            fill="url(#nerionNeon)"
          />

          {/* Intersecting Cross Slash Bottom-Right to Top-Left */}
          <polygon
            points="38,50 96,104 90,108 34,54"
            fill="url(#nerionNeon)"
          />

          {/* Right Vertical Segment */}
          <path
            d="M82 48 L96 48 L96 100 L68 100 L68 76 L82 60 Z"
            fill="url(#nerionNeon)"
          />
        </svg>
      </div>

      {/* Brand Text NERION */}
      {showText && (
        <div className="flex flex-col">
          <span
            className={cn(
              'font-black tracking-[0.25em] text-foreground text-base leading-none uppercase font-sans transition-colors',
              glow && 'glow-text',
              textClassName
            )}
            style={{ letterSpacing: '0.28em' }}
          >
            NERION
          </span>
          <span className="text-[8px] font-bold text-primary/80 uppercase tracking-[0.22em] mt-1">
            AI Sales Control
          </span>
        </div>
      )}
    </div>
  )
}
