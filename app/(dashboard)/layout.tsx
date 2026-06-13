import { Sidebar } from "@/components/Sidebar";
import Header from "@/components/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full overflow-x-hidden bg-[#09090b]">
      {/* Sidebar lateral */}
      <Sidebar />
      
      <main className="flex-1 flex flex-col md:ml-[80px] transition-all duration-300 ease-in-out min-w-0 w-full overflow-x-hidden">
        {/* Header com o perfil flutuante */}
        <Header />
        
        {/* Conteúdo principal da página */}
        <div className="flex-1 p-4 sm:px-5 sm:pb-5 md:px-6 md:pb-6 pt-0 md:pt-1 lg:px-8 lg:pb-8 lg:pt-2 w-full overflow-x-hidden">
          {children}
        </div>

        {/* RODAPÉ SIMPLES E DISCRETO */}
        <footer className="w-full py-4 text-center border-t border-white/5 mt-auto bg-transparent px-4 sm:px-5 md:px-6 lg:px-8">
          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
            &copy; {new Date().getFullYear()} 2Mangos. Todos os direitos reservados.
          </p>
        </footer>
      </main>
    </div>
  );
}