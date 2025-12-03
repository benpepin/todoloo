'use client'

import { useToDoStore } from '@/store/toDoStore'

export default function MobileListTabs() {
  const lists = useToDoStore((state) => state.lists)
  const currentListId = useToDoStore((state) => state.currentListId)
  const switchToPersonalList = useToDoStore((state) => state.switchToPersonalList)

  return (
    <div
      className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
      style={{ scrollSnapType: 'x mandatory' }}
    >
      {lists.map((list) => (
        <button
          key={list.id}
          onClick={() => switchToPersonalList(list.id)}
          className={`px-4 py-2.5 rounded-full whitespace-nowrap text-[15px] font-['Outfit']
                     transition-all duration-200 min-h-[44px] flex items-center
                     ${currentListId === list.id
                       ? 'font-semibold'
                       : 'font-normal hover:opacity-70'}`}
          style={{
            scrollSnapAlign: 'start',
            backgroundColor: currentListId === list.id
              ? 'var(--color-todoloo-bg)'
              : 'transparent',
            color: currentListId === list.id
              ? 'var(--color-todoloo-text-primary)'
              : 'var(--color-todoloo-text-secondary)'
          }}
        >
          {list.name}
        </button>
      ))}
    </div>
  )
}
