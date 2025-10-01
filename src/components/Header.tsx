'use client'

import { getCurrentDate } from '@/utils/timeUtils'
import { useTaskStore } from '@/store/taskStore'

export default function Header() {
  const toggleCreateTask = useTaskStore((state) => state.toggleCreateTask)
  const showCreateTask = useTaskStore((state) => state.showCreateTask)

  const handleClick = () => {
    toggleCreateTask()
  }

  return (
    <div className="flex justify-center w-full px-4 pt-4">
      <div className="w-[600px] inline-flex justify-between items-end">
        <div className="inline-flex flex-col justify-start items-start gap-2">
          <div className="justify-start text-neutral-700 text-base font-bold font-['Inter']">Todoloo</div>
          <div className="justify-start text-neutral-700 text-sm font-normal font-['Inter']">{getCurrentDate()}</div>
        </div>
        <div className="flex justify-end items-center gap-8">
          <div className="px-4 py-2 bg-zinc-100 rounded-md shadow-[0px_4px_7px_0px_rgba(0,0,0,0.05)] outline outline-1 outline-offset-[-1px] outline-zinc-300 inline-flex flex-col justify-start items-start gap-2.5">
            <button
              onClick={handleClick}
              className="inline-flex justify-center items-center gap-2.5 cursor-pointer"
            >
              <div className="justify-start text-neutral-800 text-sm font-medium font-['Inter']">New Todo (N)</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

