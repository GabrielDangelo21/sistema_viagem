import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { handleApiError } from '../services/handleApiError';
import { TripUI, ItineraryDay, Activity, Reservation, RouteName, ReservationType, ReservationStatus } from '../types';
import { Button, Modal, Badge, EmptyState, useToast } from '../components/UI';
import { ArrowLeft, Calendar, MapPin, Clock, DollarSign, Plus, MoveUp, MoveDown, Plane, Hotel, FileText, Car, Train, Bus, Utensils, Flag, Box, Edit2, Trash2, XCircle, Image as ImageIcon, X, Wand2 } from 'lucide-react';
import { ParticipantsList } from '../components/ParticipantsList';
import { FinanceModule } from '../components/FinanceModule';

interface TripDetailsProps {
    tripId?: string;
    initialTab?: 'itinerary' | 'reservations' | 'participants' | 'finances';
    onNavigate: (route: RouteName, params?: any) => void;
}

export const TripDetails: React.FC<TripDetailsProps> = ({ tripId, initialTab, onNavigate }) => {
    const [data, setData] = useState<{ trip: TripUI, days: ItineraryDay[], activities: Activity[], reservations: Reservation[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'itinerary' | 'reservations' | 'participants' | 'finances'>(initialTab || 'itinerary');
    const { toast } = useToast();

    // Modals
    const [modalOpen, setModalOpen] = useState<'activity' | 'reservation' | 'delete-res' | 'edit-trip' | null>(null);

    // State for Edit Trip Form
    const [editTripForm, setEditTripForm] = useState({ name: '', destination: '', startDate: '', endDate: '', coverImageUrl: '', defaultCurrency: 'BRL' });
    const [editFormError, setEditFormError] = useState<string | null>(null);

    // State for Reservation Form
    const emptyReservation: Partial<Reservation> = {
        type: 'flight', status: 'confirmed', currency: 'BRL', title: '',
        startDateTime: '', endDateTime: '', provider: '', confirmationCode: '', price: undefined, address: '', notes: ''
    };
    const [reservationForm, setReservationForm] = useState<Partial<Reservation>>(emptyReservation);
    const [editingResId, setEditingResId] = useState<string | null>(null);
    const [resFormError, setResFormError] = useState<string | null>(null);
    const [deletingResId, setDeletingResId] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    // State for Activity Form
    const [newActivity, setNewActivity] = useState<Partial<Activity>>({ title: '' });
    const [selectedDayId, setSelectedDayId] = useState<string>('');

    // File Input Ref for Edit Trip
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (tripId) fetchData(tripId);
    }, [tripId]);

    // Sync active tab if initialTab changes (for scenarios where component is reused)
    useEffect(() => {
        if (initialTab) {
            setActiveTab(initialTab);
        }
    }, [initialTab]);

    const fetchData = async (id: string) => {
        setLoading(true);
        try {
            const result = await api.getTripDetails(id);
            setData(result);
            if (result.days.length > 0 && !selectedDayId) setSelectedDayId(result.days[0].id);
        } catch (e) {
            const error = handleApiError(e);
            toast({ message: error.message, type: 'error' });
            onNavigate('trips');
        } finally {
            setLoading(false);
        }
    };

    // --- EDIT TRIP HANDLERS ---
    const handleEditTripClick = () => {
        if (!data) return;
        setEditTripForm({
            name: data.trip.name,
            destination: data.trip.destination,
            startDate: data.trip.startDate,
            endDate: data.trip.endDate,
            coverImageUrl: data.trip.coverImageUrl || '',
            defaultCurrency: data.trip.defaultCurrency || 'BRL'
        });
        setModalOpen('edit-trip');
    };

    const handleSaveTrip = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!data) return;
        setEditFormError(null);

        // Client-side Validation
        if (editTripForm.endDate < editTripForm.startDate) {
            setEditFormError("A data final não pode ser anterior à data de início.");
            return;
        }

        try {
            await api.updateTrip(data.trip.id, editTripForm);
            setModalOpen(null);
            fetchData(data.trip.id);
            toast({ message: 'Viagem atualizada!', type: 'success' });
        } catch (err: any) {
            const error = handleApiError(err);
            setEditFormError(error.message);
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // 2MB Limit Check
            if (file.size > 2 * 1024 * 1024) {
                toast({ message: 'A imagem deve ter no máximo 2MB.', type: 'error' });
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setEditTripForm(prev => ({ ...prev, coverImageUrl: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveImage = () => {
        setEditTripForm(prev => ({ ...prev, coverImageUrl: '' }));
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const generateAIImage = () => {
        if (!editTripForm.destination) {
            toast({ message: 'Preencha o destino para gerar uma imagem.', type: 'error' });
            return;
        }

        const prompt = `wide cinematic shot of ${editTripForm.destination}, iconic landmark, 4k, travel photography, dramatic lighting, aspect ratio 16:9`;
        const encodedPrompt = encodeURIComponent(prompt);
        const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1280&height=720&nologo=true`;

        setEditTripForm(prev => ({ ...prev, coverImageUrl: url }));
        toast({ message: 'Imagem gerada com Inteligência Artificial!', type: 'success' });
    };

    // --- ACTIVITY HANDLERS ---
    const handleAddActivity = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!data || !selectedDayId) return;

        try {
            await api.createActivity({
                dayId: selectedDayId,
                title: newActivity.title || 'Nova Atividade',
                timeStart: newActivity.timeStart,
                locationName: newActivity.locationName,
            });
            setModalOpen(null);
            setNewActivity({ title: '' });
            fetchData(data.trip.id);
            toast({ message: 'Atividade adicionada!', type: 'success' });
        } catch (err) {
            const error = handleApiError(err);
            toast({ message: error.message, type: 'error' });
        }
    };

    // --- RESERVATION HANDLERS ---
    const handleEditReservation = (res: Reservation) => {
        setEditingResId(res.id);
        setReservationForm({
            ...res,
            startDateTime: toDatetimeLocal(res.startDateTime),
            endDateTime: res.endDateTime ? toDatetimeLocal(res.endDateTime) : '',
        });
        setResFormError(null);
        setModalOpen('reservation');
    };

    const handleNewReservation = () => {
        setEditingResId(null);
        setReservationForm({
            ...emptyReservation,
            // Default start time to next day 10am for convenience
            startDateTime: toDatetimeLocal(new Date(Date.now() + 86400000).toISOString())
        });
        setResFormError(null);
        setModalOpen('reservation');
    };

    const handleSaveReservation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!data) return;
        setResFormError(null);

        // Client-side Validation
        if (reservationForm.startDateTime && reservationForm.endDateTime) {
            if (reservationForm.endDateTime < reservationForm.startDateTime) {
                setResFormError("A data/hora final não pode ser anterior à data/hora inicial.");
                return;
            }
        }

        try {
            const payload = {
                ...reservationForm,
                // Convert local datetime back to ISO with Timezone for API
                startDateTime: new Date(reservationForm.startDateTime!).toISOString(),
                endDateTime: reservationForm.endDateTime ? new Date(reservationForm.endDateTime).toISOString() : undefined,
                price: reservationForm.price ? Number(reservationForm.price) : undefined,
                title: reservationForm.title || 'Nova Reserva',
                type: reservationForm.type as ReservationType,
                status: reservationForm.status as ReservationStatus,
            };

            if (editingResId) {
                await api.updateReservation(editingResId, payload);
                toast({ message: 'Reserva atualizada.', type: 'success' });
            } else {
                await api.createReservation({
                    ...payload as any, // Cast to avoid partial match issues, valid payload built above
                    tripId: data.trip.id,
                });
                toast({ message: 'Reserva criada!', type: 'success' });
            }
            setModalOpen(null);
            fetchData(data.trip.id);
        } catch (err: any) {
            const error = handleApiError(err);
            if (error.kind === 'field') {
                setResFormError(error.message);
            } else {
                toast({ message: error.message, type: 'error' });
            }
        }
    };

    const handleDeleteReservationClick = (id: string) => {
        setDeletingResId(id);
        setDeleteError(null);
        setModalOpen('delete-res');
    };

    const confirmDeleteReservation = async () => {
        if (!deletingResId || !data) return;
        try {
            await api.deleteReservation(deletingResId);
            setModalOpen(null);
            fetchData(data.trip.id);
            toast({ message: 'Reserva removida.', type: 'success' });
        } catch (err: any) {
            const error = handleApiError(err);
            if (error.code === 'NOT_FOUND') {
                // Already deleted, just refresh
                setModalOpen(null);
                fetchData(data.trip.id);
            } else {
                setDeleteError(error.message);
            }
        } finally {
            if (!deleteError) {
                setDeletingResId(null);
            }
        }
    };

    // --- HELPERS ---
    const toDatetimeLocal = (isoStr: string) => {
        if (!isoStr) return '';
        // Create a date object
        const date = new Date(isoStr);
        // Adjust to local ISO string (YYYY-MM-DDTHH:mm) manually to avoid UTC conversion
        const pad = (n: number) => n.toString().padStart(2, '0');
        return date.getFullYear() +
            '-' + pad(date.getMonth() + 1) +
            '-' + pad(date.getDate()) +
            'T' + pad(date.getHours()) +
            ':' + pad(date.getMinutes());
    };

    const formatDate = (dateStr: string, formatType: 'range-start' | 'range-end' | 'day-header' | 'select' | 'datetime') => {
        const isIsoDateTime = dateStr.includes('T');
        const d = isIsoDateTime ? new Date(dateStr) : new Date(dateStr + 'T00:00:00');

        switch (formatType) {
            case 'range-start': return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(d);
            case 'range-end': return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
            case 'day-header': return new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(d);
            case 'select': return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(d);
            case 'datetime': return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d);
            default: return d.toLocaleDateString();
        }
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

    const getReservationLabel = (type: ReservationType) => {
        const labels: Record<string, string> = {
            flight: 'Voo', hotel: 'Hospedagem', car: 'Carro', train: 'Trem',
            bus: 'Ônibus', restaurant: 'Restaurante', tour: 'Passeio', other: 'Outro'
        };
        return labels[type] || type;
    };

    if (loading || !data) return <div className="p-8 text-center">Carregando detalhes...</div>;

    const { trip, days, activities, reservations } = data;

    // Group reservations by type
    const groupedReservations = reservations.reduce((acc, res) => {
        if (!acc[res.type]) acc[res.type] = [];
        acc[res.type].push(res);
        return acc;
    }, {} as Record<string, Reservation[]>);

    // Sort groups: Flight -> Hotel -> Others
    const sortedTypes = Object.keys(groupedReservations).sort((a, b) => {
        const priority = ['flight', 'hotel', 'car', 'train', 'bus'];
        const idxA = priority.indexOf(a);
        const idxB = priority.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b);
    });

    return (
        <div className="pb-20 md:pb-8">
            {/* Header */}
            <div className="relative h-48 md:h-64 bg-gray-900 overflow-hidden">
                {trip.coverImageUrl ? (
                    <>
                        <img src={trip.coverImageUrl} alt={trip.name} className="absolute inset-0 w-full h-full object-cover opacity-80" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                    </>
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-800 to-gray-900" />
                )}

                <div className="absolute top-4 left-4 z-10">
                    <button onClick={() => onNavigate('trips')} className="bg-black/30 hover:bg-black/50 text-white p-2 rounded-full backdrop-blur-sm transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 text-white">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Badge status={trip.status} />
                                <span className="text-sm opacity-90 flex items-center gap-1 font-medium bg-black/20 px-2 py-0.5 rounded-full backdrop-blur-sm">
                                    <Calendar size={14} />
                                    {formatDate(trip.startDate, 'range-start')} - {formatDate(trip.endDate, 'range-end')}
                                </span>
                            </div>
                            <h1 className="text-3xl font-bold shadow-sm">{trip.name}</h1>
                            <div className="flex items-center gap-1 text-gray-200 mt-1">
                                <MapPin size={16} />
                                <span className="text-sm font-medium">{trip.destination}</span>
                                <button onClick={handleEditTripClick} className="ml-2 p-1 hover:bg-white/20 rounded-full transition-colors" title="Editar Viagem">
                                    <Edit2 size={14} />
                                </button>
                            </div>
                        </div>
                        {/* Upgrade Hook */}
                        <button
                            onClick={() => onNavigate('upgrade')}
                            className="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-full border border-white/30 font-medium"
                        >
                            Compartilhar Viagem (Pro)
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm px-4 md:px-8">
                <div className="flex gap-6 overflow-x-auto no-scrollbar">
                    {['itinerary', 'reservations', 'participants', 'finances'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`py-4 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${activeTab === tab ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {tab === 'itinerary' && 'Roteiro'}
                            {tab === 'reservations' && 'Reservas'}
                            {tab === 'participants' && 'Participantes'}
                            {tab === 'finances' && 'Finanças'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="p-4 md:p-8 max-w-4xl mx-auto">

                {/* ITINERARY TAB */}
                {activeTab === 'itinerary' && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-800">Dia a Dia</h2>
                            <Button size="sm" onClick={() => setModalOpen('activity')}><Plus size={16} className="mr-1" /> Adicionar</Button>
                        </div>

                        <div className="relative border-l-2 border-gray-200 ml-3 md:ml-6 space-y-10 pb-4">
                            {days.map((day) => {
                                const dayActs = activities.filter(a => a.dayId === day.id);
                                return (
                                    <div key={day.id} className="relative pl-6 md:pl-10">
                                        {/* Day Marker */}
                                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-brand-500 border-4 border-white shadow-sm" />

                                        <div className="mb-4">
                                            <h3 className="text-lg font-bold text-gray-900">{day.title}</h3>
                                            <p className="text-sm text-gray-500 capitalize">
                                                {formatDate(day.date, 'day-header')}
                                            </p>
                                        </div>

                                        {dayActs.length > 0 ? (
                                            <div className="space-y-3">
                                                {dayActs.map((act) => (
                                                    <div key={act.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex gap-4 hover:border-brand-200 transition-colors group">
                                                        <div className="flex flex-col items-center justify-center w-12 text-gray-400 text-xs font-medium border-r border-gray-100 pr-4">
                                                            {act.timeStart ? (
                                                                <>
                                                                    <span>{act.timeStart}</span>
                                                                    {act.timeEnd && <span className="text-[10px] opacity-60">to {act.timeEnd}</span>}
                                                                </>
                                                            ) : (
                                                                <Clock size={16} />
                                                            )}
                                                        </div>
                                                        <div className="flex-1">
                                                            <h4 className="font-semibold text-gray-800">{act.title}</h4>
                                                            {act.locationName && (
                                                                <p className="text-sm text-gray-500 flex items-center mt-1">
                                                                    <MapPin size={12} className="mr-1" /> {act.locationName}
                                                                </p>
                                                            )}
                                                            {act.cost && (
                                                                <p className="text-xs text-green-600 font-medium mt-1 flex items-center">
                                                                    <DollarSign size={10} /> {act.currency || 'R$'} {act.cost}
                                                                </p>
                                                            )}
                                                        </div>
                                                        {/* Reorder Placeholder */}
                                                        <div className="hidden group-hover:flex flex-col gap-1 text-gray-300">
                                                            <MoveUp size={14} className="hover:text-gray-500 cursor-pointer" />
                                                            <MoveDown size={14} className="hover:text-gray-500 cursor-pointer" />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-sm text-gray-400 italic bg-gray-50 p-3 rounded-lg border border-dashed border-gray-200">
                                                Nenhuma atividade planejada.
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* RESERVATIONS TAB */}
                {activeTab === 'reservations' && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-800">Minhas Reservas</h2>
                            <Button size="sm" onClick={handleNewReservation}><Plus size={16} className="mr-1" /> Novo</Button>
                        </div>

                        {reservations.length > 0 ? (
                            <div className="grid gap-6">
                                {sortedTypes.map(type => (
                                    <div key={type}>
                                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            {React.createElement(getReservationIcon(type as ReservationType), { size: 16 })}
                                            {getReservationLabel(type as ReservationType)}
                                        </h3>
                                        <div className="space-y-3">
                                            {groupedReservations[type].map(res => (
                                                <div key={res.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col md:flex-row hover:shadow-md transition-shadow">
                                                    <div className={`w-full md:w-2 ${res.status === 'confirmed' ? 'bg-brand-500' : res.status === 'pending' ? 'bg-amber-400' : 'bg-red-400'}`} />
                                                    <div className="p-5 flex-1">

                                                        {/* Header Row: Label Left, Badge+Actions Right - FLEX LAYOUT FIX */}
                                                        <div className="flex justify-between items-start mb-2 gap-4">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <span className="text-xs uppercase font-bold text-gray-400 tracking-wider truncate">{getReservationLabel(res.type)}</span>
                                                            </div>

                                                            <div className="flex items-center gap-3 shrink-0 ml-auto">
                                                                <Badge status={res.status} />
                                                                <div className="flex gap-1">
                                                                    <button onClick={() => handleEditReservation(res)} className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors" title="Editar">
                                                                        <Edit2 size={16} />
                                                                    </button>
                                                                    <button onClick={() => handleDeleteReservationClick(res.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <h3 className="text-lg font-bold text-gray-900 mb-1 leading-tight">{res.title}</h3>
                                                        {res.provider && (
                                                            <p className="text-sm text-gray-500 mb-4">
                                                                {res.provider}
                                                                {res.confirmationCode && <> • Código: <span className="font-mono bg-gray-100 px-1 rounded text-gray-800">{res.confirmationCode}</span></>}
                                                            </p>
                                                        )}

                                                        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600 border-t border-gray-100 pt-4">
                                                            <div className="flex items-center gap-2">
                                                                <Calendar size={16} className="text-gray-400" />
                                                                {formatDate(res.startDateTime, 'datetime')}
                                                                {res.endDateTime && ` ➝ ${formatDate(res.endDateTime, 'datetime')}`}
                                                            </div>
                                                            {res.price && (
                                                                <div className="flex items-center gap-2">
                                                                    <DollarSign size={16} className="text-gray-400" />
                                                                    {res.currency} {res.price}
                                                                </div>
                                                            )}
                                                            {res.address && (
                                                                <div className="flex items-center gap-2">
                                                                    <MapPin size={16} className="text-gray-400" />
                                                                    <span className="truncate max-w-[200px]">{res.address}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <EmptyState
                                title="Sem reservas"
                                description="Adicione voos, hotéis ou aluguel de carros para manter tudo organizado."
                                icon={FileText}
                                action={<Button variant="outline" size="sm" onClick={handleNewReservation}>Adicionar primeira reserva</Button>}
                            />
                        )}
                    </div>
                )}

                {/* PARTICIPANTS TAB */}
                {/* PARTICIPANTS TAB */}
                {activeTab === 'participants' && (
                    <div className="animate-in slide-in-from-bottom-2 duration-300">
                        <ParticipantsList tripId={trip.id} />
                    </div>
                )}

                {/* FINANCES TAB */}
                {activeTab === 'finances' && (
                    <div className="animate-in slide-in-from-bottom-2 duration-300">
                        <FinanceModule tripId={trip.id} tripDefaultCurrency={trip.defaultCurrency} />
                    </div>
                )}
            </div>

            {/* Edit Trip Modal */}
            <Modal isOpen={modalOpen === 'edit-trip'} onClose={() => setModalOpen(null)} title="Editar Viagem">
                <form onSubmit={handleSaveTrip} className="space-y-4">
                    {editFormError && (
                        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2">
                            <XCircle size={16} /> {editFormError}
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Viagem</label>
                        <input required className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            value={editTripForm.name} onChange={e => setEditTripForm({ ...editTripForm, name: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Destino Principal</label>
                        <input required className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            value={editTripForm.destination} onChange={e => setEditTripForm({ ...editTripForm, destination: e.target.value })} />
                    </div>
                    {/* Cover Image Upload */}
                    <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <div className="w-16 h-16 rounded-lg bg-white border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0 relative group">
                            {editTripForm.coverImageUrl ? (
                                <>
                                    <img src={editTripForm.coverImageUrl} alt="Preview" className="w-full h-full object-cover" />
                                    <button type="button" onClick={handleRemoveImage} className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <X size={20} />
                                    </button>
                                </>
                            ) : (
                                <ImageIcon className="text-gray-400" size={24} />
                            )}
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Capa da Viagem (Opcional)</label>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
                            />
                            <p className="text-[10px] text-gray-400 mt-1 ml-1">Máximo 2MB</p>
                        </div>

                        <button
                            type="button"
                            onClick={generateAIImage}
                            className="p-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:shadow-lg hover:scale-105 transition-all text-xs font-bold flex flex-col items-center gap-1 shrink-0"
                            title="Gerar imagem com IA"
                        >
                            <Wand2 size={20} />
                            <span className="text-[10px]">IA Mágica</span>
                        </button>
                    </div>

                    {/* URL Input (Optional Fallback) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ou cole uma URL</label>
                        <input className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            placeholder="https://exemplo.com/imagem.jpg"
                            value={editTripForm.coverImageUrl} onChange={e => setEditTripForm({ ...editTripForm, coverImageUrl: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Moeda Padrão</label>
                        <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                            value={editTripForm.defaultCurrency}
                            onChange={e => setEditTripForm({ ...editTripForm, defaultCurrency: e.target.value })}
                        >
                            <option value="BRL">Real (BRL)</option>
                            <option value="USD">Dólar (USD)</option>
                            <option value="EUR">Euro (EUR)</option>
                            <option value="GBP">Libra (GBP)</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Início</label>
                            <input type="date" required className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                value={editTripForm.startDate} onChange={e => setEditTripForm({ ...editTripForm, startDate: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Fim</label>
                            <input type="date" required className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                value={editTripForm.endDate} onChange={e => setEditTripForm({ ...editTripForm, endDate: e.target.value })} />
                        </div>
                    </div>
                    <div className="pt-4 flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={() => setModalOpen(null)}>Cancelar</Button>
                        <Button type="submit">Salvar Alterações</Button>
                    </div>
                </form>
            </Modal>

            {/* Activity Modal */}
            <Modal isOpen={modalOpen === 'activity'} onClose={() => setModalOpen(null)} title="Nova Atividade">
                <form onSubmit={handleAddActivity} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Dia</label>
                        <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                            value={selectedDayId}
                            onChange={(e) => setSelectedDayId(e.target.value)}
                        >
                            {days.map(d => (
                                <option key={d.id} value={d.id}>{formatDate(d.date, 'select')} - {d.title}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                        <input
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            placeholder="Ex: Jantar no centro"
                            value={newActivity.title}
                            onChange={e => setNewActivity({ ...newActivity, title: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Horário</label>
                            <input
                                type="time"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                value={newActivity.timeStart || ''}
                                onChange={e => setNewActivity({ ...newActivity, timeStart: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Local</label>
                            <input
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                placeholder="Nome do local"
                                value={newActivity.locationName || ''}
                                onChange={e => setNewActivity({ ...newActivity, locationName: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="pt-4 flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={() => setModalOpen(null)}>Cancelar</Button>
                        <Button type="submit">Salvar</Button>
                    </div>
                </form>
            </Modal>

            {/* Reservation Modal */}
            <Modal isOpen={modalOpen === 'reservation'} onClose={() => setModalOpen(null)} title={editingResId ? "Editar Reserva" : "Nova Reserva"}>
                <form onSubmit={handleSaveReservation} className="space-y-4">
                    {resFormError && (
                        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2">
                            <XCircle size={16} /> {resFormError}
                        </div>
                    )}

                    {/* Type & Status */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                            <select
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                                value={reservationForm.type}
                                onChange={e => setReservationForm({ ...reservationForm, type: e.target.value as ReservationType })}
                            >
                                <option value="flight">Voo</option>
                                <option value="hotel">Hospedagem</option>
                                <option value="car">Carro</option>
                                <option value="train">Trem</option>
                                <option value="bus">Ônibus</option>
                                <option value="restaurant">Restaurante</option>
                                <option value="tour">Passeio</option>
                                <option value="other">Outro</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                                value={reservationForm.status}
                                onChange={e => setReservationForm({ ...reservationForm, status: e.target.value as ReservationStatus })}
                            >
                                <option value="confirmed">Confirmada</option>
                                <option value="pending">Pendente</option>
                                <option value="canceled">Cancelada</option>
                            </select>
                        </div>
                    </div>

                    {/* Title & Provider */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                        <input required placeholder="Ex: Voo para Londres" className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            value={reservationForm.title} onChange={e => setReservationForm({ ...reservationForm, title: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Provedor</label>
                            <input placeholder="Ex: Latam" className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                value={reservationForm.provider || ''} onChange={e => setReservationForm({ ...reservationForm, provider: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Cód. Confirmação</label>
                            <input placeholder="Ex: XY99Z" className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                value={reservationForm.confirmationCode || ''} onChange={e => setReservationForm({ ...reservationForm, confirmationCode: e.target.value })} />
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Início (Obrigatório)</label>
                            <input type="datetime-local" required className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                value={reservationForm.startDateTime} onChange={e => setReservationForm({ ...reservationForm, startDateTime: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Fim</label>
                            <input type="datetime-local" className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                value={reservationForm.endDateTime || ''} onChange={e => setReservationForm({ ...reservationForm, endDateTime: e.target.value })} />
                        </div>
                    </div>

                    {/* Price & Address */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Moeda</label>
                            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                                value={reservationForm.currency} onChange={e => setReservationForm({ ...reservationForm, currency: e.target.value })}>
                                <option value="BRL">BRL</option>
                                <option value="USD">USD</option>
                                <option value="EUR">EUR</option>
                                <option value="JPY">JPY</option>
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Valor</label>
                            <input type="number" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                value={reservationForm.price || ''} onChange={e => setReservationForm({ ...reservationForm, price: Number(e.target.value) })} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
                        <input className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Local ou endereço completo"
                            value={reservationForm.address || ''} onChange={e => setReservationForm({ ...reservationForm, address: e.target.value })} />
                    </div>

                    <div className="pt-4 flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={() => setModalOpen(null)}>Cancelar</Button>
                        <Button type="submit">Salvar Reserva</Button>
                    </div>
                </form>
            </Modal>

            {/* Delete Reservation Confirmation */}
            <Modal isOpen={modalOpen === 'delete-res'} onClose={() => setModalOpen(null)} title="Excluir Reserva?">
                <div className="py-2">
                    {deleteError && (
                        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2 mb-4">
                            <XCircle size={16} /> {deleteError}
                        </div>
                    )}
                    <p className="text-gray-600 mb-6">Tem certeza que deseja remover esta reserva? Esta ação não pode ser desfeita.</p>
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setModalOpen(null)}>Cancelar</Button>
                        <Button variant="danger" onClick={confirmDeleteReservation}>Excluir</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};