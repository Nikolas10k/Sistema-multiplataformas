"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Users, 
  Search, 
  Plus, 
  Mail, 
  Phone, 
  MapPin, 
  ArrowRight,
  PawPrint,
  MoreVertical
} from "lucide-react";
import { getMyTenantContext } from "@/actions/features";

export default function TutoresPage() {
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Mock de tutores para demonstração
  const tutores = [
    { 
      id: 1, 
      name: "João Silva", 
      email: "joao@email.com", 
      phone: "(11) 98888-7777", 
      address: "Rua das Flores, 123",
      animals: ["Rex (Cão)", "Mel (Gato)"]
    },
    { 
      id: 2, 
      name: "Maria Oliveira", 
      email: "maria@email.com", 
      phone: "(11) 97777-6666", 
      address: "Av. Brasil, 500",
      animals: ["Thor (Cão)"]
    },
    { 
      id: 3, 
      name: "Carlos Pereira", 
      email: "carlos@email.com", 
      phone: "(11) 96666-5555", 
      address: "Rua Amazonas, 45",
      animals: ["Luna (Ave)"]
    }
  ];

  useEffect(() => {
    setTimeout(() => setLoading(false), 500);
  }, []);

  if (loading) return <div className="p-8">Carregando Tutores...</div>;

  return (
    <div className="animate-fade-in p-4">
      <div className="flex-between mb-8">
        <div>
          <h1 className="text-h1 flex items-center gap-3">
            <Users size={32} className="text-accent" />
            Gestão de Tutores
          </h1>
          <p className="text-muted">Cadastre e gerencie os responsáveis pelos pacientes.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={20} />
          Novo Tutor
        </button>
      </div>

      {/* Search */}
      <div className="surface p-4 mb-6">
        <div className="input-wrapper">
          <Search size={18} className="input-icon" />
          <input type="text" placeholder="Buscar tutor por nome, CPF ou telefone..." className="input-field with-icon" />
        </div>
      </div>

      {/* Grid de Tutores */}
      <div className="grid-3">
        {tutores.map(tutor => (
          <div key={tutor.id} className="surface p-6 rounded-2xl hover:border-accent/30 transition-all group">
            <div className="flex-between mb-4">
              <div className="w-12 h-12 rounded-full bg-accent/10 text-accent flex-center font-bold text-lg">
                {tutor.name.charAt(0)}
              </div>
              <button className="btn-icon">
                <MoreVertical size={18} />
              </button>
            </div>
            
            <h3 className="text-h3 mb-4 group-hover:text-accent transition-colors">{tutor.name}</h3>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-sm text-muted">
                <Mail size={14} /> {tutor.email}
              </div>
              <div className="flex items-center gap-3 text-sm text-muted">
                <Phone size={14} /> {tutor.phone}
              </div>
              <div className="flex items-center gap-3 text-sm text-muted">
                <MapPin size={14} /> {tutor.address}
              </div>
            </div>

            <div className="border-top pt-4">
              <p className="text-[10px] uppercase font-bold text-muted tracking-widest mb-3">Animais Vinculados</p>
              <div className="flex flex-wrap gap-2">
                {tutor.animals.map(animal => (
                  <span key={animal} className="px-2 py-1 bg-bg-muted rounded text-[11px] font-medium flex items-center gap-1">
                    <PawPrint size={10} /> {animal}
                  </span>
                ))}
              </div>
            </div>

            <Link href={`/admin/tutores/${tutor.id}`} className="btn btn-secondary w-full mt-6 gap-2">
              Ver Ficha Completa <ArrowRight size={16} />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
