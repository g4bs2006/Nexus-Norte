import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { useTemaEfetivo } from '@/hooks/useTemaEfetivo'

export function AppShell() {
  useTemaEfetivo()

  return (
    <div className="bg-background flex h-dvh overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
