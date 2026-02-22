import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { supabase } from '../lib/supabase';
import { handleApiError } from '../services/handleApiError';
import { TripUI, CurrentUser, RouteName } from '../types';
import { Button, Modal, Badge, useToast } from '../components/UI';
import { Plus, Archive, MapPin, Calendar, Lock, Trash2, AlertTriangle, XCircle, Image as ImageIcon, X, Loader2, DollarSign } from 'lucide-react';

const TRIP_TYPES = [
  { value: 'lazer', label: 'Lazer', emoji: '🏖️', color: 'bg-blue-100 text-blue-700' },
  { value: 'trabalho', label: 'Trabalho', emoji: '💼', color: 'bg-slate-100 text-slate-700' },
  { value: 'aventura', label: 'Aventura', emoji: '🏔️', color: 'bg-orange-100 text-orange-700' },
  { value: 'romantica', label: 'Romântica', emoji: '💑', color: 'bg-pink-100 text-pink-700' },
  { value: 'familia', label: 'Família', emoji: '👨‍👩‍👧‍👦', color: 'bg-green-100 text-green-700' },
  { value: 'cultural', label: 'Cultural', emoji: '🏛️', color: 'bg-amber-100 text-amber-700' },
  { value: 'outro', label: 'Outro', emoji: '✈️', color: 'bg-gray-100 text-gray-700' },
] as const;


interface TripsProps {
  onNavigate: (route: RouteName, params?: any) => void;
  user: CurrentUser | null;
}

