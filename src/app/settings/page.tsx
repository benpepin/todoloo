'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Settings as SettingsIcon, Clock, Users, Trash2, UserPlus, List } from 'lucide-react'
import { getCurrentDate } from '@/utils/timeUtils'
import { useSettingsStore } from '@/store/settingsStore'
import { useSupabase } from '@/components/SupabaseProvider'
import { useToDoStore } from '@/store/toDoStore'
import { getSharedUsers, shareListWithUser, removeShare, getSharedLists } from '@/lib/db'
import { SharedUser } from '@/types'

export default function SettingsPage() {
  const router = useRouter()
  const [autoSave, setAutoSave] = useState(true)
  const [showCompleted, setShowCompleted] = useState(true)
  const { showProgressIndicator, toggleProgressIndicator } = useSettingsStore()
  const { user } = useSupabase()
  const { switchToList, currentListOwnerId } = useToDoStore()

  // Sharing state
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([])
  const [sharedLists, setSharedLists] = useState<Array<{ ownerId: string, ownerEmail: string, permission: 'read' | 'write' }>>([])
  const [shareEmail, setShareEmail] = useState('')
  const [isSharing, setIsSharing] = useState(false)
  const [shareError, setShareError] = useState('')
  const [shareSuccess, setShareSuccess] = useState('')
  const [isLoadingShares, setIsLoadingShares] = useState(false)

  // Load shared users on mount
  useEffect(() => {
    if (user?.id) {
      loadSharedUsers()
      loadSharedLists()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const loadSharedUsers = async () => {
    if (!user?.id) return
    setIsLoadingShares(true)
    try {
      const users = await getSharedUsers(user.id)
      setSharedUsers(users)
    } catch (error) {
      console.error('Error loading shared users:', error)
    } finally {
      setIsLoadingShares(false)
    }
  }

  const loadSharedLists = async () => {
    if (!user?.id) return
    try {
      const lists = await getSharedLists(user.id)
      setSharedLists(lists)
    } catch (error) {
      console.error('Error loading shared lists:', error)
    }
  }

  const handleShareList = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id || !shareEmail) return

    setIsSharing(true)
    setShareError('')
    setShareSuccess('')

    try {
      await shareListWithUser(user.id, shareEmail.trim(), 'write')
      setShareSuccess(`Successfully shared list with ${shareEmail}`)
      setShareEmail('')
      await loadSharedUsers()
    } catch (error) {
      setShareError(error instanceof Error ? error.message : 'Failed to share list')
    } finally {
      setIsSharing(false)
    }
  }

  const handleRemoveShare = async (userId: string) => {
    if (!user?.id) return

    try {
      await removeShare(user.id, userId)
      await loadSharedUsers()
    } catch (error) {
      setShareError(error instanceof Error ? error.message : 'Failed to remove share')
    }
  }


  return (
    <div className="w-full h-screen flex" style={{ backgroundColor: 'var(--color-todoloo-bg)' }}>
      {/* Sidebar - 33% width */}
      <div className="w-1/3 h-full p-8 overflow-hidden border-r flex flex-col justify-between items-start"
           style={{ 
             backgroundColor: 'var(--color-todoloo-sidebar)',
             borderColor: 'var(--color-todoloo-border)'
           }}>
        <div className="w-full flex flex-col justify-start items-start gap-1.5">
          <div className="w-full text-[42px] font-['Geist'] font-light" 
               style={{ color: 'var(--color-todoloo-text-secondary)' }}>Settings</div>
          <div className="w-full text-base font-['Geist'] font-normal" 
               style={{ color: 'var(--color-todoloo-text-secondary)' }}>{getCurrentDate()}</div>
        </div>
        <div className="w-full flex justify-start items-start gap-4">
          <Link href="/" 
                className="text-xs font-['Geist'] font-normal transition-colors"
                style={{ 
                  color: 'var(--color-todoloo-text-muted)'
                } as React.CSSProperties}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-todoloo-text-secondary)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-todoloo-text-muted)'}>
            ← Back to Todos
          </Link>
        </div>
      </div>

      {/* Main Content - 67% width */}
      <div className="w-2/3 h-full p-8 overflow-y-auto flex flex-col justify-start items-center gap-2.5"
           style={{ backgroundColor: 'var(--color-todoloo-main)' }}>
        <div className="w-full flex justify-center items-center gap-0.75">
          <div className="w-full max-w-[460px] flex flex-col justify-start items-start gap-8">
            
            {/* Settings Header */}
            <div className="w-full flex items-center gap-3">
              <SettingsIcon className="w-6 h-6" style={{ color: 'var(--color-todoloo-text-secondary)' }} />
              <h1 className="text-2xl font-['Geist'] font-medium" style={{ color: 'var(--color-todoloo-text-secondary)' }}>Settings</h1>
            </div>

            {/* Settings Sections */}
            <div className="w-full flex flex-col gap-6">
              {/* To Do Settings */}
              <div className="w-full rounded-[10px] shadow-[2px_2px_4px_rgba(0,0,0,0.15)] p-6"
                   style={{ backgroundColor: 'var(--color-todoloo-card)' }}>
                <div className="flex items-center gap-3 mb-4">
                  <Clock className="w-5 h-5" style={{ color: 'var(--color-todoloo-text-secondary)' }} />
                  <h2 className="text-lg font-['Geist'] font-medium" style={{ color: 'var(--color-todoloo-text-secondary)' }}>To Do Settings</h2>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-['Geist'] font-medium" style={{ color: 'var(--color-todoloo-text-primary)' }}>Auto-save tasks</p>
                      <p className="text-xs font-['Geist']" style={{ color: 'var(--color-todoloo-text-muted)' }}>Automatically save changes</p>
                    </div>
                    <button
                      onClick={() => setAutoSave(!autoSave)}
                      className="w-12 h-6 rounded-full transition-colors"
                      style={{
                        backgroundColor: autoSave ? 'var(--color-todoloo-gradient-start)' : 'var(--color-todoloo-border)'
                      }}
                    >
                      <div className="w-5 h-5 bg-white rounded-full transition-transform"
                           style={{
                             transform: autoSave ? 'translateX(24px)' : 'translateX(2px)'
                           }} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-['Geist'] font-medium" style={{ color: 'var(--color-todoloo-text-primary)' }}>Show completed to dos</p>
                      <p className="text-xs font-['Geist']" style={{ color: 'var(--color-todoloo-text-muted)' }}>Display finished to dos in the list</p>
                    </div>
                    <button
                      onClick={() => setShowCompleted(!showCompleted)}
                      className="w-12 h-6 rounded-full transition-colors"
                      style={{
                        backgroundColor: showCompleted ? 'var(--color-todoloo-gradient-start)' : 'var(--color-todoloo-border)'
                      }}
                    >
                      <div className="w-5 h-5 bg-white rounded-full transition-transform"
                           style={{
                             transform: showCompleted ? 'translateX(24px)' : 'translateX(2px)'
                           }} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-['Geist'] font-medium" style={{ color: 'var(--color-todoloo-text-primary)' }}>Show progress indicator</p>
                      <p className="text-xs font-['Geist']" style={{ color: 'var(--color-todoloo-text-muted)' }}>Display carnival horse race for completed todos</p>
                    </div>
                    <button
                      onClick={toggleProgressIndicator}
                      className="w-12 h-6 rounded-full transition-colors"
                      style={{
                        backgroundColor: showProgressIndicator ? 'var(--color-todoloo-gradient-start)' : 'var(--color-todoloo-border)'
                      }}
                    >
                      <div className="w-5 h-5 bg-white rounded-full transition-transform"
                           style={{
                             transform: showProgressIndicator ? 'translateX(24px)' : 'translateX(2px)'
                           }} />
                    </button>
                  </div>
                </div>
              </div>

              {/* List Sharing */}
              <div className="w-full rounded-[10px] shadow-[2px_2px_4px_rgba(0,0,0,0.15)] p-6"
                   style={{ backgroundColor: 'var(--color-todoloo-card)' }}>
                <div className="flex items-center gap-3 mb-4">
                  <Users className="w-5 h-5" style={{ color: 'var(--color-todoloo-text-secondary)' }} />
                  <h2 className="text-lg font-['Geist'] font-medium" style={{ color: 'var(--color-todoloo-text-secondary)' }}>List Sharing</h2>
                </div>

                {/* Active List Selector */}
                <div className="mb-6">
                  <p className="text-sm font-['Geist'] font-medium mb-3" style={{ color: 'var(--color-todoloo-text-primary)' }}>
                    Active List
                  </p>

                  {/* Your own list */}
                  <button
                    onClick={async () => {
                      if (user?.id && currentListOwnerId !== user.id) {
                        await switchToList(user.id)
                        router.push('/')
                      }
                    }}
                    className={`w-full p-3 rounded-lg mb-2 flex items-center gap-3 transition-all ${
                      currentListOwnerId === user?.id ? 'ring-2' : ''
                    }`}
                    style={{
                      backgroundColor: currentListOwnerId === user?.id ? 'var(--color-todoloo-gradient-start)' : 'var(--color-todoloo-muted)',
                      color: currentListOwnerId === user?.id ? 'white' : 'var(--color-todoloo-text-primary)',
                      ringColor: 'var(--color-todoloo-gradient-start)'
                    }}
                  >
                    <List className="w-5 h-5" />
                    <div className="flex-1 text-left">
                      <p className="text-sm font-['Geist'] font-medium">My List</p>
                      <p className="text-xs opacity-75">Your personal todo list</p>
                    </div>
                  </button>

                  {/* Shared lists */}
                  {sharedLists.length > 0 && (
                    <>
                      <p className="text-xs font-['Geist'] font-medium mb-2 mt-4" style={{ color: 'var(--color-todoloo-text-secondary)' }}>
                        Shared With You
                      </p>
                      {sharedLists.map((list) => (
                        <button
                          key={list.ownerId}
                          onClick={async () => {
                            if (currentListOwnerId !== list.ownerId) {
                              await switchToList(list.ownerId)
                              router.push('/')
                            }
                          }}
                          className={`w-full p-3 rounded-lg mb-2 flex items-center gap-3 transition-all ${
                            currentListOwnerId === list.ownerId ? 'ring-2' : ''
                          }`}
                          style={{
                            backgroundColor: currentListOwnerId === list.ownerId ? 'var(--color-todoloo-gradient-start)' : 'var(--color-todoloo-muted)',
                            color: currentListOwnerId === list.ownerId ? 'white' : 'var(--color-todoloo-text-primary)',
                            ringColor: 'var(--color-todoloo-gradient-start)'
                          }}
                        >
                          <List className="w-5 h-5" />
                          <div className="flex-1 text-left">
                            <p className="text-sm font-['Geist'] font-medium">
                              {list.ownerEmail}&apos;s list
                            </p>
                            <p className="text-xs opacity-75">
                              {list.permission} access
                            </p>
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                </div>

                {/* Share your list */}
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-['Geist'] font-medium mb-2" style={{ color: 'var(--color-todoloo-text-primary)' }}>
                      Share your list
                    </p>
                    <p className="text-xs font-['Geist'] mb-3" style={{ color: 'var(--color-todoloo-text-muted)' }}>
                      Enter an email address to give someone access to add and manage tasks on your list
                    </p>

                    <form onSubmit={handleShareList} className="flex gap-2">
                      <input
                        type="email"
                        value={shareEmail}
                        onChange={(e) => setShareEmail(e.target.value)}
                        placeholder="email@example.com"
                        className="flex-1 px-3 py-2 rounded-lg border text-sm font-['Geist']"
                        style={{
                          backgroundColor: 'var(--color-todoloo-bg)',
                          borderColor: 'var(--color-todoloo-border)',
                          color: 'var(--color-todoloo-text-primary)'
                        }}
                        disabled={isSharing}
                      />
                      <button
                        type="submit"
                        disabled={isSharing || !shareEmail}
                        className="px-4 py-2 rounded-lg text-sm font-['Geist'] font-medium transition-opacity flex items-center gap-2"
                        style={{
                          backgroundColor: 'var(--color-todoloo-gradient-start)',
                          color: 'white',
                          opacity: isSharing || !shareEmail ? 0.5 : 1
                        }}
                      >
                        <UserPlus className="w-4 h-4" />
                        {isSharing ? 'Sharing...' : 'Share'}
                      </button>
                    </form>

                    {shareError && (
                      <div className="mt-2 p-2 rounded-lg text-xs font-['Geist']"
                           style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                        {shareError}
                      </div>
                    )}
                    {shareSuccess && (
                      <div className="mt-2 p-2 rounded-lg text-xs font-['Geist']"
                           style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>
                        {shareSuccess}
                      </div>
                    )}
                  </div>

                  {/* List of shared users */}
                  {isLoadingShares ? (
                    <div className="text-sm font-['Geist']" style={{ color: 'var(--color-todoloo-text-muted)' }}>
                      Loading shared users...
                    </div>
                  ) : sharedUsers.length > 0 ? (
                    <div>
                      <p className="text-sm font-['Geist'] font-medium mb-2" style={{ color: 'var(--color-todoloo-text-primary)' }}>
                        People with access ({sharedUsers.length})
                      </p>
                      <div className="space-y-2">
                        {sharedUsers.map((sharedUser) => (
                          <div key={sharedUser.userId}
                               className="flex items-center justify-between p-3 rounded-lg"
                               style={{ backgroundColor: 'var(--color-todoloo-muted)' }}>
                            <div className="flex-1">
                              <p className="text-sm font-['Geist'] font-medium" style={{ color: 'var(--color-todoloo-text-primary)' }}>
                                {sharedUser.email}
                              </p>
                              <p className="text-xs font-['Geist']" style={{ color: 'var(--color-todoloo-text-muted)' }}>
                                Can {sharedUser.permission === 'write' ? 'edit' : 'view'} • Shared {sharedUser.sharedAt.toLocaleDateString()}
                              </p>
                            </div>
                            <button
                              onClick={() => handleRemoveShare(sharedUser.userId)}
                              className="p-2 rounded-lg hover:bg-opacity-10 hover:bg-red-500 transition-colors"
                              style={{ color: 'var(--color-todoloo-text-muted)' }}
                              title="Remove access"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm font-['Geist']" style={{ color: 'var(--color-todoloo-text-muted)' }}>
                      No one has access to your list yet
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
