'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { Task } from '@/types'
import { useTheme } from '@/contexts/ThemeContext'
import { formatEstimatedTime } from '@/utils/timeFormatting'
import { useToDoStore } from '@/store/toDoStore'

interface CompletionStateProps {
  tasks: Task[]
}

export default function CompletionState({ tasks }: CompletionStateProps) {
  const { theme } = useTheme()
  const currentListId = useToDoStore((state) => state.currentListId)
  const [hasSeenAnimation, setHasSeenAnimation] = useState(false)

  // Check if user has seen the completion animation for this list
  useEffect(() => {
    if (currentListId) {
      const seenKey = `completion-animation-seen-${currentListId}`
      const seen = localStorage.getItem(seenKey)
      setHasSeenAnimation(seen === 'true')

      // Mark as seen after component mounts (animation will have played)
      if (!seen) {
        // Wait for animation to complete before marking as seen
        setTimeout(() => {
          localStorage.setItem(seenKey, 'true')
        }, 4000) // After all animations complete
      }
    }
  }, [currentListId])

  // Filter to only today's completed tasks
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const todaysTasks = tasks
    .filter(task =>
      task.isCompleted &&
      task.completedAt &&
      new Date(task.completedAt) >= todayStart
    )
    .sort((a, b) =>
      new Date(a.completedAt!).getTime() - new Date(b.completedAt!).getTime()
    )

  const containerVariants = {
    hidden: { opacity: hasSeenAnimation ? 1 : 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: hasSeenAnimation ? 0 : 0.1,
        delayChildren: hasSeenAnimation ? 0 : 3.2
      }
    }
  }

  const cardVariants = {
    hidden: { opacity: hasSeenAnimation ? 1 : 0, y: hasSeenAnimation ? 0 : 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: hasSeenAnimation ? 0 : 0.3
      }
    }
  }

  return (
    <motion.div
      className="w-full flex flex-col items-center"
      initial={{ opacity: hasSeenAnimation ? 1 : 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: hasSeenAnimation ? 0 : 0.8, delay: hasSeenAnimation ? 0 : 2 }}
    >
      {/* White section with subtitle and tasks */}
      <motion.div
        className="w-full max-w-[520px] rounded-b-[40px] px-8 py-8"
        style={{ backgroundColor: 'var(--color-todoloo-card)' }}
        initial={{ opacity: hasSeenAnimation ? 1 : 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: hasSeenAnimation ? 0 : 0.5, delay: hasSeenAnimation ? 0 : 2.8 }}
      >
        <motion.p
          className="text-lg text-center mb-8"
          style={{
            fontFamily: 'Outfit',
            color: 'var(--color-todoloo-text-primary)'
          }}
          initial={{ opacity: hasSeenAnimation ? 1 : 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: hasSeenAnimation ? 0 : 0.5, delay: hasSeenAnimation ? 0 : 3 }}
        >
          You did {todaysTasks.length} thing{todaysTasks.length !== 1 ? 's' : ''} today
        </motion.p>

        {/* Completed Tasks List */}
        {todaysTasks.length > 0 ? (
          <motion.div
            className="w-full flex flex-col gap-4"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {todaysTasks.map((task, index) => (
              <motion.div
                key={task.id}
                variants={cardVariants}
                className="w-full rounded-[20px] shadow-[2px_2px_4px_rgba(0,0,0,0.15)] p-6"
                style={{ backgroundColor: 'var(--color-todoloo-task)' }}
              >
                <div className="flex items-center gap-6">
                  {/* Number */}
                  <div className="flex items-center justify-center w-[32px]">
                    <span
                      className="font-normal"
                      style={{
                        color: 'var(--color-todoloo-text-muted)',
                        fontSize: 28,
                        fontFamily: 'Outfit'
                      }}
                    >
                      {index + 1}
                    </span>
                  </div>

                  {/* Task Info */}
                  <div className="flex-1">
                    <p
                      className="text-base font-medium mb-1"
                      style={{
                        color: 'var(--color-todoloo-text-primary)',
                        fontFamily: 'Outfit'
                      }}
                    >
                      {task.description}
                    </p>
                    <p
                      className="text-sm"
                      style={{
                        color: 'var(--color-todoloo-text-secondary)',
                        fontFamily: 'Outfit',
                        fontWeight: 400
                      }}
                    >
                      {task.actualMinutes
                        ? formatEstimatedTime(task.actualMinutes)
                        : formatEstimatedTime(task.estimatedMinutes)
                      }
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.p
            className="text-lg text-center"
            style={{
              fontFamily: 'Outfit',
              color: 'var(--color-todoloo-text-secondary)'
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 3.2 }}
          >
            Nothing completed today yet
          </motion.p>
        )}
      </motion.div>
    </motion.div>
  )
}
