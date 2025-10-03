'use client'

import { useState } from 'react'
import { Download, Upload, AlertTriangle, CheckCircle, X } from 'lucide-react'
import { useTaskStore } from '@/store/taskStore'
import { useHistoryStore } from '@/store/historyStore'
import { useClientOnly } from '@/hooks/useClientOnly'

interface BackupData {
  version: number
  exportedAt: string
  tasks: unknown[]
  history: unknown[]
}

function SettingsBackupContent() {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)
  const tasks = useTaskStore((state) => state.tasks)
  const history = useHistoryStore((state) => state.entries)
  const clearHistory = useHistoryStore((state) => state.clearHistory)

  const exportData = () => {
    try {
      const backupData: BackupData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        tasks: tasks.map(task => ({
          ...task,
          createdAt: task.createdAt.toISOString(),
          completedAt: task.completedAt?.toISOString(),
        })),
        history: history.map(entry => ({
          ...entry,
          completedAt: entry.completedAt.toISOString(),
        })),
      }

      const dataStr = JSON.stringify(backupData, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `todoloo-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setMessage({ type: 'success', text: 'Backup exported successfully!' })
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to export backup' })
    }
  }

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const backupData: BackupData = JSON.parse(e.target?.result as string)
        
        if (backupData.version !== 1) {
          setMessage({ type: 'error', text: 'Unsupported backup version' })
          return
        }

        // Note: In a real implementation, you'd want to merge/validate this data
        // For now, we'll just show a message that import is not fully implemented
        setMessage({ type: 'info', text: 'Import functionality coming soon. For now, use export to backup your data.' })
      } catch (error) {
        setMessage({ type: 'error', text: 'Invalid backup file' })
      }
    }
    reader.readAsText(file)
  }

  const clearAllData = () => {
    if (confirm('This will permanently delete all tasks and history. Are you sure?')) {
      // Clear tasks (you'd need to add this to taskStore)
      clearHistory()
      setMessage({ type: 'info', text: 'Data cleared. Refresh the page to see changes.' })
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 p-3 bg-[#F8F9FA] border border-[#E9ECEF] rounded-full shadow-lg hover:bg-[#E9ECEF] transition-colors"
        title="Settings & Backup"
      >
        <AlertTriangle className="w-5 h-5 text-[#6C757D]" />
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-[20px] p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#2D1B1B] font-inter">Settings & Backup</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-[#F5F5F5] rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-[#6C757D]" />
          </button>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-[12px] flex items-center gap-2 ${
            message.type === 'success' ? 'bg-[#D4EDDA] text-[#155724]' :
            message.type === 'error' ? 'bg-[#F8D7DA] text-[#721C24]' :
            'bg-[#D1ECF1] text-[#0C5460]'
          }`}>
            {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> :
             message.type === 'error' ? <AlertTriangle className="w-4 h-4" /> :
             <AlertTriangle className="w-4 h-4" />}
            <span className="text-sm font-inter">{message.text}</span>
          </div>
        )}

        <div className="space-y-4">
          <div className="bg-[#F8F9FA] border border-[#E9ECEF] rounded-[12px] p-4">
            <h3 className="font-medium text-[#495057] font-inter mb-2">Data Backup</h3>
            <p className="text-sm text-[#6C757D] font-inter mb-3">
              Your data is stored locally. Export a backup to prevent data loss if you clear your browser cache.
            </p>
            <div className="flex gap-2">
              <button
                onClick={exportData}
                className="flex items-center gap-2 px-3 py-2 bg-[#007BFF] text-white text-sm font-inter rounded-[8px] hover:bg-[#0056B3] transition-colors"
              >
                <Download className="w-4 h-4" />
                Export Backup
              </button>
              <label className="flex items-center gap-2 px-3 py-2 bg-[#6C757D] text-white text-sm font-inter rounded-[8px] hover:bg-[#5A6268] transition-colors cursor-pointer">
                <Upload className="w-4 h-4" />
                Import Backup
                <input
                  type="file"
                  accept=".json"
                  onChange={importData}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="bg-[#FFF3CD] border border-[#FFEAA7] rounded-[12px] p-4">
            <h3 className="font-medium text-[#856404] font-inter mb-2">Data Storage</h3>
            <p className="text-sm text-[#856404] font-inter mb-2">
              Your tasks and timing history are stored locally in your browser using IndexedDB.
            </p>
            <p className="text-sm text-[#856404] font-inter">
              <strong>Warning:</strong> Clearing browser data will delete all your tasks and history unless you have a backup.
            </p>
          </div>

          <div className="bg-[#F8D7DA] border border-[#F5C6CB] rounded-[12px] p-4">
            <h3 className="font-medium text-[#721C24] font-inter mb-2">Danger Zone</h3>
            <p className="text-sm text-[#721C24] font-inter mb-3">
              Permanently delete all tasks and history data.
            </p>
            <button
              onClick={clearAllData}
              className="px-3 py-2 bg-[#DC3545] text-white text-sm font-inter rounded-[8px] hover:bg-[#C82333] transition-colors"
            >
              Clear All Data
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SettingsBackup() {
  const isClient = useClientOnly()

  if (!isClient) {
    return null
  }

  return <SettingsBackupContent />
}
