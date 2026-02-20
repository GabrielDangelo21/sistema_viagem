import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { handleApiError } from '../services/handleApiError';
import { TripUI, CurrentUser, RouteName, Reservation, ReservationType, ChecklistItem } from '../types';
import {
  Calendar, Plus, MapPin, ArrowRight, Wallet, List, Info,
  Check, Plane, Hotel, Car, Train, Bus, Utensils, Flag, Box, Briefcase, Trash2, ChevronDown
} from 'lucide-react';
import { Button, Badge, Modal, useToast } from '../components/UI';

interface DashboardProps {
  onNavigate: (route: RouteName, params?: any) => void;
  user: CurrentUser | null;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate, user }) => {
  const [nextTrip, setNextTrip] = useState<TripUI | null>(null);
  const [allTrips, setAllTrips] = useState<TripUI[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);
  const [newItemText, setNewItemText] = useState('');
  const [selectedChecklistTripId, setSelectedChecklistTripId] = useState<string | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    const fetch = async () => {
      try {
        const allTrips = await api.listTrips();
        setAllTrips(allTrips);
        // Find first future trip
        const future = allTrips.find(t => t.status === 'planned' || t.status === 'ongoing');
        setNextTrip(future || null);

        // Auto-select next trip for checklist
        if (future) {
          setSelectedChecklistTripId(future.id);
        } else if (allTrips.length > 0) {
          setSelectedChecklistTripId(allTrips[0].id);
        }

        if (future) {
          // Fetch details to get reservations
          const details = await api.getTripDetails(future.id);
          // Sort by date and take next 3
          const sorted = details.reservations
            .sort((a, b) => a.startDateTime.localeCompare(b.startDateTime))
            .slice(0, 3);
          setReservations(sorted);
        }
      } catch (err) {
        const error = handleApiError(err);
        toast({ message: error.message, type: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [toast]);

  // Refetch checklist when selected trip changes
  useEffect(() => {
    if (!selectedChecklistTripId) {
      setChecklistItems([]);
      return;
    }
    const fetchChecklist = async () => {
      try {
        const items = await api.getChecklist(selectedChecklistTripId);
        setChecklistItems(items);
      } catch {
        setChecklistItems([]);
      }
    };
    fetchChecklist();
  }, [selectedChecklistTripId]);

  const getCountdown = (dateStr: string) => {
    const tripDate = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const oneDay = 24 * 60 * 60 * 1000;
    const diffDays = Math.round((tripDate.getTime() - today.getTime()) / oneDay);

    if (diffDays < 0) return 'Boa viagem!';
    if (diffDays === 0) return 'É hoje!';
    return `${diffDays} dias`;
  };

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(d);
  };

  const formatDateRange = (startStr: string, endStr: string) => {
    const d1 = new Date(startStr + 'T00:00:00');
    const d2 = new Date(endStr + 'T00:00:00');
    const fmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' });
    const fmtYear = new Intl.DateTimeFormat('pt-BR', { year: 'numeric' });

    // Check if same year
    if (d1.getFullYear() === d2.getFullYear()) {
      return `${fmt.format(d1)} — ${fmt.format(d2)}, ${fmtYear.format(d2)}`;
    }
    return `${fmt.format(d1)} ${fmtYear.format(d1)} — ${fmt.format(d2)} ${fmtYear.format(d2)}`;
  };

  const getReservationIcon = (type: ReservationType) => {
    switch (type) {
      case 'flight': return Plane;
      case 'hotel': return Hotel;
      case 'car': return Car;
      case 'train': return Train;
      case 'bus': return Bus;
      case 'restaurant': return Utensils;
      case 'tour': return Flag;
      default: return Box;
    }
  };

  const toggleChecklist = async (id: string, currentStatus: boolean) => {
    // Optimistic Update
    setChecklistItems(prev => prev.map(item =>
      item.id === id ? { ...item, isChecked: !currentStatus } : item
    ));

    try {
      await api.toggleChecklistItem(id, !currentStatus);
    } catch (err) {
      // Revert on error
      setChecklistItems(prev => prev.map(item =>
        item.id === id ? { ...item, isChecked: currentStatus } : item
      ));
      toast({ message: 'Erro ao atualizar item', type: 'error' });
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemText.trim() || !selectedChecklistTripId) return;

    try {
      const newItem = await api.createChecklistItem(selectedChecklistTripId, newItemText);
      setChecklistItems([...checklistItems, newItem]);
      setNewItemText('');
      toast({ message: 'Item adicionado!', type: 'success' });
    } catch (err) {
      toast({ message: 'Erro ao adicionar item', type: 'error' });
    }
  };

  const handleDeleteItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent toggling
    if (!confirm('Remover este item?')) return;

    try {
      await api.deleteChecklistItem(id);
      setChecklistItems(prev => prev.filter(i => i.id !== id));
    } catch (err) {
      toast({ message: 'Erro ao remover item', type: 'error' });
    }
  };

  const handleReservationsClick = () => {
    if (nextTrip) {
      onNavigate('trip-details', { id: nextTrip.id, initialTab: 'reservations' });
    }
  };

  return (
    <div className="p-4 md:p-10 space-y-8 md:space-y-10 animate-in fade-in duration-500 max-w-7xl mx-auto font-sans">

      {/* 1. Header & Greeting */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 pb-2">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-4xl font-bold text-gray-900 tracking-tight">
            Olá, {user?.name.split(' ')[0]} 👋
          </h1>
          <p className="text-gray-500 text-base md:text-lg">
            {nextTrip
              ? `Tudo pronto para ${nextTrip.destination}?`
              : 'Vamos planejar sua próxima aventura?'}
          </p>
        </div>
        {!nextTrip && (
          <Button onClick={() => onNavigate('trips')} className="shadow-lg shadow-brand-200/50">
            <Plus size={18} className="mr-2" /> Criar Viagem
          </Button>
        )}
      </header>

      {/* 2. Hero Section: Next Trip */}
      {loading ? (
        <div className="h-72 bg-gray-100 rounded-3xl animate-pulse" />
      ) : nextTrip ? (
        <section
          onClick={() => onNavigate('trip-details', { id: nextTrip.id })}
          className="group relative h-56 md:h-80 w-full rounded-2xl md:rounded-3xl overflow-hidden cursor-pointer shadow-xl shadow-gray-200/50 transition-all hover:shadow-2xl hover:scale-[1.002] ring-1 ring-black/5"
        >
          {/* Background */}
          {nextTrip.coverImageUrl ? (
            <img
              src={nextTrip.coverImageUrl}
              alt={nextTrip.name}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-brand-600 via-brand-700 to-teal-900 transition-transform duration-700 group-hover:scale-105" />
          )}

          {/* Overlays - Multi-layer for better text contrast */}
          <div className="absolute inset-0 bg-black/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

          {/* Content */}
          <div className="absolute inset-0 p-5 md:p-10 flex flex-col justify-end text-white">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-3 md:space-y-4 max-w-2xl">
                <div className="flex items-center gap-3">
                  <Badge status={nextTrip.status} />
                  <span className="text-xs font-semibold text-white bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 shadow-sm ring-1 ring-white/10">
                    {getCountdown(nextTrip.startDate)} para embarcar
                  </span>
                </div>

                <h2 className="text-2xl md:text-5xl font-bold tracking-tight text-white drop-shadow-md group-hover:translate-x-1 transition-transform duration-300">
                  {nextTrip.name}
                </h2>

                <div className="flex flex-wrap items-center text-gray-100/90 font-medium text-sm md:text-base gap-y-2">
                  <div className="flex items-center backdrop-blur-sm bg-black/10 px-3 py-1.5 rounded-lg border border-white/10">
                    <MapPin size={16} className="mr-2 text-brand-300" />
                    {nextTrip.destination}
                  </div>
                  <span className="mx-3 opacity-40 hidden md:inline">•</span>
                  <div className="flex items-center backdrop-blur-sm bg-black/10 px-3 py-1.5 rounded-lg border border-white/10">
                    <Calendar size={16} className="mr-2 text-brand-300" />
                    {formatDateRange(nextTrip.startDate, nextTrip.endDate)}
                  </div>
                </div>
              </div>

              <div className="md:mb-1">
                <button className="bg-white text-brand-950 hover:bg-brand-50 font-semibold px-6 py-3.5 rounded-2xl shadow-lg transition-all flex items-center gap-2 group-hover:shadow-xl active:scale-95">
                  Ver detalhes <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl md:rounded-3xl p-8 md:p-16 flex flex-col items-center justify-center text-center hover:border-brand-300 hover:bg-brand-50/30 transition-all group cursor-pointer" onClick={() => onNavigate('trips')}>
          <div className="w-20 h-20 bg-brand-50 text-brand-500 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-sm">
            <Briefcase size={32} />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Nenhuma viagem planejada</h3>
          <p className="text-gray-500 max-w-md mb-8">O mundo está esperando. Comece a organizar sua próxima experiência incrível agora mesmo.</p>
          <Button size="lg" className="shadow-brand-200/50 shadow-lg">
            Planejar primeira viagem
          </Button>
        </div>
      )}

      {/* 3. Quick Actions Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[
          { icon: Plus, label: 'Nova Viagem', sub: 'Criar roteiro', action: () => onNavigate('trips'), color: 'text-brand-600', bg: 'bg-brand-50', border: 'border-brand-100' },
          { icon: Calendar, label: 'Roteiro', sub: 'Ver dia a dia', action: () => nextTrip && onNavigate('trip-details', { id: nextTrip.id, initialTab: 'itinerary' }), disabled: !nextTrip, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
          { icon: Wallet, label: 'Reservas', sub: 'Voo e Hotel', action: handleReservationsClick, disabled: !nextTrip, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
          { icon: List, label: 'Checklists', sub: 'Não esqueça nada', action: () => setIsChecklistModalOpen(true), color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
        ].map((item, idx) => (
          <button
            key={idx}
            disabled={item.disabled}
            onClick={item.action}
            className={`group relative bg-white p-5 rounded-2xl border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-lg hover:-translate-y-1 transition-all text-left flex flex-col gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none hover:ring-1 hover:ring-brand-100/50`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.bg} ${item.color} ${item.border} border group-hover:scale-110 transition-transform`}>
              <item.icon size={24} strokeWidth={2.5} />
            </div>
            <div>
              <span className="block font-bold text-gray-900 text-lg leading-tight mb-1 group-hover:text-brand-700 transition-colors">{item.label}</span>
              <span className="text-sm font-medium text-gray-400 group-hover:text-gray-500">{item.sub}</span>
            </div>
          </button>
        ))}
      </section>

      {/* 4. Bottom Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10">

        {/* A) Upcoming Reservations */}
        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 relative overflow-hidden">
          <div className="flex justify-between items-center mb-8 relative z-10">
            <h3 className="font-bold text-xl text-gray-900 flex items-center gap-2.5">
              <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                <Wallet size={20} />
              </div>
              Próximas Reservas
            </h3>
            {nextTrip && (
              <button onClick={handleReservationsClick} className="text-sm text-brand-600 hover:text-brand-700 font-semibold bg-brand-50 px-3 py-1.5 rounded-lg transition-colors">
                Ver todas
              </button>
            )}
          </div>

          <div className="space-y-2 relative z-10">
            {loading ? (
              <div className="space-y-3">
                {[1, 2].map(i => <div key={i} className="h-16 bg-gray-50 rounded-2xl animate-pulse" />)}
              </div>
            ) : reservations.length > 0 ? (
              reservations.map(res => (
                <div
                  key={res.id}
                  className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50/80 transition-colors border border-transparent hover:border-gray-100 group cursor-default"
                >
                  <div className="w-12 h-12 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500 group-hover:bg-brand-50 group-hover:text-brand-600 group-hover:border-brand-100 transition-colors shrink-0">
                    {React.createElement(getReservationIcon(res.type), { size: 20 })}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 truncate text-base">{res.title}</h4>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                      <span className="font-medium text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide">{res.type}</span>
                      <span>•</span>
                      <span>{formatDateTime(res.startDateTime)}</span>
                    </div>
                  </div>
                  <Badge status={res.status} />
                </div>
              ))
            ) : (
              <div className="text-center py-10 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                <p className="text-gray-400 text-sm mb-4">Nenhuma reserva encontrada para a próxima viagem.</p>
                <Button variant="outline" size="sm" onClick={handleReservationsClick} disabled={!nextTrip}>
                  Adicionar Reserva
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* B) Essential Checklist */}
        {allTrips.length > 0 ? (
          <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 relative overflow-hidden flex flex-col h-full">
            <div className="flex justify-between items-center mb-4 relative z-10">
              <h3 className="font-bold text-xl text-gray-900 flex items-center gap-2.5">
                <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                  <List size={20} />
                </div>
                Checklist ({checklistItems.filter(i => i.isChecked).length}/{checklistItems.length})
              </h3>
            </div>

            {/* Trip Selector */}
            <div className="relative mb-4 z-10">
              <select
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 appearance-none cursor-pointer focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all pr-10"
                value={selectedChecklistTripId || ''}
                onChange={e => setSelectedChecklistTripId(e.target.value)}
              >
                {allTrips.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} — {t.destination}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Checklist Items */}
            <div className="space-y-2 relative z-10 flex-1 overflow-y-auto max-h-[250px] pr-2 scrollbar-thin scrollbar-thumb-gray-200">
              {checklistItems.length > 0 ? (
                checklistItems.map(item => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-4 p-3 rounded-2xl transition-all border group ${item.isChecked
                      ? 'bg-gray-50/50 border-transparent opacity-70'
                      : 'bg-white border-gray-100 hover:border-brand-200 hover:shadow-sm'
                      }`}
                  >
                    <div
                      onClick={() => toggleChecklist(item.id, item.isChecked)}
                      className={`w-6 h-6 rounded-lg border cursor-pointer flex items-center justify-center transition-all duration-200 shrink-0 ${item.isChecked
                        ? 'bg-brand-500 border-brand-500'
                        : 'border-gray-300 bg-white group-hover:border-brand-400'
                        }`}>
                      <Check size={14} className={`text-white transition-transform duration-200 ${item.isChecked ? 'scale-100' : 'scale-0'}`} />
                    </div>
                    <span className={`flex-1 text-sm font-medium transition-colors select-none ${item.isChecked ? 'text-gray-400 line-through' : 'text-gray-700 group-hover:text-gray-900'}`}>
                      {item.text}
                    </span>
                    <button
                      onClick={(e) => handleDeleteItem(item.id, e)}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400 text-sm">
                  Sua lista está vazia. Adicione itens importantes!
                </div>
              )}
            </div>

            {/* Add Item Input */}
            <form onSubmit={handleAddItem} className="mt-4 pt-4 border-t border-gray-50 flex gap-2 relative z-10">
              <input
                type="text"
                placeholder="Adicionar novo item..."
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
              />
              <Button type="submit" size="sm" disabled={!newItemText.trim()} className="rounded-xl aspect-square p-0 w-10 flex items-center justify-center">
                <Plus size={18} />
              </Button>
            </form>
          </section>
        ) : (
          <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 flex items-center justify-center text-gray-400 text-sm">
            Crie uma viagem para usar o checklist.
          </section>
        )}

      </div>

      {/* Checklist Modal - Only kept if needed for other places, or used for "View All" */}
      <Modal isOpen={isChecklistModalOpen} onClose={() => setIsChecklistModalOpen(false)} title="Checklist Completo">
        {/* Reusing the widget logic here relative to nextTrip? Or disable for now? */}
        <div className="p-4">
          <p className="text-gray-500 mb-4">Gerencie todos os itens do seu checklist para <strong>{allTrips.find(t => t.id === selectedChecklistTripId)?.name || 'a viagem'}</strong>.</p>
          {/* We can duplicate the list here or refactor into component later. For now, let's just show the list again */}
          <div className="space-y-2">
            {checklistItems.map(item => (
              <div key={item.id} className="flex items-center gap-3 p-3 border rounded-xl">
                <div
                  onClick={() => toggleChecklist(item.id, item.isChecked)}
                  className={`w-5 h-5 rounded border cursor-pointer flex items-center justify-center ${item.isChecked ? 'bg-brand-500 border-brand-500' : 'border-gray-300'}`}
                >
                  <Check size={12} className={`text-white ${item.isChecked ? 'block' : 'hidden'}`} />
                </div>
                <span className={item.isChecked ? 'line-through text-gray-400' : ''}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
};