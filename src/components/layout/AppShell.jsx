import Sidebar from "./Sidebar"

export default function AppShell({ children, ...sidebarProps }) {
  return (
    <div className="flex min-h-screen bg-bg">
      <div className="hidden md:block">
        <Sidebar {...sidebarProps} />
      </div>
      <div className="md:hidden">
        <Sidebar {...sidebarProps} mobile />
      </div>
      <main className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
