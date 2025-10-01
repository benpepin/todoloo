'use client'

import { getCurrentDate } from '@/utils/timeUtils'

export default function Header() {
  return (
    <div className="flex justify-between items-start px-4 sm:px-16 pt-4">
      <div className="flex flex-col">
        <h1 className="text-2xl font-semibold text-[#363636] font-inter">
          Todoloo
        </h1>
        <p className="text-base text-[#717171] font-inter">
          Quick Todos for me and yous
        </p>
      </div>
      <div className="text-base text-[#363636] font-inter">
        {getCurrentDate()}
      </div>
    </div>
  )
}

