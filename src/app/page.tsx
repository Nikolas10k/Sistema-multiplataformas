"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/actions/auth";
import { 
  Lock, 
  User, 
  ArrowRight,
  ShieldCheck,
  Zap,
  Globe,
  Sparkles
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const res = await login(username, password);
      if (res.success && res.user) {
        if (res.user.role === "PLATFORM_ADMIN") {
          router.push("/admin/clientes");
        } else {
          router.push("/admin");
        }
      } else {
        setError(res.message || "Credenciais inválidas.");
      }
    } catch (err) {
      setError("Erro de conexão com o sistema.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-4k-viewport">
      {/* 4K Background with Overlay */}
      <div className="login-bg-overlay"></div>
      
      <div className="login-container">
        {/* Left: Branding & Welcome */}
        <div className="welcome-section animate-slide-right">
          <div className="branding-glass">
            <div className="logo-badge">
              <Sparkles className="text-accent" size={24} />
            </div>
            <h1 className="welcome-text">Bem vindo</h1>
            <p className="smart-slogan">Givance: Your Smart System</p>
            
            <div className="system-status">
              <div className="status-item">
                <Globe size={14} />
                <span>Global Access</span>
              </div>
              <div className="status-item">
                <ShieldCheck size={14} />
                <span>Secure SSL</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Login Card */}
        <div className="form-section animate-slide-left">
          <div className="login-glass-card">
            <div className="form-header">
              <h2 className="login-title">Acesso Restrito</h2>
              <p className="login-desc">Insira suas credenciais para continuar.</p>
            </div>

            <form onSubmit={handleLogin} className="login-form">
              <div className="input-group">
                <label>Identificação</label>
                <div className="input-glass-wrapper">
                  <User size={20} className="input-icon" />
                  <input 
                    type="text" 
                    placeholder="E-mail ou usuário" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Senha</label>
                <div className="input-glass-wrapper">
                  <Lock size={20} className="input-icon" />
                  <input 
                    type="password" 
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="error-banner animate-shake">
                  <Zap size={16} />
                  <span>{error}</span>
                </div>
              )}

              <button 
                type="submit" 
                className={`btn-login-4k ${loading ? 'loading' : ''}`}
                disabled={loading}
              >
                <span>{loading ? "Autenticando..." : "Entrar no Sistema"}</span>
                {!loading && <ArrowRight size={20} />}
                <div className="btn-shine"></div>
              </button>
            </form>

            <div className="form-footer">
              <a href="#">Recuperar acesso</a>
              <span className="dot"></span>
              <a href="#">Suporte</a>
            </div>

            <div className="condominio-portal animate-fade-in">
              <div className="portal-divider">
                <span>OU ACESSE OUTROS SISTEMAS</span>
              </div>
              <a href="http://187.127.25.208:3001" className="btn-portal-condominio" target="_blank" rel="noopener noreferrer">
                <div className="portal-icon">
                  <Sparkles size={16} />
                </div>
                <div className="portal-text">
                  <span className="portal-label">Portal do Condomínio</span>
                  <span className="portal-sub">Agente IA Operacional</span>
                </div>
                <ArrowRight size={14} className="arrow-hover" />
              </a>
            </div>
          </div>
          
          <p className="copyright-text">© 2026 Givance Systems • Todos os direitos reservados</p>
        </div>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap');

        :root {
          --accent: #6366f1;
          --accent-glow: rgba(99, 102, 241, 0.5);
          --glass-bg: rgba(255, 255, 255, 0.05);
          --glass-border: rgba(255, 255, 255, 0.1);
        }

        .login-4k-viewport {
          min-height: 100vh;
          width: 100%;
          background: #050505 url('/login_bg_4k.png') no-repeat center center;
          background-size: cover;
          font-family: 'Outfit', sans-serif;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }

        .login-bg-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 100%);
          z-index: 1;
        }

        .login-container {
          position: relative;
          z-index: 10;
          display: flex;
          width: 100%;
          max-width: 1200px;
          padding: 2rem;
          gap: 6rem;
          align-items: center;
        }

        @media (max-width: 1024px) {
          .login-container {
            flex-direction: column;
            gap: 3rem;
            text-align: center;
          }
          .welcome-section { display: none; }
        }

        /* Branding Section */
        .branding-glass {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          padding: 4rem;
          border-radius: 4rem;
          border: 1px solid var(--glass-border);
          box-shadow: 0 40px 100px rgba(0,0,0,0.4);
        }

        .logo-badge {
          width: 60px;
          height: 60px;
          background: var(--accent);
          border-radius: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 2rem;
          box-shadow: 0 10px 30px var(--accent-glow);
        }

        .welcome-text {
          font-size: 5rem;
          font-weight: 800;
          line-height: 1;
          letter-spacing: -2px;
          margin-bottom: 1rem;
          background: linear-gradient(to bottom, #fff, #888);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .smart-slogan {
          font-size: 1.5rem;
          font-weight: 300;
          opacity: 0.7;
          margin-bottom: 3rem;
        }

        .system-status {
          display: flex;
          gap: 2rem;
        }

        .status-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          opacity: 0.5;
        }

        /* Login Card */
        .login-glass-card {
          background: rgba(15, 15, 15, 0.6);
          backdrop-filter: blur(40px);
          padding: 4rem;
          border-radius: 3rem;
          border: 1px solid var(--glass-border);
          width: 100%;
          max-width: 480px;
          box-shadow: 0 50px 120px rgba(0,0,0,0.5);
        }

        .login-title {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .login-desc {
          font-size: 0.875rem;
          opacity: 0.5;
          margin-bottom: 3rem;
        }

        .input-group {
          margin-bottom: 1.5rem;
        }

        .input-group label {
          display: block;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 0.75rem;
          opacity: 0.6;
        }

        .input-glass-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--glass-border);
          border-radius: 1.25rem;
          padding: 0 1.25rem;
          transition: all 0.3s ease;
        }

        .input-glass-wrapper:focus-within {
          border-color: var(--accent);
          background: rgba(99, 102, 241, 0.08);
          box-shadow: 0 0 20px rgba(99, 102, 241, 0.1);
        }

        .input-icon {
          opacity: 0.3;
          margin-right: 1rem;
          transition: opacity 0.3s;
        }

        .input-glass-wrapper:focus-within .input-icon {
          opacity: 1;
          color: var(--accent);
        }

        .input-glass-wrapper input {
          width: 100%;
          background: transparent;
          border: none;
          padding: 1.25rem 0;
          color: white;
          outline: none;
          font-size: 1rem;
        }

        .btn-login-4k {
          width: 100%;
          background: var(--accent);
          color: white;
          padding: 1.5rem;
          border-radius: 1.25rem;
          border: none;
          font-weight: 700;
          font-size: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          margin-top: 2rem;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .btn-login-4k:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 40px var(--accent-glow);
        }

        .btn-shine {
          position: absolute;
          top: 0;
          left: -100%;
          width: 50%;
          height: 100%;
          background: linear-gradient(to right, transparent, rgba(255,255,255,0.2), transparent);
          transform: skewX(-25deg);
          animation: shine 4s infinite;
        }

        @keyframes shine {
          0% { left: -100%; }
          20% { left: 150%; }
          100% { left: 150%; }
        }

        .error-banner {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #ef4444;
          padding: 1rem;
          border-radius: 1rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.875rem;
          margin-top: 1rem;
        }

        .form-footer {
          margin-top: 2.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          font-size: 0.75rem;
        }

        .form-footer a {
          color: white;
          opacity: 0.4;
          text-decoration: none;
          transition: opacity 0.3s;
        }

        .form-footer a:hover { opacity: 1; }

        .dot { width: 4px; height: 4px; background: rgba(255,255,255,0.2); border-radius: 50%; }

        /* Condominio Portal Style */
        .condominio-portal {
          margin-top: 2rem;
          padding-top: 2rem;
          border-top: 1px solid rgba(255,255,255,0.05);
        }

        .portal-divider {
          text-align: center;
          margin-bottom: 1.5rem;
          position: relative;
        }

        .portal-divider span {
          font-size: 0.6rem;
          letter-spacing: 2px;
          opacity: 0.3;
          background: #0f0f0f;
          padding: 0 1rem;
        }

        .btn-portal-condominio {
          display: flex;
          align-items: center;
          gap: 1rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 1rem 1.25rem;
          border-radius: 1.25rem;
          text-decoration: none;
          color: white;
          transition: all 0.3s ease;
        }

        .btn-portal-condominio:hover {
          background: rgba(99, 102, 241, 0.1);
          border-color: rgba(99, 102, 241, 0.3);
          transform: translateY(-2px);
        }

        .portal-icon {
          width: 32px;
          height: 32px;
          background: rgba(99, 102, 241, 0.2);
          border-radius: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent);
        }

        .portal-text {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .portal-label {
          font-size: 0.875rem;
          font-weight: 600;
        }

        .portal-sub {
          font-size: 0.65rem;
          opacity: 0.4;
        }

        .arrow-hover {
          opacity: 0;
          transform: translateX(-10px);
          transition: all 0.3s ease;
          color: var(--accent);
        }

        .btn-portal-condominio:hover .arrow-hover {
          opacity: 1;
          transform: translateX(0);
        }

        .copyright-text {
          margin-top: 3rem;
          font-size: 0.7rem;
          opacity: 0.3;
          text-align: center;
        }

        /* Animations */
        .animate-slide-right { animation: slideRight 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-slide-left { animation: slideLeft 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

        @keyframes slideRight {
          from { opacity: 0; transform: translateX(-60px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes slideLeft {
          from { opacity: 0; transform: translateX(60px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .animate-shake {
          animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
        }

        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }
      `}</style>
    </div>
  );
}
