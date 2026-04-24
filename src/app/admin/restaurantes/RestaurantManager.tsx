"use client";

import { useState } from "react";
import { Plus, MapPin, Power, X } from "lucide-react";
import { createRestaurant, toggleRestaurantStatus } from "@/actions/admin-restaurants";
import { useRouter } from "next/navigation";

export default function RestaurantManager({ initialRestaurants }: { initialRestaurants: any[] }) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [isOpen, setIsOpen] = useState(true);

  const openModal = () => {
    setName("");
    setLocation("");
    setIsOpen(true);
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = await createRestaurant({ name, location, isOpen });
    
    setLoading(false);
    if (res.success) {
      closeModal();
      router.refresh();
    } else {
      alert(res.message);
    }
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    const res = await toggleRestaurantStatus(id, !currentStatus);
    if (res.success) {
      router.refresh();
    }
  };

  return (
    <>
      <div className="flex-between mb-6">
        <div>
          <h1 className="text-h2">Meus Restaurantes</h1>
          <p className="text-muted text-sm mt-1">Gerencie suas lojas e horários de funcionamento.</p>
        </div>
        <div>
          <button className="btn btn-primary" onClick={openModal}>
            <Plus size={18} />
            Novo Restaurante
          </button>
        </div>
      </div>

      <div className="grid-3">
        {initialRestaurants.map(r => (
          <div key={r.id} className="card" style={{ borderTop: `4px solid ${r.isOpen ? 'var(--success)' : 'var(--danger)'}` }}>
            <div className="flex-between mb-4">
              <h3 className="text-h3">{r.name}</h3>
              <span className={`badge ${r.isOpen ? 'badge-success' : 'badge-danger'}`}>
                {r.isOpen ? 'Aberto' : 'Fechado'}
              </span>
            </div>
            
            <div className="text-muted flex mb-6" style={{ alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
              <MapPin size={16} />
              {r.location || "Local não informado"}
            </div>

            <div className="border-t pt-4" style={{ borderColor: 'var(--border-color)' }}>
              <button 
                className={`btn w-full ${r.isOpen ? 'btn-secondary text-danger' : 'btn-primary'}`}
                style={r.isOpen ? { border: '1px solid var(--danger)' } : {}}
                onClick={() => handleToggle(r.id, r.isOpen)}
              >
                <Power size={18} />
                {r.isOpen ? "Fechar Operação" : "Abrir Loja"}
              </button>
            </div>
          </div>
        ))}
        {initialRestaurants.length === 0 && (
          <div className="card text-center text-muted col-span-3">
            Nenhum restaurante cadastrado.
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay flex-center" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 100, backdropFilter: 'blur(4px)'
        }}>
          <div className="card animate-fade-in" style={{ width: '400px' }}>
            <div className="flex-between mb-6">
              <h2 className="text-h2">Novo Restaurante</h2>
              <button className="btn-icon" onClick={closeModal}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Nome da Loja *</label>
                <input required type="text" className="input-field" placeholder="Ex: Burgueria Matriz" value={name} onChange={e => setName(e.target.value)} />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-1">Localização</label>
                <input type="text" className="input-field" placeholder="Ex: Av. Paulista, 1000" value={location} onChange={e => setLocation(e.target.value)} />
              </div>
              
              <div className="mb-6 flex" style={{ alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" id="isOpen" checked={isOpen} onChange={e => setIsOpen(e.target.checked)} style={{ width: '18px', height: '18px' }} />
                <label htmlFor="isOpen" className="text-sm font-medium cursor-pointer">Restaurante já inicia Aberto</label>
              </div>

              <div className="flex-between" style={{ gap: '1rem' }}>
                <button type="button" className="btn btn-secondary flex-1" onClick={closeModal}>Cancelar</button>
                <button type="submit" className="btn btn-primary flex-1" disabled={loading}>
                  {loading ? "Salvando..." : "Salvar Restaurante"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
