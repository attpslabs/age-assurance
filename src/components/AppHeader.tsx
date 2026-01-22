'use client'

import React, { useRef, useState } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'

const StarIcon = () => (
  <svg width="40" height="40" viewBox="0 0 150 148" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M75 0L76.2683 34.2209C77.0442 55.1571 93.8432 71.9475 114.78 72.7127L150 74L114.78 75.2873C93.8432 76.0525 77.0442 92.8429 76.2683 113.779L75 148L73.7317 113.779C72.9558 92.8429 56.1568 76.0525 35.2202 75.2873L0 74L35.2202 72.7127C56.1568 71.9475 72.9558 55.1571 73.7317 34.2209L75 0Z" fill="currentColor"/>
  </svg>
)

interface AppHeaderProps {
  variant?: 'light' | 'dark'
}

export function AppHeader({ variant = 'light' }: AppHeaderProps) {
  const ref = useRef<HTMLUListElement>(null)
  const [left, setLeft] = useState(0)
  const [width, setWidth] = useState(0)
  const [opacity, setOpacity] = useState(0)

  const handleMouseEnter = (e: React.MouseEvent<HTMLLIElement>) => {
    const node = e.currentTarget
    const rect = node.getBoundingClientRect()
    setLeft(node.offsetLeft)
    setWidth(rect.width)
    setOpacity(1)
  }

  const handleMouseLeave = () => {
    setOpacity(0)
  }

  const navs = [
    { line1: "Manage", line2: "Attestations", href: "/attestations" },
    { line1: "Test", line2: "Playground", href: "/playground/assure" },
  ]

  const starColorClass = variant === 'dark'
    ? 'text-orange-500 hover:text-orange-400'
    : 'text-white hover:text-white/80'

  const headerBgClass = variant === 'dark' ? 'bg-black' : ''

  return (
    <header className={`w-full py-6 sticky top-0 z-50 ${headerBgClass}`}>
      <div className="relative mx-auto flex w-fit items-center">
        <Link href="/assure" className={`absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-20 transition-colors ${starColorClass}`}>
          <StarIcon />
        </Link>

        <ul
          onMouseLeave={handleMouseLeave}
          className="relative flex w-fit rounded-full border border-white/20 p-1.5 backdrop-blur-md bg-black/30"
          ref={ref}
        >
          {navs.map((item, index) => (
            <React.Fragment key={item.line1}>
              <li
                onMouseEnter={handleMouseEnter}
                className="hover:text-primary text-primary/60 z-10 block cursor-pointer px-4 py-1.5 text-xs font-medium tracking-tight transition-colors duration-200 w-24 text-center"
              >
                <Link href={item.href} className="flex flex-col leading-tight">
                  <span>{item.line1}</span>
                  <span>{item.line2}</span>
                </Link>
              </li>
              {index === 0 && <li className="w-14" />}
            </React.Fragment>
          ))}
          <motion.li
            animate={{ left, width, opacity }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="absolute top-1.5 bottom-1.5 rounded-full bg-white/20"
          />
        </ul>
      </div>
    </header>
  )
}
