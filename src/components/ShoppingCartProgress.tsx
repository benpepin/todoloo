'use client'

import { useEffect, useState } from 'react'
import { useToDoStore } from '@/store/toDoStore'

export default function ShoppingCartProgress() {
  const tasks = useToDoStore((state) => state.tasks)
  const [prevProgress, setPrevProgress] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  // Calculate progress
  const totalTasks = tasks.length
  const completedTasks = tasks.filter(task => task.isCompleted).length
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

  // Determine which cart image to show based on progress
  const getCartImage = () => {
    if (progress < 25) {
      return '/empty-cart.png'
    } else if (progress < 80) {
      return '/half-full-cart.png'
    } else {
      return '/overflowing-cart.png'
    }
  }

  // Trigger animation when progress changes
  useEffect(() => {
    if (progress > prevProgress && progress > 0) {
      setIsAnimating(true)
      const timer = setTimeout(() => {
        setIsAnimating(false)
      }, 600) // Match animation duration
      return () => clearTimeout(timer)
    }
    setPrevProgress(progress)
  }, [progress, prevProgress])

  // Don't show if no tasks
  if (totalTasks === 0) {
    return null
  }

  return (
    <div className="w-full max-w-[460px] mb-6">
      {/* Track Container */}
      <div
        className="relative w-full overflow-hidden"
        style={{
          height: 85,
          borderRadius: 10
        }}
      >
        {/* Sky background */}
        <div
          className="absolute top-0 left-0 right-0"
          style={{
            height: 65,
            top: 0,
            background: '#79C7FD',
            borderRadius: 10
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'url(/sky.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: 0.6
            }}
          />
        </div>

        {/* Dark green grass layer (bottom) */}
        <div
          className="absolute bottom-0 left-0 right-0"
          style={{
            height: 28,
            background: '#103F2A',
            boxShadow: '0px -1px 2px rgba(0, 0, 0, 0.15)'
          }}
        />

        {/* Lighter green grass layer (top) */}
        <div
          className="absolute bottom-0 left-0 right-0"
          style={{
            height: 24,
            background: '#009959',
            boxShadow: '0px -3px 4px rgba(0, 0, 0, 0.25)'
          }}
        />

        {/* Finish line */}
        <div
          className="absolute right-0 bottom-0 flex flex-col"
          style={{
            width: 8,
            height: 28,
            background: 'repeating-linear-gradient(0deg, #000, #000 4px, #fff 4px, #fff 8px)'
          }}
        />

        {/* Shopping Cart */}
        <div
          className="absolute transition-all duration-500 ease-out"
          style={{
            left: `${Math.min(progress, 92)}%`,
            top: 0,
            transform: 'translateX(-50%)',
            width: 95,
            height: 100
          }}
        >
          <img
            src={getCartImage()}
            alt="Shopping cart"
            width={95}
            height={100}
            className={isAnimating ? 'animate-cart-bounce' : ''}
            style={{ display: 'block' }}
          />
        </div>

      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes cart-bounce {
          0%, 100% { transform: translateY(0px); }
          25% { transform: translateY(-8px); }
          50% { transform: translateY(-2px); }
          75% { transform: translateY(-10px); }
        }

        .animate-cart-bounce {
          animation: cart-bounce 0.3s ease-in-out 2;
        }
      `}</style>
    </div>
  )
}
