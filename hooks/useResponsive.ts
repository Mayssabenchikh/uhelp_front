import { useState, useEffect } from 'react'

type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

const breakpoints = {
  xs: 475,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
}

/**
 * Custom hook for responsive breakpoints
 * Provides current breakpoint and utility booleans for responsive behavior
 */
export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('lg')

  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth
      if (width >= breakpoints['2xl']) setBreakpoint('2xl')
      else if (width >= breakpoints.xl) setBreakpoint('xl')
      else if (width >= breakpoints.lg) setBreakpoint('lg')
      else if (width >= breakpoints.md) setBreakpoint('md')
      else if (width >= breakpoints.sm) setBreakpoint('sm')
      else setBreakpoint('xs')
    }

    updateBreakpoint()
    window.addEventListener('resize', updateBreakpoint)
    return () => window.removeEventListener('resize', updateBreakpoint)
  }, [])

  return {
    breakpoint,
    isMobile: breakpoint === 'xs' || breakpoint === 'sm',
    isTablet: breakpoint === 'md',
    isDesktop: breakpoint === 'lg' || breakpoint === 'xl' || breakpoint === '2xl',
    isLarge: breakpoint === '2xl',
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    // Utility functions
    isAtLeast: (bp: Breakpoint) => {
      const currentWidth = typeof window !== 'undefined' ? window.innerWidth : 1024
      return currentWidth >= breakpoints[bp]
    },
    isBelow: (bp: Breakpoint) => {
      const currentWidth = typeof window !== 'undefined' ? window.innerWidth : 1024
      return currentWidth < breakpoints[bp]
    }
  }
}

/**
 * Custom hook for managing mobile menu state
 * Automatically closes menu when screen becomes desktop size
 */
export function useMobileMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const { isDesktop } = useBreakpoint()

  useEffect(() => {
    if (isDesktop && isOpen) {
      setIsOpen(false)
    }
  }, [isDesktop, isOpen])

  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll when menu is open
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = 'unset'
      }
    }
  }, [isOpen])

  return {
    isOpen,
    toggle: () => setIsOpen(prev => !prev),
    close: () => setIsOpen(false),
    open: () => setIsOpen(true)
  }
}
