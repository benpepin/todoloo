'use client'

import { ReactNode } from 'react'
import { DndContext, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { useToDoStore } from '@/store/toDoStore'

interface DragDropProviderProps {
  children: ReactNode
  onDragEnd: (event: DragEndEvent) => void
}

export function DragDropProvider({ children, onDragEnd }: DragDropProviderProps) {
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  )

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      {children}
    </DndContext>
  )
}
