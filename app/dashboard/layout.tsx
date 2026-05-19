import Header from "@/components/dashboard/Header"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative flex min-h-screen flex-col bg-muted/40">
      <Header />
      <main className="flex-1">
        <div className="container py-8 mx-auto max-w-5xl">
          {children}
        </div>
      </main>
    </div>
  )
}
