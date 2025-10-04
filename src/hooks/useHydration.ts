'use client'

import { useEffect, useState } from 'react'

export function useHydration() {
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    // Immediately set hydrated to true for client-side rendering
    setIsHydrated(true)
  }, [])

  return isHydrated
}
