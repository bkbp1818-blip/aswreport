import { AccessProvider } from '@/contexts/AccessContext'

export default function AccessLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AccessProvider>
      {/* หน้า access ไม่มี sidebar */}
      {children}
    </AccessProvider>
  )
}
