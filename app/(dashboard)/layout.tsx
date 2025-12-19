import { Sidebar } from "../../components/Sidebar"; 
import { Header } from "../../components/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 flex flex-col md:ml-[240px] transition-all duration-300 ease-in-out">
        <Header />
        <div className="flex-1 overflow-x-hidden p-6">
          {children}
        </div>
      </main>
    </div>
  )
}