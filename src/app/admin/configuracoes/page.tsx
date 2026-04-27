"use client";

import { useState, useEffect } from "react";
import { 
  Settings, 
  Upload, 
  Save, 
  Building2, 
  Globe, 
  CheckCircle2,
  Trash2,
  Image as ImageIcon
} from "lucide-react";
import { getMyTenantContext } from "@/actions/features";
import { updateTenantLogo, updateTenantSettings } from "@/actions/tenant";
import { uploadProductImage } from "@/actions/upload";
import { useRef } from "react";

export default function ConfiguracoesPage() {
  const [context, setContext] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getMyTenantContext().then(ctx => {
      setContext(ctx);
      setName(ctx?.tenantName || "");
      setDomain(ctx?.tenantDomain || "");
      setLogoUrl(ctx?.tenantLogo || "");
      setEmail(ctx?.tenantEmail || "");
      setPhone(ctx?.tenantPhone || "");
      setAddress(ctx?.tenantAddress || "");
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateTenantSettings({ name, domain, email, phone, address });
      if (logoUrl !== context.tenantLogo) {
        await updateTenantLogo(logoUrl);
      }
      alert("Configurações salvas com sucesso!");
    } catch (err) {
      alert("Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    const formData = new FormData();
    formData.append("file", file);

    const result = await uploadProductImage(formData);
    setUploadingLogo(false);

    if (result.success && result.url) {
      setLogoUrl(result.url);
    } else {
      alert(result.message || "Erro ao fazer upload da imagem.");
    }
  };

  if (loading) return <div className="p-8">Carregando configurações...</div>;

  return (
    <div className="animate-fade-in p-4 max-w-[800px] mx-auto">
      <div className="flex-between mb-8">
        <div>
          <h1 className="text-h1 flex items-center gap-3">
            <Settings size={32} className="text-accent" />
            Configurações da Empresa
          </h1>
          <p className="text-muted">Personalize a identidade visual e dados do seu negócio.</p>
        </div>
        <button 
          className="btn btn-primary px-8" 
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Salvando..." : <><Save size={20} /> Salvar Alterações</>}
        </button>
      </div>

      <div className="space-y-6">
        {/* Logo Section */}
        <div className="surface p-8 rounded-2xl border border-border">
          <h3 className="text-h3 mb-6 flex items-center gap-2">
            <ImageIcon size={20} className="text-accent" />
            Logo da Empresa
          </h3>
          
          <div className="flex items-center gap-8">
            <div className="w-32 h-32 rounded-2xl bg-bg-muted border-2 border-dashed border-border flex-center overflow-hidden relative group">
              {logoUrl ? (
                <>
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex-center">
                    <button onClick={() => setLogoUrl("")} className="text-white"><Trash2 size={24} /></button>
                  </div>
                </>
              ) : (
                <div className="text-center p-4">
                  <Upload size={24} className="mx-auto mb-2 text-muted" />
                  <p className="text-[10px] font-bold text-muted uppercase">Upload</p>
                </div>
              )}
            </div>
            
            <div className="flex-1">
              <p className="text-sm font-medium mb-2">Sua logo aparecerá no topo do sistema e nos documentos (receitas, pedidos).</p>
              <p className="text-xs text-muted mb-4">Recomendado: PNG ou SVG com fundo transparente (300x300px).</p>
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
              />
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingLogo}
              >
                {uploadingLogo ? "Enviando..." : "Alterar Logo"}
              </button>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="surface p-8 rounded-2xl border border-border">
          <h3 className="text-h3 mb-6 flex items-center gap-2">
            <Building2 size={20} className="text-accent" />
            Dados Cadastrais e Contato
          </h3>
          
          <div className="space-y-6">
            <div className="grid-2 gap-6">
              <div className="input-group">
                <label className="input-label">Nome da Empresa</label>
                <div className="input-wrapper">
                  <Building2 size={18} className="input-icon" />
                  <input 
                    type="text" 
                    className="input-field with-icon" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                  />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Domínio (Subdomínio)</label>
                <div className="input-wrapper">
                  <Globe size={18} className="input-icon" />
                  <input 
                    type="text" 
                    className="input-field with-icon" 
                    value={domain} 
                    onChange={e => setDomain(e.target.value)} 
                  />
                </div>
              </div>
            </div>

            <div className="grid-2 gap-6">
              <div className="input-group">
                <label className="input-label">E-mail Comercial (Exibido em Receitas)</label>
                <input 
                  type="email" 
                  className="input-field" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                />
              </div>
              <div className="input-group">
                <label className="input-label">Telefone de Contato</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={phone} 
                  onChange={e => setPhone(e.target.value)} 
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Endereço Completo</label>
              <input 
                type="text" 
                className="input-field" 
                value={address} 
                onChange={e => setAddress(e.target.value)} 
                placeholder="Rua, Número, Bairro, Cidade - UF"
              />
            </div>
          </div>
        </div>

        <div className="surface p-8 rounded-2xl border-left-success bg-success/5">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={20} className="text-success" />
            <div>
              <p className="text-sm font-bold text-success">Personalização Ativa</p>
              <p className="text-xs text-success/80">Sua marca é o centro da experiência do seu cliente.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
