'use client'

import { getCurrentDate } from '@/utils/timeUtils'
import { useTaskStore } from '@/store/taskStore'

export default function Header() {
  const toggleCreateTask = useTaskStore((state) => state.toggleCreateTask)

  return (
    <div className="flex justify-between items-start px-4 sm:px-16 pt-4">
      <div className="flex flex-col">
        <h1 className="text-2xl font-semibold text-[#363636] font-inter">
          Todoloo
        </h1>
        <p className="text-base text-[#717171] font-inter">
          {getCurrentDate()}
        </p>
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={toggleCreateTask}
          className="px-3 py-2 bg-zinc-300 rounded-[8px] inline-flex items-center gap-2 hover:bg-zinc-400 transition-colors"
        >
          <div className="text-neutral-700 text-sm font-normal font-['Inter']">
            New Task (⌘ + N)
          </div>
        </button>
      </div>
    </div>
  )
}

