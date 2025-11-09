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
    <div className="w-full">
      {/* Track Container */}
      <div
        className="relative w-full overflow-hidden"
        style={{
          height: 180
        }}
      >
        {/* Sky background */}
        <div
          className="absolute top-0 left-0 right-0"
          style={{
            height: 140,
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
            height: 50,
            background: '#103F2A',
            boxShadow: '0px -1px 2px rgba(0, 0, 0, 0.15)'
          }}
        />

        {/* Lighter green grass layer (top) */}
        <div
          className="absolute bottom-0 left-0 right-0"
          style={{
            height: 42,
            background: '#009959',
            boxShadow: '0px -3px 4px rgba(0, 0, 0, 0.25)'
          }}
        />

        {/* Finish line */}
        <div
          className="absolute right-0 bottom-0 flex flex-col"
          style={{
            width: 12,
            height: 50,
            background: 'repeating-linear-gradient(0deg, #000, #000 6px, #fff 6px, #fff 12px)'
          }}
        />

        {/* Horse and Jockey */}
        <div
          className="absolute transition-all duration-500 ease-out"
          style={{
            left: `${Math.min(progress, 92)}%`,
            top: 30,
            transform: 'translateX(-50%)',
            width: 160,
            height: 160
          }}
        >
          <Image
            src="/horse.png"
            alt="Horse and jockey"
            width={160}
            height={160}
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
