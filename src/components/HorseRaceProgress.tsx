'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useToDoStore } from '@/store/toDoStore'

export default function HorseRaceProgress() {
  const tasks = useToDoStore((state) => state.tasks)
  const [prevProgress, setPrevProgress] = useState(0)
  const [isGalloping, setIsGalloping] = useState(false)

  // Calculate progress
  const totalTasks = tasks.length
  const completedTasks = tasks.filter(task => task.isCompleted).length
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

  // Trigger galloping animation when progress changes
  useEffect(() => {
    if (progress > prevProgress && progress > 0) {
      setIsGalloping(true)
      const timer = setTimeout(() => {
        setIsGalloping(false)
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

        {/* Horse and Jockey */}
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
          <Image
            src="/horse.png"
            alt="Horse and jockey"
            width={95}
            height={100}
            className={isGalloping ? 'animate-gallop' : ''}
            style={{ display: 'block' }}
          />
        </div>

      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes gallop {
          0%, 100% { transform: translateY(0px); }
          25% { transform: translateY(-8px); }
          50% { transform: translateY(-2px); }
          75% { transform: translateY(-10px); }
        }

        .animate-gallop {
          animation: gallop 0.3s ease-in-out 2;
        }
      `}</style>
    </div>
  )
}
