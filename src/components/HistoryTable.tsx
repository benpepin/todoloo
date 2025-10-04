'use client'

import { useState, useMemo, useEffect } from 'react'
import { Download, Search, Filter, ChevronUp, ChevronDown } from 'lucide-react'
import { useHistoryStore } from '@/store/historyStore'
import { useToDoStore } from '@/store/toDoStore'
import { TaskHistoryEntry } from '@/types'

interface HistoryTableProps {
  className?: string
}

export default function HistoryTable({ className = '' }: HistoryTableProps) {
  const entries = useHistoryStore((state) => state.entries)
  const migrateCompletedTasks = useHistoryStore((state) => state.migrateCompletedTasks)
  const tasks = useToDoStore((state) => state.tasks)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<keyof TaskHistoryEntry>('completedAt')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [filterBy, setFilterBy] = useState<'all' | 'recent' | 'thisWeek' | 'thisMonth'>('all')


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
    const headers = ['To Do', 'Actual Time', 'Date', 'Time']
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

  if (entries.length === 0) {
    return (
      <div className={`w-full p-8 text-center ${className}`}>
        <div className="text-lg font-['Geist'] font-medium mb-2" style={{ color: 'var(--color-todoloo-text-secondary)' }}>
          No history yet
        </div>
        <div className="text-sm font-['Geist']" style={{ color: 'var(--color-todoloo-text-muted)' }}>
          Complete some to dos to see your history here
        </div>
      </div>
    )
  }

  return (
    <div className={`w-full ${className}`}>
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-todoloo-text-muted)' }} />
          <input
            type="text"
            placeholder="Search to dos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border text-sm font-['Geist']"
            style={{
              backgroundColor: 'var(--color-todoloo-card)',
              borderColor: 'var(--color-todoloo-border)',
              color: 'var(--color-todoloo-text-primary)'
            }}
          />
        </div>

        {/* Filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-todoloo-text-muted)' }} />
          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value as 'all' | 'recent' | 'thisWeek' | 'thisMonth')}
            className="pl-10 pr-8 py-2 rounded-lg border text-sm font-['Geist'] appearance-none bg-no-repeat bg-right"
            style={{
              backgroundColor: 'var(--color-todoloo-card)',
              borderColor: 'var(--color-todoloo-border)',
              color: 'var(--color-todoloo-text-primary)',
              backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e")',
              backgroundPosition: 'right 8px center',
              backgroundSize: '16px'
            }}
          >
            <option value="all">All time</option>
            <option value="recent">Last 24 hours</option>
            <option value="thisWeek">This week</option>
            <option value="thisMonth">This month</option>
          </select>
        </div>

        {/* Export */}
        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-['Geist'] font-medium transition-colors"
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

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--color-todoloo-border)' }}>
              <th 
                className="text-left py-3 px-4 font-['Geist'] font-medium text-sm cursor-pointer hover:opacity-70 transition-opacity"
                style={{ color: 'var(--color-todoloo-text-secondary)' }}
                onClick={() => handleSort('originalDescription')}
              >
                <div className="flex items-center gap-2">
                  To Do
                  <SortIcon field="originalDescription" />
                </div>
              </th>
              <th 
                className="text-left py-3 px-4 font-['Geist'] font-medium text-sm cursor-pointer hover:opacity-70 transition-opacity"
                style={{ color: 'var(--color-todoloo-text-secondary)' }}
                onClick={() => handleSort('actualMinutes')}
              >
                <div className="flex items-center gap-2">
                  Actual
                  <SortIcon field="actualMinutes" />
                </div>
              </th>
              <th 
                className="text-left py-3 px-4 font-['Geist'] font-medium text-sm cursor-pointer hover:opacity-70 transition-opacity"
                style={{ color: 'var(--color-todoloo-text-secondary)' }}
                onClick={() => handleSort('completedAt')}
              >
                <div className="flex items-center gap-2">
                  Completed
                  <SortIcon field="completedAt" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedEntries.map((entry) => {
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
                    <div className="font-['Geist'] font-medium text-sm" style={{ color: 'var(--color-todoloo-text-primary)' }}>
                      {entry.originalDescription}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-['Geist'] text-sm" style={{ color: 'var(--color-todoloo-text-secondary)' }}>
                      {formatDuration(entry.actualMinutes)}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-['Geist'] text-sm" style={{ color: 'var(--color-todoloo-text-secondary)' }}>
                      <div>{formatDate(entry.completedAt)}</div>
                      <div className="text-xs opacity-70">{formatTime(entry.completedAt)}</div>
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
              <div className="text-lg font-['Geist'] font-semibold" style={{ color: 'var(--color-todoloo-text-primary)' }}>
                {filteredAndSortedEntries.length}
              </div>
              <div className="text-xs font-['Geist']" style={{ color: 'var(--color-todoloo-text-muted)' }}>
                To Dos
              </div>
            </div>
            <div>
              <div className="text-lg font-['Geist'] font-semibold" style={{ color: 'var(--color-todoloo-text-primary)' }}>
                {formatDuration(filteredAndSortedEntries.reduce((sum, entry) => sum + entry.actualMinutes, 0))}
              </div>
              <div className="text-xs font-['Geist']" style={{ color: 'var(--color-todoloo-text-muted)' }}>
                Total Time
              </div>
            </div>
            <div>
              <div className="text-lg font-['Geist'] font-semibold" style={{ color: 'var(--color-todoloo-text-primary)' }}>
                {Math.round(filteredAndSortedEntries.reduce((sum, entry) => sum + entry.actualMinutes, 0) / filteredAndSortedEntries.length)}m
              </div>
              <div className="text-xs font-['Geist']" style={{ color: 'var(--color-todoloo-text-muted)' }}>
                Avg Time
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
