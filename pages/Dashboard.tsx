import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { handleApiError } from '../services/handleApiError';
import { TripUI, CurrentUser, RouteName, Reservation, ReservationType } from '../types';
import { 
  Calendar, Plus, MapPin, ArrowRight, Wallet, List, Info, 
  Check, Plane, Hotel, Car, Train, Bus, Utensils, Flag, Box, Briefcase 
} from 'lucide-react';
import { Button, Badge, Modal, useToast } from '../components/UI';

interface DashboardProps {
  onNavigate: (route: RouteName, params?: any) => void;
  user: CurrentUser | null;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate, user }) => {
  const [nextTrip, setNextTrip] = useState<TripUI | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);
  
  // Local state for the "Essential Checklist" widget (mock data)
  const [checklistItems, setChecklistItems] = useState([
    { id: 1, text: 'Verificar validade do passaporte', done: false },
    { id: 2, text: 'Contratar seguro viagem', done: false },
    { id: 3, text: 'Fazer check-in online', done: false },
    { id: 4, text: 'Organizar documentos impressos', done: false },
    { id: 5, text: 'Arrumar a mala', done: true },
  ]);

  const { toast } = useToast();

  useEffect(() => {
    const fetch = async () => {
      try {
        const allTrips = await api.listTrips();
        // Find first future trip
        const future = allTrips.find(t => t.status === 'planned' || t.status === 'ongoing');
        setNextTrip(future || null);

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
      switch(type) {
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

  const toggleChecklist = (id: number) => {
    setChecklistItems(prev => prev.map(item => 
        item.id === id ? { ...item, done: !item.done } : item
    ));
  };

  const handleReservationsClick = () => {
    if (nextTrip) {
      onNavigate('trip-details', { id: nextTrip.id, initialTab: 'reservations' });
    }
  };

  return (
    <div className="p-4 md:p-10 space-y-10 animate-in fade-in duration-500 max-w-7xl mx-auto font-sans">
      
      {/* 1. Header & Greeting */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
            Olá, {user?.name.split(' ')[0]} 👋
          </h1>
          <p className="text-gray-500 text-lg">
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
          className="group relative h-72 md:h-80 w-full rounded-3xl overflow-hidden cursor-pointer shadow-xl shadow-gray-200/50 transition-all hover:shadow-2xl hover:scale-[1.002] ring-1 ring-black/5"
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
           <div className="absolute inset-0 p-6 md:p-10 flex flex-col justify-end text-white">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-3 md:space-y-4 max-w-2xl">
                    <div className="flex items-center gap-3">
                        <Badge status={nextTrip.status} />
                        <span className="text-xs font-semibold text-white bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 shadow-sm ring-1 ring-white/10">
                            {getCountdown(nextTrip.startDate)} para embarcar
                        </span>
                    </div>
                    
                    <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white drop-shadow-md group-hover:translate-x-1 transition-transform duration-300">
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
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-16 flex flex-col items-center justify-center text-center hover:border-brand-300 hover:bg-brand-50/30 transition-all group cursor-pointer" onClick={() => onNavigate('trips')}>
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
                        {[1,2].map(i => <div key={i} className="h-16 bg-gray-50 rounded-2xl animate-pulse" />)}
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
          <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 relative overflow-hidden">
            <div className="flex justify-between items-center mb-8 relative z-10">
                <h3 className="font-bold text-xl text-gray-900 flex items-center gap-2.5">
                    <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                        <List size={20} />
                    </div>
                    Checklist Essencial
                </h3>
                <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-bold">
                    {checklistItems.filter(i => i.done).length}/{checklistItems.length}
                </span>
            </div>

            <div className="space-y-3 relative z-10">
                {checklistItems.map(item => (
                    <label 
                        key={item.id} 
                        className={`flex items-center gap-4 p-3.5 rounded-2xl cursor-pointer transition-all border group ${
                            item.done 
                                ? 'bg-gray-50/50 border-transparent opacity-70' 
                                : 'bg-white border-gray-100 hover:border-brand-200 hover:shadow-sm'
                        }`}
                    >
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all duration-200 shrink-0 ${
                            item.done 
                                ? 'bg-brand-500 border-brand-500' 
                                : 'border-gray-300 bg-white group-hover:border-brand-400'
                        }`}>
                            <Check size={14} className={`text-white transition-transform duration-200 ${item.done ? 'scale-100' : 'scale-0'}`} />
                            <input 
                                type="checkbox" 
                                className="hidden" 
                                checked={item.done} 
                                onChange={() => toggleChecklist(item.id)} 
                            />
                        </div>
                        <span className={`text-sm font-medium transition-colors select-none ${item.done ? 'text-gray-400 line-through' : 'text-gray-700 group-hover:text-gray-900'}`}>
                            {item.text}
                        </span>
                    </label>
                ))}
            </div>
            
            <div className="mt-8 pt-4 border-t border-gray-50 text-center relative z-10">
                <button 
                    onClick={() => setIsChecklistModalOpen(true)}
                    className="text-sm text-gray-400 hover:text-brand-600 font-medium transition-colors flex items-center justify-center gap-1.5 mx-auto group"
                >
                    Ver checklist completo <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
            </div>
          </section>

      </div>

      {/* Checklist Coming Soon Modal */}
      <Modal isOpen={isChecklistModalOpen} onClose={() => setIsChecklistModalOpen(false)} title="Em breve">
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-5">
            <Info size={32} />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">Checklists Personalizados</h3>
          <p className="text-gray-500 text-sm mb-8 max-w-xs mx-auto leading-relaxed">
            Em breve você poderá criar listas personalizadas para cada viagem, compartilhar com amigos e reutilizar modelos prontos de outros viajantes.
          </p>
          <div className="flex flex-col gap-3">
            <Button onClick={() => setIsChecklistModalOpen(false)} className="w-full">
              Entendi
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};