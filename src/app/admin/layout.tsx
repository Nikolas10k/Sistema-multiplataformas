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
  Activity
} from "lucide-react";
import "./admin.css";
import ProfileDropdown from "./ProfileDropdown";
import { logout } from "@/actions/auth";
import { getTerm } from "@/lib/dictionary";
import { getMyTenantContext } from "@/actions/features";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [userName, setUserName] = useState("Usuário");
  const [userRole, setUserRole] = useState("USER");
  const [context, setContext] = useState<any>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const cookies = document.cookie.split(";");
    const roleCookie = cookies.find((c) => c.trim().startsWith("user_role="));
    if (roleCookie) setUserRole(roleCookie.split("=")[1]);
    const nameCookie = cookies.find((c) => c.trim().startsWith("user_name="));
    if (nameCookie) setUserName(decodeURIComponent(nameCookie.split("=")[1]));

    getMyTenantContext().then(setContext);

    // Fechar sidebar em mobile por padrão
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
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
    { name: getTerm("product", niche) + "s", icon: ShoppingBag, path: "/admin/produtos", feature: "products.manage" },
    { name: getTerm("stock", niche), icon: Boxes, path: "/admin/estoque", feature: "inventory.basic" },
    { name: "Equipe", icon: Users, path: "/admin/equipe", feature: "employees.manage" },
    { name: "Relatórios", icon: BarChart3, path: "/admin/relatorios", feature: "reports.advanced" },
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
      <aside className={`sidebar ${isSidebarOpen ? "open" : "closed"}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo-icon">
            {context?.config?.logoUrl ? (
              <img src={context.config.logoUrl} alt="Logo" width={24} height={24} />
            ) : (
              <Layers size={18} color="white" />
            )}
          </div>
          {isSidebarOpen && (
            <span className="sidebar-brand-name">{companyName}</span>
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
              {niche === 'PHYSIOTHERAPY' ? 'Gestão Clínica' : 'Painel Gerencial'}
            </span>
          </div>

          <div className="topbar-right">
            <button className="btn-circle notification-btn" title="Notificações">
              <Bell size={17} />
              <span className="notification-badge">3</span>
            </button>

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
