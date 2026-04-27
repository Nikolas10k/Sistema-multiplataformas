"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { User, Settings, LogOut, Building2, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { logout } from "@/actions/auth";
import FeatureGate from "@/components/FeatureGate";

export default function ProfileDropdown({
  userInitials,
  userName,
  role,
  avatarUrl,
}: {
  userInitials: string;
  userName: string;
  role: string;
  avatarUrl?: string | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const roleLabel =
    role === "ADMIN" ? "Administrador" :
    role === "CASHIER" ? "Caixa" :
    role === "WAITER" ? "Garçom" : role;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="profile-dropdown-trigger"
      >
        <div className="profile-avatar overflow-hidden" style={{ backgroundColor: avatarUrl ? 'var(--bg-muted)' : 'transparent' }}>
          {avatarUrl ? (
            <img src={avatarUrl} alt={userName} className="w-full h-full object-contain p-1" />
          ) : (
            userInitials || "A"
          )}
        </div>
        <span
          style={{
            fontSize: "0.875rem",
            fontWeight: 600,
            color: "var(--text-primary)",
            display: "none",
          }}
          className="d-desktop"
        >
          {userName}
        </span>
        <ChevronDown
          size={14}
          color="var(--text-muted)"
          style={{ transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "none" }}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="dropdown-menu animate-fade-in"
          style={{
            position: "absolute",
            right: 0,
            top: "110%",
            minWidth: "220px",
            zIndex: 200,
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "0.875rem 1rem",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)" }}>
              {userName}
            </p>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
              {roleLabel}
            </p>
          </div>

          {/* Items */}
          <div style={{ padding: "0.375rem" }}>
            <Link
              href="/admin/settings"
              className="dropdown-item"
              onClick={() => setIsOpen(false)}
            >
              <User size={15} /> Meus Dados
            </Link>

            <Link
              href="/admin/settings?tab=plan"
              className="dropdown-item"
              onClick={() => setIsOpen(false)}
            >
              <Settings size={15} /> Configurações & Plano
            </Link>

            <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "0.375rem 0" }} />

            <button
              className="dropdown-item"
              style={{ color: "var(--danger)", width: "100%" }}
              onClick={handleLogout}
            >
              <LogOut size={15} /> Sair da Conta
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
