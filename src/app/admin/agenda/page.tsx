"use client";

import React, { useState, useEffect } from 'react';
import { DragDropContext, DropResult } from 'react-beautiful-dnd';
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, Activity, CheckCircle2, User } from 'lucide-react';
import { getMyTenantContext } from '@/actions/features';
import { getTerm } from '@/lib/dictionary';
import { getPatients } from '@/actions/clinical';
import Link from 'next/link';
import { WeeklyCalendar } from '@/components/WeeklyCalendar';

export default function AgendaPage() {
  // Load tenant context & patients
  const [context, setContext] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<any[]>([]);

  // Calendar UI state
  const [selectedDate, setSelectedDate] = useState(new Date()); // today
  const [viewMode, setViewMode] = useState<'weekly' | 'daily'>('weekly');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<any>(null);
  const [sessions, setSessions] = useState<Record<string, any[]>>({}); // key = YYYY-MM-DD
  const [searchTerm, setSearchTerm] = useState('');

  // Modal form data
  const [formData, setFormData] = useState({
    patient: '',
    date: '',
    time: '08:00',
    procedure: '',
    status: 'PENDING' as const,
  });

  // Initial load
  useEffect(() => {
    Promise.all([getMyTenantContext(), getPatients()]).then(([ctx, pList]) => {
      setContext(ctx);
      setPatients(pList);
      setLoading(false);
    });
  }, []);

  const niche = context?.niche || 'GENERAL';
  const labelSessao = getTerm('appointment', niche);
  const labelPaciente = getTerm('customer', niche);

  // Compute week dates (Mon‑Sun) based on selectedDate
  const getWeekDates = (date: Date) => {
    const day = date.getDay(); // 0=Sun
    const diff = day === 0 ? -6 : 1 - day; // shift to Monday
    const monday = new Date(date);
    monday.setDate(date.getDate() + diff);
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  };
  const weekDates = getWeekDates(selectedDate);

  // Open modal for new session
  const openNew = (date: string, time: string) => {
    setEditingSession(null);
    setFormData({
      patient: patients[0]?.name || '',
      date,
      time,
      procedure: '',
      status: 'PENDING',
    });
    setIsModalOpen(true);
  };

  // Open modal to edit existing session
  const openEdit = (session: any) => {
    setEditingSession(session);
    setFormData({
      patient: session.patient,
      date: session.date,
      time: session.time,
      procedure: session.procedure,
      status: session.status,
    });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    const newSessions = { ...sessions };
    const day = formData.date;
    if (editingSession) {
      newSessions[day] = newSessions[day].map((s: any) => (s.id === editingSession.id ? { ...s, ...formData } : s));
    } else {
      if (!newSessions[day]) newSessions[day] = [];
      const newId = Math.random().toString(36).substr(2, 9);
      newSessions[day].push({ id: newId, ...formData });
    }
    setSessions(newSessions);
    setIsModalOpen(false);
  };

  const handleDelete = (session: any) => {
    if (confirm('Deseja realmente remover esta sessão?')) {
      const day = session.date;
      const newSessions = { ...sessions };
      newSessions[day] = newSessions[day].filter((s: any) => s.id !== session.id);
      setSessions(newSessions);
    }
  };

  // Drag‑and‑drop handler (react‑beautiful‑dnd)
  const handleDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId) return;
    const [srcDate] = source.droppableId.split('|');
    const [destDate, destTime] = destination.droppableId.split('|');
    const moving = sessions[srcDate]?.find((s: any) => s.id === draggableId);
    if (!moving) return;
    const newSource = sessions[srcDate].filter((s: any) => s.id !== draggableId);
    const updated = { ...moving, date: destDate, time: destTime };
    const newDest = sessions[destDate] ? [...sessions[destDate], updated] : [updated];
    setSessions({ ...sessions, [srcDate]: newSource, [destDate]: newDest });
  };

  if (loading) return <div className="p-8">Carregando Agenda...</div>;

  return (
    <div className="animate-fade-in p-4">
      {/* Header */}
      <div className="flex-between mb-8">
        <div>
          <h1 className="text-h1 flex items-center gap-3">
            <CalendarIcon size={28} className="text-accent" /> Agenda de {labelSessao}s
          </h1>
          <p className="text-muted">Gestão estratégica de horários e pacientes.</p>
        </div>
        <div className="flex gap-2 items-center">
          <button className="btn btn-outline" onClick={() => setViewMode('daily')}>Visualização Diária</button>
          <button className="btn btn-primary" onClick={() => setViewMode('weekly')}>Visualização Semanal</button>
          <button className="btn btn-secondary" onClick={() => setSelectedDate(new Date())}>Hoje</button>
          <button className="btn btn-primary px-6 py-3 shadow-md" onClick={() => openNew(new Date().toISOString().split('T')[0], '08:00')}>+ Nova {labelSessao}</button>
        </div>
      </div>

      {viewMode === 'weekly' ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <WeeklyCalendar
            sessions={Object.values(sessions).flat()}
            weekDates={weekDates}
            onSlotClick={openNew}
            onSessionClick={openEdit}
          />
        </DragDropContext>
      ) : (
        <div className="text-center text-muted py-20">Visualização Diária ainda não implementada.</div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay flex justify-center items-start p-4 overflow-y-auto" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(10,10,15,0.9)', zIndex: 1000, backdropFilter: 'blur(12px)', paddingTop: '5vh' }}>
          <div className="modal-content bg-bg-surface rounded-xl shadow-xl max-w-md w-full p-6 animate-fade-in">
            <div className="flex-between mb-4">
              <h2 className="text-h3">{editingSession ? 'Editar ' : 'Nova '}{labelSessao}</h2>
              <button className="btn-circle btn-sm" onClick={() => setIsModalOpen(false)}><Plus size={20} style={{ transform: 'rotate(45deg)' }} /></button>
            </div>
            <div className="space-y-4">
              <div className="input-group">
                <label className="input-label">{labelPaciente}</label>
                <select className="input-field" value={formData.patient} onChange={e => setFormData({ ...formData, patient: e.target.value })}>
                  {patients.map(p => (<option key={p.id} value={p.name}>{p.name}</option>))}
                </select>
              </div>
              <div className="grid-2">
                <div className="input-group">
                  <label className="input-label">Data</label>
                  <input type="date" className="input-field" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                </div>
                <div className="input-group">
                  <label className="input-label">Horário</label>
                  <input type="time" className="input-field" value={formData.time} onChange={e => setFormData({ ...formData, time: e.target.value })} />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Procedimento</label>
                <input type="text" className="input-field" value={formData.procedure} onChange={e => setFormData({ ...formData, procedure: e.target.value })} placeholder="Ex.: Fisioterapia" />
              </div>
              <div className="input-group">
                <label className="input-label">Status</label>
                <select className="input-field" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as any })}>
                  <option value="PENDING">Pendente</option>
                  <option value="CONFIRMED">Confirmado</option>
                  <option value="CANCELED">Cancelado</option>
                </select>
              </div>
            </div>
            <div className="flex-between mt-6">
              <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
