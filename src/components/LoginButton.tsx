'use client'

import { useState } from 'react'
import { signIn } from '@/lib/atproto'

export default function LoginButton() {
  const [handle, setHandle] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!handle.trim()) {
      setError('Please enter your Bluesky handle')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await signIn(handle.trim())
      // signIn will redirect to Bluesky for auth
    } catch (err) {
      console.error('Sign in error:', err)
      setError(err instanceof Error ? err.message : 'Failed to sign in')
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm">
      <div className="mb-4">
        <label
          htmlFor="handle"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Bluesky Handle
        </label>
        <input
          type="text"
          id="handle"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="yourname.bsky.social"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isLoading}
        />
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? 'Connecting...' : 'Sign in with Bluesky'}
      </button>
    </form>
  )
}
