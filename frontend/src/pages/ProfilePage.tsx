import { useEffect, useState, type FormEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'

export function ProfilePage() {
  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['profile'],
    queryFn: api.getProfile,
  })

  const queryClient = useQueryClient()
  const {
    mutate: save,
    isPending,
    isSuccess,
    error: saveError,
  } = useMutation({
    mutationFn: api.updateProfile,
    onSuccess: (data) => {
      queryClient.setQueryData(['profile'], data)
    },
  })

  const [fullName, setFullName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [addressStreet, setAddressStreet] = useState('')
  const [addressCity, setAddressCity] = useState('')
  const [addressPostalCode, setAddressPostalCode] = useState('')
  const [addressCountry, setAddressCountry] = useState('')

  useEffect(() => {
    if (!profile) return
    setFullName(profile.full_name ?? '')
    setPhoneNumber(profile.phone_number ?? '')
    setAddressStreet(profile.address_street ?? '')
    setAddressCity(profile.address_city ?? '')
    setAddressPostalCode(profile.address_postal_code ?? '')
    setAddressCountry(profile.address_country ?? '')
  }, [profile])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    save({
      full_name: fullName,
      phone_number: phoneNumber || null,
      address_street: addressStreet || null,
      address_city: addressCity || null,
      address_postal_code: addressPostalCode || null,
      address_country: addressCountry || null,
    })
  }

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-1 text-sm text-text-muted">
          Update your contact details and shipping address.
        </p>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card animate-pulse h-64 bg-surface/50" />
          <div className="card animate-pulse h-64 bg-surface/50" />
        </div>
      )}

      {error && (
        <div className="card border-red-800/40 bg-red-500/5 text-red-700 text-sm">
          Failed to load profile.
        </div>
      )}

      {profile && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card space-y-4">
              <h2 className="text-[10px] font-semibold text-text-muted uppercase tracking-widest">
                Account
              </h2>
              <Input
                label="Email"
                value={profile.email}
                disabled
                title="Managed by your identity provider"
              />
              <Input
                label="Full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
              <Input
                label="Phone number"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>

            <div className="card space-y-4">
              <h2 className="text-[10px] font-semibold text-text-muted uppercase tracking-widest">
                Shipping address
              </h2>
              <Input
                label="Street"
                value={addressStreet}
                onChange={(e) => setAddressStreet(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="City"
                  value={addressCity}
                  onChange={(e) => setAddressCity(e.target.value)}
                />
                <Input
                  label="Postal code"
                  value={addressPostalCode}
                  onChange={(e) => setAddressPostalCode(e.target.value)}
                />
              </div>
              <Input
                label="Country"
                value={addressCountry}
                onChange={(e) => setAddressCountry(e.target.value)}
              />
            </div>
          </div>

          {saveError && (
            <p className="text-sm text-red-700 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {saveError instanceof Error ? saveError.message : 'Failed to save profile.'}
            </p>
          )}

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : 'Save changes'}
            </Button>
            {isSuccess && !isPending && (
              <span className="flex items-center gap-1.5 text-sm text-text-muted">
                <CheckIcon />
                Saved
              </span>
            )}
          </div>
        </form>
      )}
    </main>
  )
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
