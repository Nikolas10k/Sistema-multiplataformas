"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  Settings,
  Menu,
  Bell,
  Layers,
  Building2,
  ShoppingCart,
  ChevronLeft,
  LogOut,
  Globe,
  Boxes,
  BarChart3,
  Stethoscope,
  FileText,
  CalendarDays,
  Activity,
  PawPrint,
  Syringe,
  Hospital,
  ClipboardList,
  Scissors,
  Receipt,
  X
} from "lucide-react";
import "./admin.css";
import { logout } from "@/actions/auth";
import { getTerm } from "@/lib/dictionary";
import { getMyTenantContext, getUnreadNotifications } from "@/actions/features";
import ProfileDropdown from "./ProfileDropdown";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userName, setUserName] = useState("Usuário");
  const [userRole, setUserRole] = useState("USER");
  const [context, setContext] = useState<any>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const cookies = document.cookie.split(";");
    const roleCookie = cookies.find((c) => c.trim().startsWith("user_role="));
    if (roleCookie) setUserRole(roleCookie.split("=")[1]);
    const nameCookie = cookies.find((c) => c.trim().startsWith("user_name="));
    if (nameCookie) setUserName(decodeURIComponent(nameCookie.split("=")[1]));

    if (window.innerWidth >= 1024) {
      setIsSidebarOpen(true);
    }

    getMyTenantContext().then(setContext);

    const fetchNotifications = async () => {
      const notifs = await getUnreadNotifications();
      setNotifications(notifs);
    };
    fetchNotifications();

    const interval = setInterval(fetchNotifications, 60000); // Polling cada 60s
    return () => clearInterval(interval);
  }, []);

  // Injeção de variáveis de tema e título
  useEffect(() => {
    if (context?.config?.primaryColor) {
      document.documentElement.style.setProperty('--accent', context.config.primaryColor);
      document.documentElement.style.setProperty('--accent-hover', `${context.config.primaryColor}dd`);
    }
    if (context?.config?.companyName) {
      document.title = `${context.config.companyName} | Givance`;
    }
  }, [context]);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    router.push("/");
  };

  const niche = context?.niche || 'GENERAL';
  const features = context?.features || [];

  const allItems = [
    { name: "Dashboard", icon: LayoutDashboard, path: "/admin" },
    { 
      name: niche === 'RESTAURANT' ? 'PDV / Mesas' : (niche === 'RETAIL' ? 'Vendas' : getTerm("patients", niche)), 
      icon: niche === 'RESTAURANT' ? Activity : (niche === 'PHYSIOTHERAPY' ? Stethoscope : (niche === 'RETAIL' ? ShoppingCart : Users)), 
      path: niche === 'RESTAURANT' ? "/pdv" : (niche === 'RETAIL' ? "/admin/vendas" : "/admin/pacientes"), 
      feature: niche === 'RETAIL' ? "sales.basic" : (niche === 'RESTAURANT' ? "pdv.basic" : "patients.manage") 
    },
    { 
      name: "Caderneta", 
      icon: FileText, 
      path: "/admin/mensal", 
      feature: "billing.basic", 
      nicheOnly: 'RESTAURANT' 
    },
    { 
      name: getTerm("appointment", niche), 
      icon: CalendarDays, 
      path: "/admin/agenda", 
      feature: "calendar.enabled" 
    },
    { 
      name: getTerm("clinical_file", niche), 
      icon: FileText, 
      path: niche === 'PHYSIOTHERAPY' ? "/admin/fisioterapia/prontuario" : "/admin/fichas", 
      feature: "clinical_files" 
    },
    { 
      name: 'Tutores', 
      icon: Users, 
      path: "/admin/tutores", 
      feature: "tutores.manage",
      nicheOnly: 'VETERINARY'
    },
    { 
      name: 'Animais', 
      icon: PawPrint, 
      path: "/admin/animais", 
      feature: "animals.manage",
      nicheOnly: 'VETERINARY'
    },
    { 
      name: 'Vacinas', 
      icon: Syringe, 
      path: "/admin/vacinas", 
      feature: "vaccines.enabled",
      nicheOnly: 'VETERINARY'
    },
    { 
      name: 'Internação', 
      icon: Hospital, 
      path: "/admin/internacao", 
      feature: "internment.enabled",
      nicheOnly: 'VETERINARY'
    },
    { 
      name: 'Receituário', 
      icon: FileText, 
      path: "/admin/prescricao", 
      feature: "vet_clinical_files",
      nicheOnly: 'VETERINARY'
    },
    { 
      name: 'Estética', 
      icon: Scissors, 
      path: "/admin/estetica", 
      feature: "animals.manage",
      nicheOnly: 'VETERINARY'
    },
    { name: "Painel Geral", icon: LayoutDashboard, path: "/admin" },
    { name: "Pacientes", icon: Users, path: "/admin/pacientes", nicheOnly: 'PHYSIOTHERAPY' },
    { name: "Vendas e Cobranças", icon: Receipt, path: "/admin/vendas", nicheOnly: 'PHYSIOTHERAPY' },
    { name: "Sessão", icon: Activity, path: "/admin/agenda", nicheOnly: 'PHYSIOTHERAPY' },
    { name: "Prontuário Eletrônico", icon: FileText, path: "/admin/fisioterapia/prontuario", nicheOnly: 'PHYSIOTHERAPY' },
    { name: "Serviço/Pacotes", icon: ClipboardList, path: "/admin/vendas/servicos", nicheOnly: 'PHYSIOTHERAPY' },
    { name: "Materiais Médicos", icon: ShoppingBag, path: "/admin/produtos", nicheOnly: 'PHYSIOTHERAPY' },
    
    // Itens de Restaurante / Varejo
    { name: "PDV / Vendas", icon: Receipt, path: "/pdv", nicheOnly: 'RESTAURANT' },
    { name: "Cardápio", icon: ClipboardList, path: "/admin/produtos", nicheOnly: 'RESTAURANT' },
    { name: "Estoque", icon: ShoppingBag, path: "/admin/produtos", nicheOnly: 'RETAIL' },
    { name: "Vendas", icon: Receipt, path: "/admin/vendas", nicheOnly: 'RETAIL' },

    { name: "Equipe", icon: Users, path: "/admin/equipe", feature: "employees.manage" },
    { name: "Relatórios", icon: BarChart3, path: "/admin/relatorios", feature: "reports.advanced" },
    { name: "Configurações", icon: Settings, path: "/admin/configuracoes", feature: "settings.manage" },
    { name: "Restaurantes", icon: Building2, path: "/admin/restaurantes", feature: "multiunit.enabled", nicheOnly: 'RESTAURANT' },
    { name: "Clientes (SaaS)", icon: Globe, path: "/admin/clientes", feature: "platform.tenants" },
  ];

  const menuItems = allItems.filter(item => {
    if (userRole === 'PLATFORM_ADMIN') return true;
    if (item.nicheOnly && niche !== item.nicheOnly) return false;
    return features.includes(item.feature) || !item.feature;
  });

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);

  const companyName = context?.config?.companyName || "GivanceSaaS";

  return (
    <div className="admin-layout">
      {/* ======================== SIDEBAR ======================== */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          {context?.tenantLogo ? (
            <div className="flex items-center gap-3">
              <img src={context.tenantLogo} alt="Logo" style={{ maxHeight: '36px', maxWidth: '100%', objectFit: 'contain' }} />
              {isSidebarOpen && <span className="sidebar-brand-name">{context?.tenantName}</span>}
            </div>
          ) : (
            <>
              <div className="sidebar-logo-icon">
                <Layers size={18} color="white" />
              </div>
              {isSidebarOpen && (
                <span className="sidebar-brand-name">{context?.tenantName || "GivanceSaaS"}</span>
              )}
            </>
          )}
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const isActive = pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`nav-link ${isActive ? "active" : ""}`}
                title={!isSidebarOpen ? item.name : undefined}
                onClick={() => {
                  if (window.innerWidth < 768) setIsSidebarOpen(false);
                }}
              >
                <item.icon size={18} className="nav-icon" />
                <span className="nav-text">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <Link
            href="/admin/settings"
            className={`nav-link ${pathname === "/admin/settings" ? "active" : ""}`}
            title={!isSidebarOpen ? "Configurações" : undefined}
          >
            <Settings size={18} className="nav-icon" />
            <span className="nav-text">Configurações</span>
          </Link>

          <button
            className="nav-link logout-link"
            onClick={handleLogout}
            disabled={loggingOut}
            title={!isSidebarOpen ? "Sair" : undefined}
          >
            <LogOut size={18} className="nav-icon" />
            <span className="nav-text">{loggingOut ? "Saindo..." : "Sair"}</span>
          </button>
        </div>
      </aside>

      {/* ======================== MAIN ======================== */}
      <div className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="sidebar-toggle"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              title="Expandir/Recolher menu"
            >
              {isSidebarOpen ? <ChevronLeft size={18} /> : <Menu size={18} />}
            </button>
            <span className="page-title">
              {niche === 'PHYSIOTHERAPY' ? 'Gestão Clínica v2' : (niche === 'VETERINARY' ? 'Gestão Veterinária v2' : 'Painel Gerencial v2')}
            </span>
          </div>

          <div className="topbar-right">
            <div style={{ position: 'relative' }}>
              <button 
                className={`btn-circle notification-btn ${notifications.length > 0 ? 'animate-pulse' : ''}`} 
                title="Notificações"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell size={17} />
                {notifications.length > 0 && (
                  <span className="notification-badge">{notifications.length}</span>
                )}
              </button>
              
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-64 bg-bg-surface border border-border shadow-xl rounded-lg overflow-hidden" style={{ zIndex: 1000, top: '40px' }}>
                  <div className="p-3 bg-bg-muted border-bottom text-sm font-bold flex-between">
                    Notificações
                    <button onClick={() => setShowNotifications(false)}><X size={14}/></button>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length > 0 ? notifications.map((n, i) => (
                      <div key={i} className="p-3 border-bottom hover:bg-bg-muted/50 cursor-pointer text-sm">
                        <div className="flex items-start gap-2">
                          <div className="w-2 h-2 rounded-full bg-accent mt-1.5" />
                          <p>{n.message}</p>
                        </div>
                      </div>
                    )) : (
                      <div className="p-4 text-center text-muted text-sm">Nenhuma notificação nova</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <ProfileDropdown
              userInitials={initials}
              userName={userName}
              role={userRole}
            />

            <button 
              className="btn-logout-topbar d-desktop" 
              onClick={handleLogout}
              disabled={loggingOut}
              title="Sair do sistema"
            >
              <LogOut size={16} />
              <span>Sair</span>
            </button>
          </div>
        </header>

        {isSidebarOpen && (
          <div 
            className="sidebar-overlay d-mobile" 
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <main className="page-container animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
