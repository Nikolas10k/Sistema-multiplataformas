"use client";

import { useState, useEffect, Suspense } from "react";
import { User, Shield, CreditCard, Check, Zap, Star, Crown, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { updateUser } from "@/actions/admin-users"; 
import { getMyTenantContext, updateTenantProfile } from "@/actions/features";

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams?.get("tab") || "profile";
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const [userId, setUserId] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Tenant Profile State
  const [tenantDoc, setTenantDoc] = useState("");
  const [tenantPhone, setTenantPhone] = useState("");
  const [tenantEmail, setTenantEmail] = useState("");
  const [tenantAddress, setTenantAddress] = useState("");

  useEffect(() => {
    const cookies = document.cookie.split(';');
    const idCookie = cookies.find(c => c.trim().startsWith('user_id='));
    if (idCookie) setUserId(idCookie.split('=')[1]);

    getMyTenantContext().then(ctx => {
      if (ctx) {
        setTenantDoc(ctx.config.document || "");
        setTenantPhone(ctx.config.phone || "");
        setTenantEmail(ctx.config.email || "");
        setTenantAddress(ctx.config.address || "");
      }
    });
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setLoading(true);
    
    const data = { name, username, password: password || undefined };
    const res = await updateUser(userId, data);
    
    // Also update tenant profile data
    await updateTenantProfile({
      document: tenantDoc,
      phone: tenantPhone,
      email: tenantEmail,
      address: tenantAddress
    });
    
    setLoading(false);
    if (res.success) {
      alert("Perfil atualizado com sucesso!");
      setPassword("");
      router.refresh();
    } else {
      alert(res.message || "Erro ao atualizar");
    }
  };

  const handleUpgrade = (plan: string) => {
    window.location.href = `mailto:givance@givanceresto.com.br?subject=Solicitação de Upgrade - Plano ${plan}&body=Olá, a cliente Priscila solicita um upgrade para o plano ${plan}.`;
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="text-h2">Configurações da Conta</h1>
        <p className="text-muted text-sm mt-1">Gerencie seus dados e sua assinatura da plataforma.</p>
      </div>

      <div className="card">
        {/* Menu de Configs (Vertical) */}
        <div className="flex flex-col mb-8" style={{ gap: '0.5rem' }}>
          <button 
            className={`p-3 text-left rounded-md ${activeTab === 'profile' ? 'bg-accent text-white font-bold' : 'text-muted hover:bg-secondary'}`}
            style={{ 
              background: activeTab === 'profile' ? 'var(--accent-primary)' : 'var(--bg-tertiary)', 
              color: activeTab === 'profile' ? '#fff' : 'var(--text-primary)',
              border: 'none', 
              cursor: 'pointer', 
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}
            onClick={() => setActiveTab('profile')}
          >
            <User size={18} /> Meu Perfil
          </button>
          <button 
            className={`p-3 text-left rounded-md ${activeTab === 'security' ? 'bg-accent text-white font-bold' : 'text-muted hover:bg-secondary'}`}
            style={{ 
              background: activeTab === 'security' ? 'var(--accent-primary)' : 'var(--bg-tertiary)', 
              color: activeTab === 'security' ? '#fff' : 'var(--text-primary)',
              border: 'none', 
              cursor: 'pointer', 
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}
            onClick={() => setActiveTab('security')}
          >
            <Shield size={18} /> Segurança
          </button>
          <button 
            className={`p-3 text-left rounded-md ${activeTab === 'plan' ? 'bg-accent text-white font-bold' : 'text-muted hover:bg-secondary'}`}
            style={{ 
              background: activeTab === 'plan' ? 'var(--accent-primary)' : 'var(--bg-tertiary)', 
              color: activeTab === 'plan' ? '#fff' : 'var(--text-primary)',
              border: 'none', 
              cursor: 'pointer', 
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}
            onClick={() => setActiveTab('plan')}
          >
            <CreditCard size={18} /> Assinatura e Planos
          </button>
        </div>

        {/* Área de Conteúdo */}
        <div className="flex-1">
          {(activeTab === 'profile' || activeTab === 'security') && (
            <div className="animate-fade-in" style={{ maxWidth: '500px' }}>
              <h2 className="text-h3 mb-6">{activeTab === 'profile' ? 'Dados Pessoais' : 'Alterar Senha'}</h2>
              <form onSubmit={handleUpdateProfile}>
                {activeTab === 'profile' ? (
                  <>
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-1">Nome Completo</label>
                      <input type="text" className="input-field" value={name} onChange={e => setName(e.target.value)} placeholder="Novo nome (opcional)" />
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-1">Nome de Usuário (Login)</label>
                      <input type="text" className="input-field" value={username} onChange={e => setUsername(e.target.value)} placeholder="Novo usuário (opcional)" />
                    </div>
                    <hr className="my-6 border-border" />
                    <h3 className="text-h3 mb-4">Dados da Empresa</h3>
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-1">E-mail de Contato</label>
                      <input type="email" className="input-field" value={tenantEmail} onChange={e => setTenantEmail(e.target.value)} placeholder="email@empresa.com" />
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-1">Telefone / WhatsApp</label>
                      <input type="text" className="input-field" value={tenantPhone} onChange={e => setTenantPhone(e.target.value)} placeholder="(11) 90000-0000" />
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-1">CPF ou CNPJ</label>
                      <input type="text" className="input-field" value={tenantDoc} onChange={e => setTenantDoc(e.target.value)} placeholder="000.000.000-00" />
                    </div>
                    <div className="mb-6">
                      <label className="block text-sm font-medium mb-1">Endereço Completo</label>
                      <textarea className="input-field" value={tenantAddress} onChange={e => setTenantAddress(e.target.value)} placeholder="Rua, Número, Bairro, Cidade" rows={2}></textarea>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mb-6">
                      <label className="block text-sm font-medium mb-1">Nova Senha</label>
                      <input type="password" className="input-field" value={password} onChange={e => setPassword(e.target.value)} placeholder="Digite para alterar a senha" />
                    </div>
                  </>
                )}
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? "Salvando..." : "Salvar Alterações"}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'plan' && (
            <div className="animate-fade-in">
              <div className="text-center mb-8">
                <h2 className="text-h2">Faça Upgrade na sua Operação</h2>
                <p className="text-muted mt-2">Escolha o plano ideal para escalar os seus restaurantes.</p>
              </div>

              <div className="grid-3">
                <div className="card" style={{ borderTop: '4px solid var(--text-muted)' }}>
                  <div className="flex-between mb-4">
                    <h3 className="text-h3 flex items-center" style={{ gap: '0.5rem' }}><Zap size={18} className="text-muted" /> Start</h3>
                  </div>
                  <p className="text-sm text-muted mb-6">Ideal para quem está começando e tem apenas 1 loja.</p>
                  <ul className="mb-8 flex flex-col" style={{ gap: '0.75rem', fontSize: '0.875rem' }}>
                    <li className="flex items-center" style={{ gap: '0.5rem' }}><Check size={16} className="text-success" /> 1 Restaurante</li>
                    <li className="flex items-center" style={{ gap: '0.5rem' }}><Check size={16} className="text-success" /> Até 3 Funcionários</li>
                    <li className="flex items-center" style={{ gap: '0.5rem' }}><Check size={16} className="text-success" /> Cardápio Digital (PDV)</li>
                    <li className="flex items-center text-muted" style={{ gap: '0.5rem', opacity: 0.5 }}><X size={16} /> Comanda Mobile p/ Garçom</li>
                    <li className="flex items-center text-muted" style={{ gap: '0.5rem', opacity: 0.5 }}><X size={16} /> Relatórios Avançados</li>
                  </ul>
                  <button className="btn btn-secondary w-full" onClick={() => handleUpgrade('STARTER')}>Fazer Upgrade</button>
                </div>

                <div className="card relative" style={{ borderTop: '4px solid var(--accent-primary)', transform: 'scale(1.05)', zIndex: 10, boxShadow: 'var(--shadow-glow)' }}>
                  <div className="absolute top-0 right-0 bg-accent text-white text-xs px-2 py-1 rounded-bl-lg font-bold" style={{ backgroundColor: 'var(--accent-primary)' }}>
                    MAIS POPULAR
                  </div>
                  <div className="flex-between mb-4">
                    <h3 className="text-h3 flex items-center text-accent" style={{ gap: '0.5rem' }}><Star size={18} /> Pro</h3>
                  </div>
                  <p className="text-sm text-muted mb-6">A solução completa para operação de salão.</p>
                  <ul className="mb-8 flex flex-col" style={{ gap: '0.75rem', fontSize: '0.875rem' }}>
                    <li className="flex items-center" style={{ gap: '0.5rem' }}><Check size={16} className="text-success" /> 1 Restaurante</li>
                    <li className="flex items-center" style={{ gap: '0.5rem' }}><Check size={16} className="text-success" /> Funcionários Ilimitados</li>
                    <li className="flex items-center" style={{ gap: '0.5rem' }}><Check size={16} className="text-success" /> Cardápio Digital (PDV)</li>
                    <li className="flex items-center font-medium" style={{ gap: '0.5rem' }}><Check size={16} className="text-accent" /> Comanda Mobile p/ Garçom</li>
                    <li className="flex items-center text-muted" style={{ gap: '0.5rem', opacity: 0.5 }}><X size={16} /> Multi-lojas</li>
                  </ul>
                  <button className="btn w-full text-white" style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' }} onClick={() => handleUpgrade('PRO')}>
                    Fazer Upgrade
                  </button>
                </div>

                <div className="card" style={{ borderTop: '4px solid #f59e0b' }}>
                  <div className="flex-between mb-4">
                    <h3 className="text-h3 flex items-center" style={{ gap: '0.5rem', color: '#f59e0b' }}><Crown size={18} /> Premium</h3>
                  </div>
                  <p className="text-sm text-muted mb-6">Para redes de franquias ou quem tem múltiplas lojas.</p>
                  <ul className="mb-8 flex flex-col" style={{ gap: '0.75rem', fontSize: '0.875rem' }}>
                    <li className="flex items-center" style={{ gap: '0.5rem' }}><Check size={16} className="text-success" /> Lojas Ilimitadas</li>
                    <li className="flex items-center" style={{ gap: '0.5rem' }}><Check size={16} className="text-success" /> Funcionários Ilimitados</li>
                    <li className="flex items-center" style={{ gap: '0.5rem' }}><Check size={16} className="text-success" /> Comanda Mobile</li>
                    <li className="flex items-center font-medium" style={{ gap: '0.5rem', color: '#f59e0b' }}><Check size={16} color="#f59e0b" /> Painel Multi-lojas</li>
                    <li className="flex items-center font-medium" style={{ gap: '0.5rem', color: '#f59e0b' }}><Check size={16} color="#f59e0b" /> DRE & Relatórios Avançados</li>
                  </ul>
                  <button className="btn btn-secondary w-full" style={{ border: '1px solid #f59e0b', color: '#f59e0b' }} onClick={() => handleUpgrade('PREMIUM')}>
                    Fazer Upgrade
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Carregando configurações...</div>}>
      <SettingsContent />
    </Suspense>
  );
}
