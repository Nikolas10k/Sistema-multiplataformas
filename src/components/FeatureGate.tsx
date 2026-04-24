"use client";

import { useEffect, useState } from "react";
import { getMyTenantContext } from "@/actions/features";
import { Lock } from "lucide-react";

export default function FeatureGate({ 
  feature, 
  children, 
  fallback = 'hide' // 'hide' | 'badge' | 'block'
}: { 
  feature: string; 
  children: React.ReactNode;
  fallback?: 'hide' | 'badge' | 'block';
}) {
  const [hasFeature, setHasFeature] = useState<boolean | null>(null);

  useEffect(() => {
    getMyTenantContext().then(ctx => {
      setHasFeature(ctx?.features?.includes(feature) || false);
    });
  }, [feature]);

  // Loading state (optional, can be null to avoid flicker)
  if (hasFeature === null) return null;

  if (hasFeature) {
    return <>{children}</>;
  }

  // Se não tem a feature, define o que fazer
  if (fallback === 'hide') {
    return null;
  }

  if (fallback === 'badge') {
    return (
      <div className="relative inline-block opacity-50 cursor-not-allowed" title="Funcionalidade não disponível no seu plano">
        {children}
        <div className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2">
          <span className="badge badge-warning text-[10px] flex items-center" style={{ gap: '2px', padding: '2px 4px' }}>
            <Lock size={10} /> Pro
          </span>
        </div>
      </div>
    );
  }

  if (fallback === 'block') {
    return (
      <div className="card text-center p-8 flex flex-col items-center justify-center opacity-70">
        <Lock size={32} className="text-warning mb-4" />
        <h3 className="text-h3 mb-2">Recurso Bloqueado</h3>
        <p className="text-muted text-sm max-w-sm mb-4">
          Esta funcionalidade não está disponível no seu plano atual. Faça o upgrade para liberar o acesso.
        </p>
        <button className="btn btn-secondary">Ver Planos</button>
      </div>
    );
  }

  return null;
}
