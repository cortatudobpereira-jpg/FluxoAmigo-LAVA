import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  Car, 
  Coins, 
  Users, 
  Package, 
  Wrench, 
  BarChart3, 
  Settings, 
  LogOut, 
  ChevronRight, 
  Menu, 
  X,
  CreditCard
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { signOut, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    { name: 'Fila de Lavagem', path: '/fila', icon: Car },
    { name: 'Fluxo de Caixa', path: '/financeiro', icon: CreditCard },
    { name: 'Clientes', path: '/clientes', icon: Users },
    { name: 'Estoque', path: '/estoque', icon: Package },
    { name: 'Serviços', path: '/servicos', icon: Wrench },
    ...(role === 'admin' ? [
      { name: 'Relatórios', path: '/relatorios', icon: BarChart3 },
      { name: 'Configurações', path: '/configuracoes', icon: Settings }
    ] : []),
  ];

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const SidebarContent = () => {
    const { user, role } = useAuth();
    const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário';
    const userInitials = userName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();

    return (
      <div className="h-full flex flex-col items-center py-6">
        {/* Header */}
        <div className="w-full px-6 flex items-center space-x-3 mb-10">
          <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 overflow-hidden ring-2 ring-white/50">
            <img src="/src/assets/osdevs-logo.jpeg" alt="Os Devs" className="w-full h-full object-cover mix-blend-multiply" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-slate-900 tracking-tight leading-none">FluxoAmigo</span>
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-1">Lava Auto</span>
          </div>
        </div>

        {/* Menu */}
        <nav className="flex-1 w-full px-4 space-y-1.5 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) => `
                  group flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 relative overflow-hidden
                  ${isActive 
                    ? 'bg-blue-600 text-white shadow-[0_8px_20px_rgba(37,99,235,0.4)] z-10' 
                    : 'text-slate-600 hover:bg-white/20 hover:text-slate-900'
                  }
                `}
              >
                <div className="flex items-center space-x-3 relative z-10">
                  <item.icon className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-blue-600'}`} />
                  <span className="text-sm font-semibold tracking-wide">
                    {item.name}
                  </span>
                </div>
                <ChevronRight className={`w-4 h-4 transition-all duration-300 ${isActive ? 'text-white translate-x-1' : 'opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 text-slate-400'}`} />
                
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-500 -z-10" />
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="w-full p-4 mt-auto">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-sm shadow-lg ring-2 ring-white/20 uppercase">
                  {userInitials}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-slate-900 truncate">{userName}</span>
                  <span className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">
                    {role === 'admin' ? 'Admin' : 'Usuário'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-black/5">
              {role === 'admin' && (
              <button 
                onClick={() => navigate('/configuracoes')}
                className="flex-1 flex items-center justify-center p-2 text-slate-500 hover:text-blue-600 hover:bg-white/50 rounded-lg transition-all border border-transparent hover:border-white/50"
                title="Configurações"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
              <button 
                onClick={handleLogout}
                className="flex-1 flex items-center justify-center p-2 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all border border-transparent hover:border-red-100"
                title="Sair"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-[#F0F5FF] font-sans overflow-hidden relative">
      {/* Windows 11 Bloom Style Background Elements */}
      <div className="fixed inset-0 -z-10 bg-[#F0F5FF] overflow-hidden">
        {/* Organic wave shapes with blur */}
        <div className="absolute top-[-20%] left-[-10%] w-[700px] h-[700px] bg-blue-400/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] bg-sky-300/30 rounded-full blur-[100px]" />
        <div className="absolute top-[20%] right-[10%] w-[400px] h-[400px] bg-indigo-200/20 rounded-full blur-[80px]" />
        
        {/* Subtle mesh gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-50/50 via-transparent to-sky-50/30" />
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-72 h-full p-4 relative z-20">
        <div className="h-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-[2rem] shadow-[0_8px_32px_rgba(0,0,0,0.03)] overflow-hidden flex flex-col">
          <SidebarContent />
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div 
            className="absolute left-4 top-4 bottom-4 w-[280px] bg-white/40 backdrop-blur-xl rounded-[2rem] shadow-2xl overflow-hidden animate-in slide-in-from-left duration-300 flex flex-col border border-white/30"
            onClick={(e) => e.stopPropagation()}
          >
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        {/* Header (mainly for mobile) */}
        <header className="lg:hidden h-16 flex items-center justify-between px-6 bg-white/10 backdrop-blur-md border-b border-white/10">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center overflow-hidden ring-1 ring-black/5">
              <img src="/src/assets/osdevs-logo.jpeg" alt="Os Devs" className="w-full h-full object-cover mix-blend-multiply" />
            </div>
            <span className="font-bold text-slate-800 tracking-tight">FluxoAmigo</span>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 text-slate-600 hover:bg-white/40 rounded-xl transition-all border border-transparent hover:border-white/20"
          >
            <Menu className="w-6 h-6" />
          </button>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-10 custom-scrollbar relative">
          {/* Subtle background flair */}
          <div className="fixed top-0 right-0 -z-10 w-[500px] h-[500px] bg-blue-100/30 rounded-full blur-[120px] pointer-events-none translate-x-1/2 -translate-y-1/2" />
          
          <div className="max-w-7xl mx-auto h-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
