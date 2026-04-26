"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  Search, 
  Plus, 
  Mail, 
  Phone, 
  MapPin, 
  ArrowRight,
  PawPrint,
  MoreVertical,
  ArrowLeft,
  Calendar,
  DollarSign
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function FichaTutorPage() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => setLoading(false), 500);
  }, []);

  if (loading) return <div className="p-8">Carregando perfil do tutor...</div>;

  const tutor = {
    id,
    name: "João Silva",
    email: "joao@email.com",
    phone: "(11) 98888-7777",
    address: "Rua das Flores, 123, São Paulo - SP",
    cpf: "123.456.789-00",
    since: "Janeiro 2024",
    totalSpent: "R$ 1.250,00",
    animals: [
      { id: 101, name: "Rex", species: "Cão", breed: "Golden Retriever", age: "3 anos" },
      { id: 102, name: "Mel", species: "Gato", breed: "Siamês", age: "5 anos" }
    ]
  };

  return (
    <div className="animate-fade-in p-4 max-w-[1000px] mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin/tutores" className="btn-icon">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-h1">Perfil do Tutor</h1>
          <p className="text-muted">Detalhes e histórico do responsável.</p>
        </div>
      </div>

      <div className="grid-12 gap-8">
        {/* Tutor Sidebar Info */}
        <div className="col-span-4 space-y-6">
          <div className="surface p-6 rounded-2xl border-left-accent">
            <div className="w-20 h-20 rounded-full bg-accent/10 text-accent flex-center font-bold text-2xl mx-auto mb-4">
              {tutor.name.charAt(0)}
            </div>
            <h2 className="text-h2 text-center mb-1">{tutor.name}</h2>
            <p className="text-xs text-muted text-center mb-6">Tutor desde {tutor.since}</p>

            <div className="space-y-4 pt-6 border-top">
              <div className="flex items-center gap-3 text-sm">
                <Mail size={16} className="text-muted" /> {tutor.email}
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone size={16} className="text-muted" /> {tutor.phone}
              </div>
              <div className="flex items-center gap-3 text-sm">
                <MapPin size={16} className="text-muted" /> {tutor.address}
              </div>
            </div>
          </div>

          <div className="surface p-6 rounded-2xl">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted mb-4">Resumo Financeiro</h3>
            <div className="flex-between mb-2">
              <span className="text-sm text-muted">Total Gasto</span>
              <span className="font-bold text-success">{tutor.totalSpent}</span>
            </div>
            <div className="flex-between">
              <span className="text-sm text-muted">Débitos Pendentes</span>
              <span className="font-bold text-danger">R$ 0,00</span>
            </div>
            <button className="btn btn-secondary w-full mt-6 gap-2">
              <DollarSign size={16} /> Ver Financeiro
            </button>
          </div>
        </div>

        {/* Animals List */}
        <div className="col-span-8 space-y-6">
          <div className="flex-between">
            <h3 className="text-h3 flex items-center gap-2">
              <PawPrint size={20} className="text-accent" />
              Animais Vinculados ({tutor.animals.length})
            </h3>
            <button className="btn btn-primary btn-sm">
              <Plus size={16} /> Adicionar Pet
            </button>
          </div>

          <div className="grid-2">
            {tutor.animals.map(animal => (
              <div key={animal.id} className="surface p-6 rounded-2xl hover:border-accent/30 transition-all group">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-accent/5 text-accent flex-center">
                    <PawPrint size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg group-hover:text-accent transition-colors">{animal.name}</h4>
                    <p className="text-xs text-muted">{animal.species} • {animal.breed}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 text-xs text-muted mb-6">
                  <Calendar size={14} /> {animal.age}
                </div>

                <Link href={`/admin/animais/ficha/${animal.id}`} className="btn btn-secondary w-full gap-2">
                  Ver Ficha Clínica <ArrowRight size={16} />
                </Link>
              </div>
            ))}
          </div>

          <div className="surface p-8 rounded-2xl text-center border border-dashed border-border">
            <h3 className="text-sm font-bold text-muted uppercase mb-2">Histórico de Atendimentos</h3>
            <p className="text-xs text-muted">Nenhum atendimento recente registrado para este tutor.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
