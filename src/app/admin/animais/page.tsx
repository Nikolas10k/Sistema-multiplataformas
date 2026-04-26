"use client";

import { useState, useEffect } from "react";
import { 
  PawPrint, 
  Search, 
  Plus, 
  Heart, 
  Info,
  Calendar,
  User,
  ArrowRight,
  Filter,
  Syringe,
  ClipboardList
} from "lucide-react";
import Link from "next/link";

export default function AnimaisPage() {
  const [loading, setLoading] = useState(true);

  // Mock de animais para demonstração
  const animais = [
    { 
      id: 101, 
      name: "Rex", 
      species: "Cão", 
      breed: "Golden Retriever", 
      sex: "Macho", 
      age: "3 anos",
      weight: "32kg",
      tutor: "João Silva",
      status: "ACTIVE",
      lastConsult: "15/04/2026"
    },
    { 
      id: 102, 
      name: "Mel", 
      species: "Gato", 
      breed: "Siamês", 
      sex: "Fêmea", 
      age: "5 anos",
      weight: "4.5kg",
      tutor: "João Silva",
      status: "ACTIVE",
      lastConsult: "20/04/2026"
    },
    { 
      id: 103, 
      name: "Thor", 
      species: "Cão", 
      breed: "Bulldog Francês", 
      sex: "Macho", 
      age: "2 anos",
      weight: "12kg",
      tutor: "Maria Oliveira",
      status: "INTERNED",
      lastConsult: "Ontem"
    }
  ];

  useEffect(() => {
    setTimeout(() => setLoading(false), 500);
  }, []);

  if (loading) return <div className="p-8">Carregando Pacientes...</div>;

  return (
    <div className="animate-fade-in p-4">
      <div className="flex-between mb-8">
        <div>
          <h1 className="text-h1 flex items-center gap-3">
            <PawPrint size={32} className="text-accent" />
            Pacientes (Animais)
          </h1>
          <p className="text-muted">Gestão completa dos animais atendidos na clínica.</p>
        </div>
        <button className="btn btn-primary">
          <Plus size={20} />
          Novo Paciente
        </button>
      </div>

      {/* Filters & Search */}
      <div className="surface p-4 mb-8 flex gap-4">
        <div className="input-wrapper flex-1">
          <Search size={18} className="input-icon" />
          <input type="text" placeholder="Buscar por nome do animal ou tutor..." className="input-field with-icon" />
        </div>
        <button className="btn btn-secondary">
          <Filter size={18} /> Filtros
        </button>
      </div>

      {/* Listagem */}
      <div className="surface overflow-hidden">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Espécie / Raça</th>
                <th>Tutor</th>
                <th>Sexo / Idade</th>
                <th>Última Consulta</th>
                <th>Status</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {animais.map(animal => (
                <tr key={animal.id} className="hover:bg-bg-muted/30 transition-colors">
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-accent/5 text-accent flex-center">
                        <PawPrint size={18} />
                      </div>
                      <span className="font-bold">{animal.name}</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex flex-col">
                      <span className="text-sm">{animal.species}</span>
                      <span className="text-[11px] text-muted">{animal.breed}</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2 text-sm">
                      <User size={12} className="text-muted" /> {animal.tutor}
                    </div>
                  </td>
                  <td>
                    <span className="text-xs">{animal.sex} • {animal.age}</span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2 text-xs text-muted">
                      <Calendar size={12} /> {animal.lastConsult}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${animal.status === 'INTERNED' ? 'badge-danger' : 'badge-success'}`}>
                      {animal.status === 'INTERNED' ? 'Internado' : 'Ativo'}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link href="/admin/vacinas" className="btn btn-icon btn-sm" title="Vacinas"><Syringe size={14} /></Link>
                      <Link href={`/admin/animais/ficha/${animal.id}`} className="btn btn-icon btn-sm" title="Prontuário"><ClipboardList size={14} /></Link>
                      <Link href={`/admin/animais/ficha/${animal.id}`} className="btn btn-secondary btn-sm">Ficha</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
