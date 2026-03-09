import Sidebar from "./Sidebar"

export default function AppShell({ children, ...sidebarProps }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="hidden md:flex md:min-h-screen">
        <Sidebar {...sidebarProps} />
        <main className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto p-8">
            {children}
          </div>
        </main>
      </div>
      <div className="md:hidden flex flex-col min-h-screen">
        <Sidebar {...sidebarProps} mobile />
        <main className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto p-4 sm:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