export const Trips: React.FC<TripsProps> = ({ onNavigate, user }) => {
  const [trips, setTrips] = useState<TripUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const { toast } = useToast();

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  const [tripToDelete, setTripToDelete] = useState<string | null>(null);

  // Form State
  const [newTrip, setNewTrip] = useState({ name: '', destination: '', startDate: '', endDate: '', coverImageUrl: '', type: 'lazer', budget: null as number | null, defaultCurrency: 'BRL' });
  const [formError, setFormError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);

  // File Input Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    setLoading(true);
    try {
      const data = await api.listTrips();
      setTrips(data);
    } catch (err) {
      const error = handleApiError(err);
      toast({ message: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const activeTrips = trips.filter(t => t.status !== 'completed');
  const archivedTrips = trips.filter(t => t.status === 'completed');

  const displayedTrips = activeTab === 'active' ? activeTrips : archivedTrips;

  // Handle start date change to adjust end date constraints
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = e.target.value;
    setNewTrip(prev => {
      const updated = { ...prev, startDate: newStart };
      // If the current endDate is earlier than the new startDate, automatically set endDate = startDate
      if (prev.endDate && prev.endDate < newStart) {
        updated.endDate = newStart;
      }
      return updated;
    });
    // Clear date error if we auto-corrected or simply changed start date
    setDateError(null);
    setFormError(null);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEnd = e.target.value;

    setNewTrip(prev => {
      // valida usando prev.startDate (sempre o mais recente)
      if (prev.startDate && newEnd && newEnd < prev.startDate) {
        setDateError("A data final não pode ser anterior à data de início.");
      } else {
        setDateError(null);
        setFormError(null);
      }
      return { ...prev, endDate: newEnd };
    });
  };

  const [uploadingCover, setUploadingCover] = useState(false);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({ message: 'A imagem deve ter no máximo 2MB.', type: 'error' });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploadingCover(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const filePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('covers')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('covers')
        .getPublicUrl(filePath);

      setNewTrip(prev => ({ ...prev, coverImageUrl: publicUrl }));
      toast({ message: 'Imagem enviada!', type: 'success' });
    } catch (err: any) {
      toast({ message: err.message || 'Erro ao enviar imagem', type: 'error' });
    } finally {
      setUploadingCover(false);
    }
  };

  const handleRemoveImage = () => {
    setNewTrip(prev => ({ ...prev, coverImageUrl: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };





  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setDateError(null);

    // Client-side Validation (Strict)
    if (newTrip.startDate && newTrip.endDate && newTrip.endDate < newTrip.startDate) {
      setDateError("A data final não pode ser anterior à data de início.");
      return;
    }

    setLoading(true);
    try {
      await api.createTrip(newTrip);
      setIsModalOpen(false);
      setNewTrip({ name: '', destination: '', startDate: '', endDate: '', coverImageUrl: '', type: 'lazer', budget: null, defaultCurrency: 'BRL' });
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchTrips();
      toast({ message: 'Viagem criada com sucesso!', type: 'success' });
    } catch (err: any) {
      const error = handleApiError(err);

      if (error.kind === 'upgrade') {
        setIsModalOpen(false);
        setIsLimitModalOpen(true);
      } else if (error.kind === 'field') {
        if (error.message.toLowerCase().includes('data final')) {
          setDateError(error.message);
        } else {
          setFormError(error.message);
        }
      } else {
        setFormError(error.message);
        toast({ message: error.message, type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClick = () => {
    // Limit check bypassed for testing
    // if (user?.plan === 'free' && activeTrips.length >= 2) {
    //   setIsLimitModalOpen(true);
    // } else {
    setIsModalOpen(true);
    setFormError(null);
    setDateError(null);
    setNewTrip({ name: '', destination: '', startDate: '', endDate: '', coverImageUrl: '', type: 'lazer', budget: null, defaultCurrency: 'BRL' });
    if (fileInputRef.current) fileInputRef.current.value = '';
    // }
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setTripToDelete(id);
  };

  const confirmDelete = async () => {
    if (!tripToDelete) return;
    setLoading(true);
    try {
      await api.deleteTrip(tripToDelete);
      await fetchTrips();
      toast({ message: 'Viagem excluída.', type: 'success' });
    } catch (e) {
      const error = handleApiError(e);
      toast({ message: error.message, type: 'error' });
    } finally {
      setLoading(false);
      setTripToDelete(null);
    }
  };

  // Helper for date formatting
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00'); // Treat YYYY-MM-DD as local
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white transition-colors">Minhas Viagens</h1>
        <Button onClick={handleCreateClick} className="w-full md:w-auto">
          <Plus size={18} className="mr-2" /> Nova Viagem
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 transition-colors">
        <button
          onClick={() => setActiveTab('active')}
          className={`pb-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'active' ? 'border-brand-600 text-brand-600 dark:text-brand-400 dark:border-brand-500' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
        >
          Ativas ({activeTrips.length})
        </button>
        <button
          onClick={() => setActiveTab('archived')}
          className={`pb-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'archived' ? 'border-brand-600 text-brand-600 dark:text-brand-400 dark:border-brand-500' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
        >
          Arquivadas ({archivedTrips.length})
        </button>
      </div>

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading && trips.length === 0 ? (
          [1, 2, 3].map(i => <div key={i} className="h-48 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse transition-colors" />)
        ) : displayedTrips.length > 0 ? (
          displayedTrips.map(trip => (
            <div
              key={trip.id}
              onClick={() => onNavigate('trip-details', { id: trip.id })}
              className="bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer border border-slate-100 dark:border-slate-800 group flex flex-col relative"
            >
              <div className="h-32 relative overflow-hidden bg-slate-100 dark:bg-slate-800 transition-colors">
                {/* Background Layer: Image or Gradient with Zoom Effect */}
                {trip.coverImageUrl ? (
                  <img
                    src={trip.coverImageUrl}
                    alt={trip.name}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-r from-brand-500 to-brand-700 transition-transform duration-500 ease-out group-hover:scale-105" />
                )}

                {/* Overlay Layer: Consistent dark overlay for text readability */}
                <div className="absolute inset-0 bg-black/30 pointer-events-none" />

                {/* Content Layer */}
                <div className="relative z-10 flex flex-col h-full justify-between p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-1.5">
                      <Badge status={trip.status} />
                      {(() => { const tt = TRIP_TYPES.find(t => t.value === trip.type); return tt ? <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${tt.color}`}>{tt.emoji} {tt.label}</span> : null; })()}
                    </div>
                    <button
                      onClick={(e) => handleDeleteClick(e, trip.id)}
                      className="w-8 h-8 flex items-center justify-center shrink-0 bg-black/20 hover:bg-red-500 text-white rounded-full transition-colors backdrop-blur-sm"
                      title="Excluir viagem"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <h3 className="text-xl font-bold text-white truncate shadow-sm mt-auto">{trip.name}</h3>
                </div>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 mb-2">
                    <MapPin size={14} className="mr-1" /> {trip.destination}
                  </div>
                </div>
                <div className="flex items-center text-xs text-slate-400 dark:text-slate-500 font-medium bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg mt-4 transition-colors">
                  <Calendar size={14} className="mr-2" />
                  {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-slate-400 dark:text-slate-500">
            <Archive className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p>Nenhuma viagem encontrada nesta categoria.</p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nova Viagem">
        <form onSubmit={handleCreateTrip} className="space-y-4">
          {formError && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm p-3 rounded-lg flex items-center gap-2 animate-pulse">
              <XCircle size={16} />
              {formError}
            </div>
          )}

          {/* Cover Image Upload */}
          <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
            <div className="w-16 h-16 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0 relative group">
              {uploadingCover ? (
                <Loader2 className="text-brand-500 animate-spin" size={24} />
              ) : newTrip.coverImageUrl ? (
                <>
                  <img src={newTrip.coverImageUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <button type="button" onClick={handleRemoveImage} className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <X size={20} />
                  </button>
                </>
              ) : (
                <ImageIcon className="text-slate-400" size={24} />
              )}
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Capa da Viagem (Opcional)</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="block w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-brand-50 dark:file:bg-brand-900/20 file:text-brand-700 dark:file:text-brand-400 hover:file:bg-brand-100 dark:hover:file:bg-brand-900/40"
              />
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 ml-1">Máximo 2MB</p>
            </div>

            {/* AI Image Generation - Removed as per request due to repetitive images */}

          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome da Viagem</label>
            <input
              required
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none transition-colors"
              placeholder="Ex: Eurotrip 2025"
              value={newTrip.name}
              onChange={e => setNewTrip({ ...newTrip, name: e.target.value })}
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Destino Principal</label>
            <input
              required
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none transition-colors"
              placeholder="Ex: Paris, França"
              value={newTrip.destination}
              onChange={e => setNewTrip({ ...newTrip, destination: e.target.value })}
              disabled={loading}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Início</label>
              <input
                type="date" required
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none transition-colors"
                value={newTrip.startDate}
                onChange={handleStartDateChange}
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fim</label>
              <div>
                <input
                  type="date" required
                  min={newTrip.startDate}
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none transition-colors ${dateError ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300 dark:border-slate-700'}`}
                  value={newTrip.endDate}
                  onChange={handleEndDateChange}
                  disabled={loading}
                />
                {dateError && (
                  <p className="text-xs text-red-500 dark:text-red-400 mt-1">{dateError}</p>
                )}
              </div>
            </div>
          </div>

          {/* Trip Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tipo de Viagem</label>
            <div className="flex flex-wrap gap-2">
              {TRIP_TYPES.map(tt => (
                <button
                  key={tt.value}
                  type="button"
                  onClick={() => setNewTrip({ ...newTrip, type: tt.value })}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${newTrip.type === tt.value
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 ring-2 ring-brand-500/20 dark:ring-brand-500/40'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  disabled={loading}
                >
                  <span>{tt.emoji}</span>
                  <span>{tt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Budget */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Orçamento Previsto (Opcional)</label>
            <div className="relative">
              <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="number"
                min="0"
                step="100"
                className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none transition-colors"
                placeholder="Ex: 5000"
                value={newTrip.budget ?? ''}
                onChange={e => setNewTrip({ ...newTrip, budget: e.target.value ? Number(e.target.value) : null })}
                disabled={loading}
              />
            </div>
          </div>

          {/* Currency */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Moeda Padrão</label>
            <select
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none transition-colors"
              value={newTrip.defaultCurrency}
              onChange={e => setNewTrip({ ...newTrip, defaultCurrency: e.target.value })}
              disabled={loading}
            >
              <option value="BRL">Real (BRL)</option>
              <option value="USD">Dólar (USD)</option>
              <option value="EUR">Euro (EUR)</option>
              <option value="GBP">Libra (GBP)</option>
            </select>
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} disabled={loading}>Cancelar</Button>
            <Button type="submit" loading={loading} disabled={loading}>Criar Viagem</Button>
          </div>
        </form>
      </Modal>

      {/* Upgrade Limit Modal */}
      <Modal isOpen={isLimitModalOpen} onClose={() => setIsLimitModalOpen(false)} title="Limite Atingido">
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600 dark:text-amber-500">
            <Lock size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Desbloqueie viagens ilimitadas</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">No plano gratuito, você pode ter apenas 2 viagens ativas simultaneamente. Faça upgrade para o Pro!</p>
          <Button onClick={() => { setIsLimitModalOpen(false); onNavigate('upgrade'); }} className="w-full">
            Ver Planos Premium
          </Button>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!tripToDelete} onClose={() => setTripToDelete(null)} title="Excluir Viagem?">
        <div className="py-2">
          <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400 p-3 rounded-lg mb-4 border border-red-100 dark:border-red-900/30">
            <AlertTriangle size={24} className="shrink-0" />
            <p className="text-sm">Essa ação não pode ser desfeita. Todos os dias, atividades e reservas serão apagados.</p>
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
            Tem certeza que deseja excluir esta viagem?
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setTripToDelete(null)}>Cancelar</Button>
            <Button variant="danger" onClick={confirmDelete}>Excluir Viagem</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};