'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useToDoStore } from '@/store/toDoStore'

const CHARACTERS = [
  { name: 'horse', src: '/horse.png', alt: 'Horse and jockey' },
  { name: 'biker', src: '/biker.png', alt: 'Biker' },
  { name: 'bear', src: '/bear.png', alt: 'Bear' }
]

export default function HorseRaceProgress() {
  const tasks = useToDoStore((state) => state.tasks)
  const activeTaskId = useToDoStore((state) => state.activeTaskId)
  const [prevProgress, setPrevProgress] = useState(0)
  const [isGalloping, setIsGalloping] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [characterIndex, setCharacterIndex] = useState(0)

  // Load saved character preference
  useEffect(() => {
    const saved = localStorage.getItem('progressCharacter')
    if (saved) {
      const index = CHARACTERS.findIndex(c => c.name === saved)
      if (index !== -1) setCharacterIndex(index)
    }
  }, [])

  // Detect dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'))
    }

    checkDarkMode()

    // Watch for theme changes
    const observer = new MutationObserver(checkDarkMode)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })

    return () => observer.disconnect()
  }, [])

  // Cycle to next character
  const handleCharacterClick = () => {
    const nextIndex = (characterIndex + 1) % CHARACTERS.length
    setCharacterIndex(nextIndex)
    localStorage.setItem('progressCharacter', CHARACTERS[nextIndex].name)
  }

  // Calculate progress
  const totalTasks = tasks.length
  const completedTasks = tasks.filter(task => task.isCompleted).length
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

  // Check if we should show sprite animation (biker + active task)
  const isBikerActive = CHARACTERS[characterIndex].name === 'biker' && activeTaskId !== null

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
          height: 160
        }}
      >
        {/* Sky background */}
        <div
          className="absolute top-0 left-0 right-0"
          style={{
            height: 125,
            top: 0,
            background: isDarkMode ? '#1a1a2e' : '#79C7FD'
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: isDarkMode ? 'url(/nightsky.png)' : 'url(/sky.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: isDarkMode ? 1 : 0.6
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

        {/* Character */}
        <div
          className="absolute transition-all duration-500 ease-out cursor-pointer"
          style={{
            left: `${Math.min(progress, 92)}%`,
            top: 14,
            transform: 'translateX(-50%)',
            width: 160,
            height: 160
          }}
          onClick={handleCharacterClick}
          title="Click to change character"
        >
          {isBikerActive ? (
            // Biker sprite animation when task is active
            <div
              className="animate-bike-sprite"
              style={{
                width: 160,
                height: 160,
                backgroundImage: 'url(/bike-sprite.png)',
                backgroundSize: '400% 400%', // 4x4 grid = 400% in each direction
                backgroundPosition: '0% 0%'
              }}
            />
          ) : (
            // Static image for other characters or inactive biker
            <Image
              src={CHARACTERS[characterIndex].src}
              alt={CHARACTERS[characterIndex].alt}
              width={160}
              height={160}
              className={isGalloping ? 'animate-gallop' : ''}
              style={{ display: 'block' }}
            />
          )}
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

        @keyframes bike-sprite {
          0% { background-position: 0% 0%; }
          6.25% { background-position: 33.33% 0%; }
          12.5% { background-position: 66.66% 0%; }
          18.75% { background-position: 100% 0%; }
          25% { background-position: 0% 33.33%; }
          31.25% { background-position: 33.33% 33.33%; }
          37.5% { background-position: 66.66% 33.33%; }
          43.75% { background-position: 100% 33.33%; }
          50% { background-position: 0% 66.66%; }
          56.25% { background-position: 33.33% 66.66%; }
          62.5% { background-position: 66.66% 66.66%; }
          68.75% { background-position: 100% 66.66%; }
          75% { background-position: 0% 100%; }
          81.25% { background-position: 33.33% 100%; }
          87.5% { background-position: 66.66% 100%; }
          93.75% { background-position: 100% 100%; }
          100% { background-position: 0% 0%; }
        }

        .animate-bike-sprite {
          animation: bike-sprite 1.6s steps(1) infinite;
        }
      `}</style>
    </div>
  )
}
