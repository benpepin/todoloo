'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
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
    <div className="w-full">
      {/* Track Container */}
      <div
        className="relative w-full overflow-hidden"
        style={{
          height: 160
        }}
      >
        {/* Sky background */}
        <div
          className="absolute top-0 left-0 right-0"
          style={{
            height: 125,
            top: 0,
            background: '#79C7FD'
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
            height: 35,
            background: '#103F2A'
          }}
        />

        {/* Lighter green grass layer (top) */}
        <div
          className="absolute bottom-0 left-0 right-0"
          style={{
            height: 30,
            background: '#009959'
          }}
        />

        {/* Finish line */}
        <div
          className="absolute right-0 bottom-0 flex flex-col"
          style={{
            width: 12,
            height: 35,
            background: 'repeating-linear-gradient(0deg, #000, #000 6px, #fff 6px, #fff 12px)'
          }}
        />

        {/* Shopping Cart */}
        <div
          className="absolute transition-all duration-500 ease-out"
          style={{
            left: `${Math.min(progress, 92)}%`,
            top: 14,
            transform: 'translateX(-50%)',
            width: 160,
            height: 160
          }}
        >
          <Image
            src={getCartImage()}
            alt="Shopping cart"
            width={160}
            height={160}
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
