import Header from '@/components/Header'
import TaskCard from '@/components/TaskCard'
import TaskList from '@/components/TaskList'

export default function Home() {
  return (
    <div className="min-h-screen bg-[#FDFDFD] font-inter">
      <Header />
      <main className="px-4 sm:px-16 py-8">
        <div className="max-w-2xl mx-auto space-y-8">
          <TaskCard />
          <TaskList />
        </div>
      </main>
    </div>
  )
}
