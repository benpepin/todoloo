'use client'

interface AnimatedBorderProps {
  children: React.ReactNode
  isActive: boolean
  className?: string
}

export default function AnimatedBorder({ children, isActive, className = '' }: AnimatedBorderProps) {
  return <>{children}</>
}