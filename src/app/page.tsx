"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/actions/auth";
import { 
  Lock, 
  User, 
  Zap,
  ChevronRight,
  ShieldCheck,
  Activity,
  Cpu
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
    <div className="login-ultimate-container">
      {/* Background Ornaments */}
      <div className="neural-network-bg"></div>
      <div className="scanline"></div>
      
      <div className="login-layout animate-in">
        
        {/* Visual Content */}
        <div className="visual-panel">
          <div className="panel-content">
            <h1 className="main-title">Faça login</h1>
            <h2 className="sub-title">E entre para o nosso time</h2>
            
            <div className="illustration-box">
              <img 
                src="/futuristic_login_illustration.png" 
                alt="Cyber Interface" 
                className="main-illustration"
              />
              <div className="hologram-glow"></div>
            </div>

            <div className="status-indicators">
              <div className="indicator">
                <Activity size={12} className="text-neon" />
                <span>Neural Link: Stable</span>
              </div>
              <div className="indicator">
                <Cpu size={12} className="text-neon" />
                <span>Core: Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Auth Panel */}
        <div className="auth-panel">
          <div className="login-card">
            <div className="login-card-inner">
              <div className="card-header">
                <ShieldCheck size={40} className="text-neon mb-4" />
                <h3 className="card-title">LOGIN</h3>
                <div className="title-underline"></div>
              </div>

              <form onSubmit={handleLogin} className="auth-form">
                <div className="auth-group">
                  <label>Identidade Digital</label>
                  <div className="input-cyber">
                    <User size={18} className="icon-cyber" />
                    <input 
                      type="text" 
                      placeholder="usuário_id" 
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="auth-group">
                  <label>Chave de Acesso</label>
                  <div className="input-cyber">
                    <Lock size={18} className="icon-cyber" />
                    <input 
                      type="password" 
                      placeholder="••••••••" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-actions">
                    <a href="#" className="link-cyber">Esqueceu a chave?</a>
                  </div>
                </div>

                {error && (
                  <div className="auth-error">
                    <Zap size={14} />
                    <span>{error}</span>
                  </div>
                )}

                <button 
                  type="submit" 
                  className={`btn-cyber ${loading ? 'loading' : ''}`}
                  disabled={loading}
                >
                  <span className="btn-text">{loading ? "SINCRONIZANDO..." : "ACESSAR SISTEMA"}</span>
                  <ChevronRight size={20} className="btn-arrow" />
                  <div className="btn-shimmer"></div>
                </button>
              </form>

              <div className="card-footer">
                <p className="footer-text">© 2026 Givance Neural Systems</p>
                <div className="binary-decoration">01101 10101 00110</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&family=JetBrains+Mono:wght@400;700&display=swap');

        :root {
          --neon: #00ff9d;
          --neon-glow: rgba(0, 255, 157, 0.4);
          --deep-dark: #08080c;
          --panel-dark: #12121a;
          --border-cyber: rgba(255, 255, 255, 0.08);
        }

        .login-ultimate-container {
          min-height: 100vh;
          background: var(--deep-dark);
          color: white;
          font-family: 'Outfit', sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          position: relative;
        }

        /* Background Effects */
        .neural-network-bg {
          position: absolute;
          inset: 0;
          background-image: 
            radial-gradient(circle at 20% 30%, rgba(0, 255, 157, 0.05) 0%, transparent 40%),
            radial-gradient(circle at 80% 70%, rgba(79, 70, 229, 0.05) 0%, transparent 40%);
          z-index: 0;
        }

        .scanline {
          position: absolute;
          width: 100%;
          height: 100px;
          background: linear-gradient(to bottom, transparent, rgba(0, 255, 157, 0.03), transparent);
          top: -100px;
          left: 0;
          animation: scanline 4s linear infinite;
          z-index: 1;
          pointer-events: none;
        }

        @keyframes scanline {
          from { top: -100px; }
          to { top: 100%; }
        }

        .login-layout {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          width: 100%;
          max-width: 1300px;
          padding: 2rem;
          gap: 4rem;
          z-index: 10;
          align-items: center;
        }

        @media (max-width: 1024px) {
          .login-layout {
            grid-template-columns: 1fr;
            max-width: 500px;
          }
          .visual-panel { display: none; }
        }

        /* Visual Panel */
        .main-title {
          font-size: 5rem;
          font-weight: 800;
          line-height: 1;
          margin-bottom: 1rem;
          letter-spacing: -2px;
          background: linear-gradient(to bottom, #fff 30%, var(--neon));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .sub-title {
          font-size: 1.75rem;
          font-weight: 400;
          opacity: 0.8;
          margin-bottom: 4rem;
        }

        .illustration-box {
          position: relative;
          padding: 2rem;
        }

        .main-illustration {
          width: 100%;
          max-width: 600px;
          filter: drop-shadow(0 0 50px var(--neon-glow));
          animation: float 6s ease-in-out infinite;
        }

        .hologram-glow {
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 80%;
          height: 20px;
          background: var(--neon);
          filter: blur(40px);
          opacity: 0.3;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-30px) rotate(2deg); }
        }

        .status-indicators {
          display: flex;
          gap: 2rem;
          margin-top: 4rem;
        }

        .indicator {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          opacity: 0.6;
        }

        .text-neon { color: var(--neon); }

        /* Auth Panel */
        .login-card {
          background: rgba(18, 18, 26, 0.7);
          backdrop-filter: blur(30px);
          border: 1px solid var(--border-cyber);
          padding: 3.5rem;
          border-radius: 2.5rem;
          position: relative;
          box-shadow: 0 40px 100px rgba(0,0,0,0.6);
        }

        .login-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 2.5rem;
          padding: 1px;
          background: linear-gradient(135deg, rgba(255,255,255,0.1), transparent 40%, rgba(0, 255, 157, 0.1));
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }

        .card-title {
          font-size: 2.5rem;
          font-weight: 800;
          letter-spacing: 10px;
          text-align: center;
          margin-bottom: 0.5rem;
        }

        .title-underline {
          width: 60px;
          height: 4px;
          background: var(--neon);
          margin: 0 auto 3rem;
          border-radius: 2px;
          box-shadow: 0 0 15px var(--neon-glow);
        }

        .auth-group {
          margin-bottom: 2rem;
        }

        .auth-group label {
          display: block;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: #888;
          margin-bottom: 0.75rem;
          padding-left: 0.5rem;
        }

        .input-cyber {
          display: flex;
          align-items: center;
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--border-cyber);
          border-radius: 1rem;
          padding: 0 1.25rem;
          transition: all 0.3s ease;
        }

        .input-cyber:focus-within {
          border-color: var(--neon);
          background: rgba(0, 255, 157, 0.05);
          box-shadow: 0 0 20px rgba(0, 255, 157, 0.05);
        }

        .icon-cyber {
          color: var(--neon);
          opacity: 0.5;
          margin-right: 1rem;
        }

        .input-cyber input {
          width: 100%;
          background: transparent;
          border: none;
          padding: 1.25rem 0;
          color: white;
          font-size: 1rem;
          outline: none;
          font-family: 'JetBrains Mono', monospace;
        }

        .link-cyber {
          font-size: 0.75rem;
          color: #666;
          text-decoration: none;
          transition: color 0.2s;
        }

        .link-cyber:hover { color: var(--neon); }

        .btn-cyber {
          width: 100%;
          background: var(--neon);
          color: #000;
          padding: 1.5rem;
          border-radius: 1.25rem;
          border: none;
          font-weight: 800;
          font-size: 1rem;
          letter-spacing: 2px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          margin-top: 2rem;
          position: relative;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .btn-cyber:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 40px var(--neon-glow);
        }

        .btn-shimmer {
          position: absolute;
          top: -100%;
          left: -100%;
          width: 300%;
          height: 300%;
          background: linear-gradient(45deg, transparent, rgba(255,255,255,0.4), transparent);
          transform: rotate(45deg);
          animation: shimmer 3s infinite;
        }

        @keyframes shimmer {
          0% { transform: translate(-100%, -100%) rotate(45deg); }
          100% { transform: translate(100%, 100%) rotate(45deg); }
        }

        .auth-error {
          margin-top: 1.5rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #ef4444;
          padding: 1rem;
          border-radius: 0.75rem;
          font-size: 0.875rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .card-footer {
          margin-top: 4rem;
          text-align: center;
          opacity: 0.3;
        }

        .footer-text { font-size: 0.7rem; letter-spacing: 1px; }
        .binary-decoration { font-family: 'JetBrains Mono'; font-size: 0.6rem; margin-top: 0.5rem; }

        .animate-in {
          animation: slideUpFade 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
