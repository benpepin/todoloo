'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useSupabase } from './SupabaseProvider'

export default function Auth() {
  const { supabase, user } = useSupabase()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  if (user) {
    return null // Don't show anything if user is logged in (handled by parent)
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setLoading(true)
    setMessage('')

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        setMessage(`Error: ${error.message}`)
      } else {
        setMessage('Check your email for the magic link!')
      }
    } catch (error) {
      setMessage(`Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const handleGitHubSignIn = async () => {
    setLoading(true)
    setMessage('')

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        setMessage(`Error: ${error.message}`)
        setLoading(false)
      }
    } catch (error) {
      setMessage(`Error: ${error}`)
      setLoading(false)
    }
  }

  return (
    <div className="w-full h-screen flex flex-col lg:flex-row">
      {/* Left Side - Typography Statement */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16" style={{ backgroundColor: '#FFFBF5' }}>
        <h1
          className="font-['var(--font-instrument-serif)'] font-normal leading-tight text-left text-black"
          style={{
            fontSize: 'clamp(3rem, 10vw, 7.625rem)',
            fontFamily: 'var(--font-instrument-serif)',
            lineHeight: '1.1'
          }}
        >
          DO YOU<br />
          WANT TO<br />
          DO TODOS<br />
          TODAY?
        </h1>
      </div>

      {/* Right Side - Sign In Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16" style={{ backgroundColor: '#FFFBF5' }}>
        <div className="w-full max-w-md relative">
          {/* Bunny Ears - behind the card */}
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 z-0">
            <Image src="/bunnyearsfingers.png" alt="" width={80} height={80} className="object-contain" />
          </div>

          <div className="bg-white rounded-lg p-8 shadow-lg border border-gray-200 relative z-10">
            <h2 className="text-xl font-semibold mb-6 text-gray-900">Sign in to Todoloo</h2>

            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium hover:opacity-90 cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, #FD2449 0%, #FD2449 85%, #FFA920 100%)'
                }}
              >
                {loading ? 'Sending...' : 'Send Magic Link'}
              </button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or</span>
                </div>
              </div>

              <button
                onClick={handleGitHubSignIn}
                disabled={loading}
                className="w-full mt-6 py-3 px-4 bg-white text-gray-900 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-gray-300"
              >
                {loading ? 'Signing in...' : 'Sign in with GitHub'}
              </button>
            </div>

            {message && (
              <div className={`mt-6 p-3 rounded-md text-sm ${
                message.includes('Error')
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-green-50 text-green-700 border border-green-200'
              }`}>
                {message}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
