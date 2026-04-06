'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLogin } from '@/hooks/useAuth'
import type { LoginPayload } from '@/types/auth'

export function LoginForm() {
  const router = useRouter()
  const login = useLogin()

  const [form, setForm] = useState<LoginPayload>({
    email: '',
    password: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    login.mutate(form, {
      onSuccess: (data) => {
        if (data.success) {
          router.push('/dashboard')
        }
      },
    })
  }

  const errorMessage =
    login.error instanceof Error
      ? login.error.message
      : login.data && !login.data.success
        ? login.data.message
        : null

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '16px',
        padding: '2.5rem',
        width: '100%',
        maxWidth: '420px',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
      }}
    >
      {/* Header */}
      <div className="animate-fade-in-1" style={{ marginBottom: '2rem' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '1rem',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-secondary))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
            }}
          >
            ⚡
          </div>
          <span
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--color-text-muted)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            ActiveCity
          </span>
        </div>
        <h1
          style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            color: 'var(--color-text-primary)',
            lineHeight: 1.2,
            margin: 0,
            fontFamily: 'var(--font-display)',
          }}
        >
          Welcome back
        </h1>
        <p
          style={{
            marginTop: '0.5rem',
            color: 'var(--color-text-muted)',
            fontSize: '0.9rem',
            margin: '0.5rem 0 0',
          }}
        >
          Sign in to your staff account
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Error message */}
        {errorMessage && (
          <div
            className="animate-fade-in-1"
            style={{
              background: 'rgba(243, 139, 168, 0.12)',
              border: '1px solid rgba(243, 139, 168, 0.3)',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              marginBottom: '1.25rem',
              color: 'var(--color-error)',
              fontSize: '0.875rem',
            }}
          >
            {errorMessage}
          </div>
        )}

        {/* Email field */}
        <div className="animate-fade-in-2" style={{ marginBottom: '1.25rem' }}>
          <label
            htmlFor="email"
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: 'var(--color-text-muted)',
            }}
          >
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={handleChange}
            placeholder="you@activecity.gov"
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              background: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              color: 'var(--color-text-primary)',
              fontSize: '0.95rem',
              outline: 'none',
              transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
              fontFamily: 'var(--font-body)',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--color-brand-primary)'
              e.target.style.boxShadow = '0 0 0 3px rgba(203, 166, 247, 0.12)'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--color-border)'
              e.target.style.boxShadow = 'none'
            }}
          />
        </div>

        {/* Password field */}
        <div className="animate-fade-in-3" style={{ marginBottom: '1.75rem' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.5rem',
            }}
          >
            <label
              htmlFor="password"
              style={{
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'var(--color-text-muted)',
              }}
            >
              Password
            </label>
            <Link
              href="/forgot-password"
              style={{
                fontSize: '0.8rem',
                color: 'var(--color-brand-primary)',
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={form.password}
            onChange={handleChange}
            placeholder="••••••••"
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              background: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              color: 'var(--color-text-primary)',
              fontSize: '0.95rem',
              outline: 'none',
              transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
              fontFamily: 'var(--font-body)',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--color-brand-primary)'
              e.target.style.boxShadow = '0 0 0 3px rgba(203, 166, 247, 0.12)'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--color-border)'
              e.target.style.boxShadow = 'none'
            }}
          />
        </div>

        {/* Submit button */}
        <div className="animate-fade-in-4">
          <button
            type="submit"
            disabled={login.isPending}
            style={{
              width: '100%',
              padding: '0.875rem 1.5rem',
              background: login.isPending
                ? 'var(--color-surface-raised)'
                : 'var(--color-brand-primary)',
              color: login.isPending ? 'var(--color-text-muted)' : '#1e1e2e',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.95rem',
              fontWeight: 700,
              cursor: login.isPending ? 'not-allowed' : 'pointer',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease, background 0.2s ease',
              fontFamily: 'var(--font-body)',
            }}
            onMouseEnter={(e) => {
              if (!login.isPending) {
                ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'
                ;(e.currentTarget as HTMLButtonElement).style.boxShadow =
                  '0 6px 20px rgba(203, 166, 247, 0.35)'
              }
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'
              ;(e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'
            }}
          >
            {login.isPending ? 'Signing in…' : 'Sign in'}
          </button>

          <p
            style={{
              textAlign: 'center',
              marginTop: '1.25rem',
              fontSize: '0.875rem',
              color: 'var(--color-text-muted)',
            }}
          >
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              style={{
                color: 'var(--color-brand-primary)',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Create one
            </Link>
          </p>
        </div>
      </form>
    </div>
  )
}
