import { Sidebar } from "@/components/Sidebar";
import Header from "@/components/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full overflow-x-hidden bg-[#09090b]">
      {/* Sidebar injetada lateralmente */}
      <Sidebar />
      
      {/* A MÁGICA ESTÁ AQUI: md:ml-[80px] */}
      <main className="flex-1 flex flex-col md:ml-[80px] transition-all duration-300 ease-in-out min-w-0 w-full overflow-x-hidden">
        <Header />
        
        {/* Container do Dashboard adaptável */}
        <div className="flex-1 p-4 sm:p-5 md:p-6 lg:p-8 w-full overflow-x-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}