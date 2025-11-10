'use client'

import { useState, useMemo, useEffect } from 'react'
import { Download, Search, ChevronUp, ChevronDown, Edit2, Trash2, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useHistoryStore } from '@/store/historyStore'
import { useToDoStore } from '@/store/toDoStore'
import { TaskHistoryEntry } from '@/types'

interface HistoryTableProps {
  className?: string
}

export default function HistoryTable({ className = '' }: HistoryTableProps) {
  const entries = useHistoryStore((state) => state.entries)
  const migrateCompletedTasks = useHistoryStore((state) => state.migrateCompletedTasks)
  const updateEntry = useHistoryStore((state) => state.updateEntry)
  const deleteEntry = useHistoryStore((state) => state.deleteEntry)
  const tasks = useToDoStore((state) => state.tasks)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<keyof TaskHistoryEntry>('completedAt')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [filterBy, setFilterBy] = useState<'all' | 'recent' | 'thisWeek' | 'thisMonth'>('all')
  const [editingEntry, setEditingEntry] = useState<TaskHistoryEntry | null>(null)


  // Migrate existing completed to dos to history on first load
  useEffect(() => {
    const completedTasks = tasks
      .filter(task => task.isCompleted && task.completedAt)
      .map(task => ({
        description: task.description,
        estimatedMinutes: task.estimatedMinutes,
        actualMinutes: task.actualMinutes,
        completedAt: task.completedAt!
      }))
    
    if (completedTasks.length > 0) {
      migrateCompletedTasks(completedTasks)
    }
  }, [tasks, migrateCompletedTasks]) // Include dependencies

  // Calculate overall average
  const overallAverage = useMemo(() => {
    if (entries.length === 0) return 0
    const total = entries.reduce((sum, entry) => sum + entry.actualMinutes, 0)
    return total / entries.length
  }, [entries])

  // Filter and sort entries
  const filteredAndSortedEntries = useMemo(() => {
    let filtered = entries

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(entry =>
        entry.originalDescription.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply time filter
    const now = new Date()
    switch (filterBy) {
      case 'recent':
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        filtered = filtered.filter(entry => entry.completedAt >= oneDayAgo)
        break
      case 'thisWeek':
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        filtered = filtered.filter(entry => entry.completedAt >= oneWeekAgo)
        break
      case 'thisMonth':
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        filtered = filtered.filter(entry => entry.completedAt >= oneMonthAgo)
        break
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: string | number | Date = a[sortField]
      let bValue: string | number | Date = b[sortField]

      if (sortField === 'completedAt') {
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    return filtered
  }, [entries, searchTerm, sortField, sortDirection, filterBy])

  const handleSort = (field: keyof TaskHistoryEntry) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const exportToCSV = () => {
    const headers = ['To Do', 'Length', 'Date', 'Time']
    const csvContent = [
      headers.join(','),
      ...filteredAndSortedEntries.map(entry => [
        `"${entry.originalDescription}"`,
        formatDuration(entry.actualMinutes),
        formatDate(entry.completedAt),
        formatTime(entry.completedAt)
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `todo-history-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const SortIcon = ({ field }: { field: keyof TaskHistoryEntry }) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ?
      <ChevronUp className="w-4 h-4" /> :
      <ChevronDown className="w-4 h-4" />
  }

  const handleDelete = (id: string) => {
    deleteEntry(id)
  }

  const getAverageComparison = (minutes: number) => {
    if (overallAverage === 0) return { icon: Minus, color: 'var(--color-todoloo-text-muted)', text: '—' }

    const diff = minutes - overallAverage
    const percentDiff = Math.abs((diff / overallAverage) * 100)

    if (Math.abs(diff) < 1) {
      return {
        icon: Minus,
        color: 'var(--color-todoloo-text-muted)',
        text: 'At avg',
        bgColor: 'rgba(128, 128, 128, 0.1)'
      }
    }

    if (diff > 0) {
      return {
        icon: TrendingUp,
        color: '#ef4444',
        text: `+${Math.round(percentDiff)}%`,
        bgColor: 'rgba(239, 68, 68, 0.1)'
      }
    }

    return {
      icon: TrendingDown,
      color: '#22c55e',
      text: `-${Math.round(percentDiff)}%`,
      bgColor: 'rgba(34, 197, 94, 0.1)'
    }
  }

  if (entries.length === 0) {
    return (
      <div className={`w-full p-8 text-center ${className}`}>
        <div className="text-lg font-['Outfit'] font-medium mb-2" style={{ color: 'var(--color-todoloo-text-secondary)' }}>
          No history yet
        </div>
        <div className="text-sm font-['Outfit']" style={{ color: 'var(--color-todoloo-text-muted)' }}>
          Complete some to dos to see your history here
        </div>
      </div>
    )
  }

  return (
    <div className={`w-full ${className}`}>
      {/* Controls */}
      <div className="flex flex-col gap-4 mb-6">
        {/* Top row: Search and Export */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-todoloo-text-muted)' }} />
            <input
              type="text"
              placeholder="Search to dos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border text-sm font-['Outfit']"
              style={{
                backgroundColor: 'var(--color-todoloo-card)',
                borderColor: 'var(--color-todoloo-border)',
                color: 'var(--color-todoloo-text-primary)'
              }}
            />
          </div>

          {/* Export */}
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-['Outfit'] font-medium transition-colors whitespace-nowrap"
            style={{
              backgroundColor: 'var(--color-todoloo-gradient-start)',
              borderColor: 'var(--color-todoloo-gradient-start)',
              color: 'white'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-todoloo-gradient-end)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-todoloo-gradient-start)'}
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {/* Bottom row: Time Filter */}
        <div className="flex gap-2 flex-wrap">
          {(['all', 'recent', 'thisWeek', 'thisMonth'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setFilterBy(filter)}
              className="px-3 py-1.5 rounded-lg text-xs font-['Outfit'] font-medium transition-all"
              style={{
                backgroundColor: filterBy === filter ? 'var(--color-todoloo-gradient-start)' : 'var(--color-todoloo-card)',
                borderColor: filterBy === filter ? 'var(--color-todoloo-gradient-start)' : 'var(--color-todoloo-border)',
                color: filterBy === filter ? 'white' : 'var(--color-todoloo-text-secondary)',
                border: '1px solid'
              }}
            >
              {filter === 'all' && 'All Time'}
              {filter === 'recent' && 'Last 24 Hours'}
              {filter === 'thisWeek' && 'This Week'}
              {filter === 'thisMonth' && 'This Month'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--color-todoloo-border)' }}>
              <th
                className="text-left py-3 px-4 font-['Outfit'] font-medium text-sm cursor-pointer hover:opacity-70 transition-opacity"
                style={{ color: 'var(--color-todoloo-text-secondary)' }}
                onClick={() => handleSort('originalDescription')}
              >
                <div className="flex items-center gap-2">
                  To Do
                  <SortIcon field="originalDescription" />
                </div>
              </th>
              <th
                className="text-left py-3 px-4 font-['Outfit'] font-medium text-sm cursor-pointer hover:opacity-70 transition-opacity"
                style={{ color: 'var(--color-todoloo-text-secondary)' }}
                onClick={() => handleSort('actualMinutes')}
              >
                <div className="flex items-center gap-2">
                  Length
                  <SortIcon field="actualMinutes" />
                </div>
              </th>
              <th
                className="text-left py-3 px-4 font-['Outfit'] font-medium text-sm cursor-pointer hover:opacity-70 transition-opacity"
                style={{ color: 'var(--color-todoloo-text-secondary)' }}
                onClick={() => handleSort('completedAt')}
              >
                <div className="flex items-center gap-2">
                  Completed
                  <SortIcon field="completedAt" />
                </div>
              </th>
              <th
                className="text-center py-3 px-4 font-['Outfit'] font-medium text-sm"
                style={{ color: 'var(--color-todoloo-text-secondary)' }}
              >
                vs Avg
              </th>
              <th
                className="text-right py-3 px-4 font-['Outfit'] font-medium text-sm"
                style={{ color: 'var(--color-todoloo-text-secondary)' }}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedEntries.map((entry) => {
              const comparison = getAverageComparison(entry.actualMinutes)
              const Icon = comparison.icon
              return (
                <tr
                  key={entry.id}
                  className="border-b hover:opacity-80 transition-opacity"
                  style={{
                    borderColor: 'var(--color-todoloo-border)',
                    backgroundColor: 'var(--color-todoloo-card)'
                  }}
                >
                  <td className="py-3 px-4">
                    <div className="font-['Outfit'] font-medium text-sm" style={{ color: 'var(--color-todoloo-text-primary)' }}>
                      {entry.originalDescription}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-['Outfit'] text-sm" style={{ color: 'var(--color-todoloo-text-secondary)' }}>
                      {formatDuration(entry.actualMinutes)}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-['Outfit'] text-sm" style={{ color: 'var(--color-todoloo-text-secondary)' }}>
                      <div>{formatDate(entry.completedAt)}</div>
                      <div className="text-xs opacity-70">{formatTime(entry.completedAt)}</div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center">
                      <div
                        className="flex items-center gap-1 px-2 py-1 rounded-md"
                        style={{ backgroundColor: comparison.bgColor }}
                      >
                        <Icon className="w-3.5 h-3.5" style={{ color: comparison.color }} />
                        <span className="text-xs font-['Outfit'] font-medium" style={{ color: comparison.color }}>
                          {comparison.text}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditingEntry(entry)}
                        className="p-1.5 rounded hover:bg-opacity-10 hover:bg-black transition-colors"
                        style={{ color: 'var(--color-todoloo-text-muted)' }}
                        title="Edit entry"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="p-1.5 rounded hover:bg-opacity-10 hover:bg-red-500 transition-colors"
                        style={{ color: 'var(--color-todoloo-text-muted)' }}
                        title="Delete entry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      {filteredAndSortedEntries.length > 0 && (
        <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: 'var(--color-todoloo-muted)' }}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-['Outfit'] font-semibold" style={{ color: 'var(--color-todoloo-text-primary)' }}>
                {filteredAndSortedEntries.length}
              </div>
              <div className="text-xs font-['Outfit']" style={{ color: 'var(--color-todoloo-text-muted)' }}>
                To Dos
              </div>
            </div>
            <div>
              <div className="text-lg font-['Outfit'] font-semibold" style={{ color: 'var(--color-todoloo-text-primary)' }}>
                {formatDuration(filteredAndSortedEntries.reduce((sum, entry) => sum + entry.actualMinutes, 0))}
              </div>
              <div className="text-xs font-['Outfit']" style={{ color: 'var(--color-todoloo-text-muted)' }}>
                Total Time
              </div>
            </div>
            <div>
              <div className="text-lg font-['Outfit'] font-semibold" style={{ color: 'var(--color-todoloo-text-primary)' }}>
                {Math.round(filteredAndSortedEntries.reduce((sum, entry) => sum + entry.actualMinutes, 0) / filteredAndSortedEntries.length)}m
              </div>
              <div className="text-xs font-['Outfit']" style={{ color: 'var(--color-todoloo-text-muted)' }}>
                Avg Time
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setEditingEntry(null)}>
          <div
            className="rounded-lg p-6 max-w-md w-full mx-4"
            style={{ backgroundColor: 'var(--color-todoloo-card)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-['Outfit'] font-semibold mb-4" style={{ color: 'var(--color-todoloo-text-primary)' }}>
              Edit History Entry
            </h3>
            <form onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              const description = formData.get('description') as string
              const minutes = parseInt(formData.get('minutes') as string)
              const date = formData.get('date') as string
              const time = formData.get('time') as string

              const completedAt = new Date(`${date}T${time}`)

              updateEntry(editingEntry.id, {
                originalDescription: description,
                actualMinutes: minutes,
                completedAt
              })
              setEditingEntry(null)
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-['Outfit'] font-medium mb-1" style={{ color: 'var(--color-todoloo-text-secondary)' }}>
                    Description
                  </label>
                  <input
                    type="text"
                    name="description"
                    defaultValue={editingEntry.originalDescription}
                    className="w-full px-3 py-2 rounded-lg border text-sm font-['Outfit']"
                    style={{
                      backgroundColor: 'var(--color-todoloo-bg)',
                      borderColor: 'var(--color-todoloo-border)',
                      color: 'var(--color-todoloo-text-primary)'
                    }}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-['Outfit'] font-medium mb-1" style={{ color: 'var(--color-todoloo-text-secondary)' }}>
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    name="minutes"
                    defaultValue={editingEntry.actualMinutes}
                    min="1"
                    className="w-full px-3 py-2 rounded-lg border text-sm font-['Outfit']"
                    style={{
                      backgroundColor: 'var(--color-todoloo-bg)',
                      borderColor: 'var(--color-todoloo-border)',
                      color: 'var(--color-todoloo-text-primary)'
                    }}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-['Outfit'] font-medium mb-1" style={{ color: 'var(--color-todoloo-text-secondary)' }}>
                    Date
                  </label>
                  <input
                    type="date"
                    name="date"
                    defaultValue={new Date(editingEntry.completedAt).toISOString().split('T')[0]}
                    className="w-full px-3 py-2 rounded-lg border text-sm font-['Outfit']"
                    style={{
                      backgroundColor: 'var(--color-todoloo-bg)',
                      borderColor: 'var(--color-todoloo-border)',
                      color: 'var(--color-todoloo-text-primary)'
                    }}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-['Outfit'] font-medium mb-1" style={{ color: 'var(--color-todoloo-text-secondary)' }}>
                    Time
                  </label>
                  <input
                    type="time"
                    name="time"
                    defaultValue={new Date(editingEntry.completedAt).toTimeString().slice(0, 5)}
                    className="w-full px-3 py-2 rounded-lg border text-sm font-['Outfit']"
                    style={{
                      backgroundColor: 'var(--color-todoloo-bg)',
                      borderColor: 'var(--color-todoloo-border)',
                      color: 'var(--color-todoloo-text-primary)'
                    }}
                    required
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setEditingEntry(null)}
                  className="flex-1 px-4 py-2 rounded-lg border text-sm font-['Outfit'] font-medium transition-colors"
                  style={{
                    backgroundColor: 'var(--color-todoloo-bg)',
                    borderColor: 'var(--color-todoloo-border)',
                    color: 'var(--color-todoloo-text-secondary)'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-['Outfit'] font-medium transition-colors"
                  style={{
                    backgroundColor: 'var(--color-todoloo-gradient-start)',
                    color: 'white'
                  }}
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
