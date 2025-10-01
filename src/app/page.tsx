'use client'

import Header from '@/components/Header'
import TaskList from '@/components/TaskList'

export default function Home() {

  return (
    <div className="min-h-screen bg-[#FDFDFD] font-inter">
      <Header />
      <main className="px-4 sm:px-16 py-8">
        <div className="w-[600px] mx-auto">
          <TaskList />
        </div>
      </main>
    </div>
  )
}
