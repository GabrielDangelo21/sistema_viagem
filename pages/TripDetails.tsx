import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { supabase } from '../lib/supabase';
import { handleApiError } from '../services/handleApiError';
import { TripUI, ItineraryDay, Activity, Reservation, RouteName, ReservationType, ReservationStatus, ChecklistItem, Participant, Stay } from '../types';
import { Button, Modal, Badge, EmptyState, useToast } from '../components/UI';
import { ArrowLeft, Calendar, MapPin, Clock, DollarSign, Plus, MoveUp, MoveDown, Plane, Hotel, FileText, Car, Train, Bus, Utensils, Flag, Box, Edit2, Trash2, XCircle, Image as ImageIcon, X, Loader2, Check, List, Users, Wallet } from 'lucide-react';

const TRIP_TYPES = [
    { value: 'lazer', label: 'Lazer', emoji: '🏖️', color: 'bg-blue-100 text-blue-700' },
    { value: 'trabalho', label: 'Trabalho', emoji: '💼', color: 'bg-slate-100 text-slate-700' },
    { value: 'aventura', label: 'Aventura', emoji: '🏔️', color: 'bg-orange-100 text-orange-700' },
    { value: 'romantica', label: 'Romântica', emoji: '💑', color: 'bg-pink-100 text-pink-700' },
    { value: 'familia', label: 'Família', emoji: '👨‍👩‍👧‍👦', color: 'bg-green-100 text-green-700' },
    { value: 'cultural', label: 'Cultural', emoji: '🏛️', color: 'bg-amber-100 text-amber-700' },
    { value: 'outro', label: 'Outro', emoji: '✈️', color: 'bg-gray-100 text-gray-700' },
] as const;

import { ParticipantsList } from '../components/ParticipantsList';
import { FinanceModule } from '../components/FinanceModule';
import { StayModal } from '../components/StayModal';
import { ItineraryTab } from '../components/ItineraryTab';

interface TripDetailsProps {
    tripId?: string;
    initialTab?: 'overview' | 'itinerary' | 'reservations' | 'participants' | 'finances' | 'checklist';
    onNavigate: (route: RouteName, params?: any) => void;
}

export const TripDetails: React.FC<TripDetailsProps> = ({ tripId, initialTab, onNavigate }) => {
    const [data, setData] = useState<{ trip: TripUI, days: ItineraryDay[], activities: Activity[], reservations: Reservation[], stays: Stay[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'itinerary' | 'reservations' | 'participants' | 'finances' | 'checklist'>(initialTab || 'overview');
    const { toast } = useToast();

    // State for overview
    const [overviewData, setOverviewData] = useState<{ participants: Participant[], balances: any } | null>(null);
    const [overviewLoading, setOverviewLoading] = useState(false);

    // Modals
    const [modalOpen, setModalOpen] = useState<'activity' | 'reservation' | 'delete-res' | 'edit-trip' | 'stay' | 'delete-stay' | 'delete-activity' | null>(null);

    // State for Edit Trip Form
    const [editTripForm, setEditTripForm] = useState({ name: '', destination: '', startDate: '', endDate: '', coverImageUrl: '', type: 'lazer', budget: null as number | null, defaultCurrency: 'BRL' });
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

    // Checklist state
    const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
    const [newItemText, setNewItemText] = useState('');
    const [checklistLoaded, setChecklistLoaded] = useState(false);

    // State for Stay Form
    const [editingStay, setEditingStay] = useState<Stay | null>(null);
    const [deletingStayId, setDeletingStayId] = useState<string | null>(null);
    const [stayError, setStayError] = useState<string | null>(null);

    // State for Activity Form
    const [newActivity, setNewActivity] = useState<Partial<Activity>>({ title: '' });
    const [selectedDayId, setSelectedDayId] = useState<string>('');
    const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
    const [deletingActivityId, setDeletingActivityId] = useState<string | null>(null);

    // Autocomplete State
    const [locationQuery, setLocationQuery] = useState('');
    const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
    const [isSearchingLocation, setIsSearchingLocation] = useState(false);
    const [showLocationDropdown, setShowLocationDropdown] = useState(false);
    const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
    const locationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

    // Lazy-load checklist and overview data
    useEffect(() => {
        if ((activeTab === 'checklist' || activeTab === 'overview') && data && !checklistLoaded) {
            const loadChecklist = async () => {
                try {
                    const items = await api.getChecklist(data.trip.id);
                    setChecklistItems(items);
                } catch {
                    setChecklistItems([]);
                }
                setChecklistLoaded(true);
            };
            loadChecklist();
        }
    }, [activeTab, data, checklistLoaded]);

    useEffect(() => {
        if (activeTab === 'overview' && data && !overviewData && !overviewLoading) {
            setOverviewLoading(true);
            const loadOverview = async () => {
                try {
                    const [p, b] = await Promise.all([
                        api.getParticipants(data.trip.id),
                        api.getBalances(data.trip.id).catch(() => ({ balances: {}, suggestedPayments: [] }))
                    ]);
                    setOverviewData({ participants: p, balances: b });
                } catch (e) {
                    console.error(e);
                } finally {
                    setOverviewLoading(false);
                }
            };
            loadOverview();
        }
    }, [activeTab, data, overviewData, overviewLoading]);

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
            type: data.trip.type || 'lazer',
            budget: data.trip.budget ?? null,
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

            setEditTripForm(prev => ({ ...prev, coverImageUrl: publicUrl }));
            toast({ message: 'Imagem enviada!', type: 'success' });
        } catch (err: any) {
            toast({ message: err.message || 'Erro ao enviar imagem', type: 'error' });
        } finally {
            setUploadingCover(false);
        }
    };

    const handleRemoveImage = () => {
        setEditTripForm(prev => ({ ...prev, coverImageUrl: '' }));
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };



    // --- STAY HANDLERS ---
    const handleNewStay = () => {
        setEditingStay(null);
        setModalOpen('stay');
    };

    const handleEditStay = (stay: Stay) => {
        setEditingStay(stay);
        setModalOpen('stay');
    };

    const handleSaveStay = async (stayData: Partial<Stay>) => {
        if (!data) return;
        try {
            if (editingStay) {
                await api.updateStay(data.trip.id, editingStay.id, stayData);
                toast({ message: 'Estadia atualizada!', type: 'success' });
            } else {
                await api.createStay(data.trip.id, stayData as any);
                toast({ message: 'Estadia criada!', type: 'success' });
            }
            fetchData(data.trip.id);
        } catch (err: any) {
            throw err; // Let modal handle error display
        }
    };

    const handleDeleteStayClick = (id: string) => {
        setDeletingStayId(id);
        setStayError(null);
        setModalOpen('delete-stay');
    };

    const confirmDeleteStay = async () => {
        if (!deletingStayId || !data) return;
        try {
            await api.deleteStay(data.trip.id, deletingStayId);
            setModalOpen(null);
            fetchData(data.trip.id);
            toast({ message: 'Estadia removida.', type: 'success' });
        } catch (err: any) {
            setStayError(handleApiError(err).message);
        } finally {
            if (!stayError) setDeletingStayId(null);
        }
    };

    // --- ACTIVITY HANDLERS ---
    const handleNewActivity = () => {
        setEditingActivityId(null);
        setNewActivity({ title: '' });
        setLocationQuery('');
        setLocationSuggestions([]);
        setModalOpen('activity');
    };

    const handleEditActivityClick = (act: Activity) => {
        setEditingActivityId(act.id);
        setSelectedDayId(act.dayId);
        setNewActivity(act);
        setLocationQuery(act.locationName || '');
        setLocationSuggestions([]);
        setModalOpen('activity');
    };

    const handleDeleteActivityClick = (id: string) => {
        setDeletingActivityId(id);
        setModalOpen('delete-activity');
    };

    const confirmDeleteActivity = async () => {
        if (!deletingActivityId || !data) return;
        try {
            await api.deleteActivity(deletingActivityId);
            setModalOpen(null);
            fetchData(data.trip.id);
            toast({ message: 'Atividade removida.', type: 'success' });
        } catch (err: any) {
            toast({ message: handleApiError(err).message, type: 'error' });
        } finally {
            setDeletingActivityId(null);
        }
    };

    // --- GOOGLE MAPS AUTOCOMPLETE HANDLERS ---

    useEffect(() => {
        if ((window as any).google) {
            setIsGoogleLoaded(true);
            return;
        }

        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY;
        if (!apiKey) {
            console.error('VITE_GOOGLE_MAPS_KEY não está definida no ambiente.');
            return;
        }

        const existingScript = document.querySelector('script[src*="googleapis.com/maps/api/js"]');
        if (existingScript) {
            existingScript.addEventListener('load', () => setIsGoogleLoaded(true));
            return;
        }

        (window as any).initMap = () => {
            setIsGoogleLoaded(true);
        };

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=pt-BR&loading=async&callback=initMap`;
        script.async = true;
        script.defer = true;
        script.onerror = () => console.error('Falha ao carregar script do Google Maps');
        document.head.appendChild(script);
    }, []);

    const fetchLocationSuggestions = async (query: string) => {
        if (!query || query.length < 2) {
            setLocationSuggestions([]);
            setShowLocationDropdown(false);
            return;
        }

        const google = (window as any).google;
        if (!google) return;

        setIsSearchingLocation(true);
        try {
            const { suggestions } = await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({ input: query });
            const predictions = (suggestions ?? [])
                .filter((s: any) => s.placePrediction)
                .map((s: any) => ({
                    description: s.placePrediction.text.text,
                    place_id: s.placePrediction.placeId,
                }));
            setLocationSuggestions(predictions);
            setShowLocationDropdown(predictions.length > 0);
        } catch (err) {
            console.error('Error fetching Google suggestions', err);
            setLocationSuggestions([]);
        } finally {
            setIsSearchingLocation(false);
        }
    };

    const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setLocationQuery(value);
        setNewActivity(prev => ({ ...prev, locationName: value }));

        if (value.length > 0) {
            setShowLocationDropdown(true);
            setIsSearchingLocation(true); // Exibe feedback de "buscando" de cara
        } else {
            setShowLocationDropdown(false);
            setLocationSuggestions([]);
            return;
        }

        if (locationTimeoutRef.current) clearTimeout(locationTimeoutRef.current);

        locationTimeoutRef.current = setTimeout(() => {
            fetchLocationSuggestions(value);
        }, 500);
    };

    const handleLocationSelect = async (prediction: any) => {
        const displayName = prediction.description;
        setLocationQuery(displayName);
        setShowLocationDropdown(false);

        const google = (window as any).google;
        if (!google) return;

        try {
            const place = new google.maps.places.Place({ id: prediction.place_id });
            await place.fetchFields({ fields: ['location'] });
            if (place.location) {
                setNewActivity(prev => ({
                    ...prev,
                    locationName: displayName,
                    latitude: place.location.lat(),
                    longitude: place.location.lng(),
                }));
            } else {
                setNewActivity(prev => ({ ...prev, locationName: displayName }));
            }
        } catch (err) {
            console.error('Error fetching place details', err);
            setNewActivity(prev => ({ ...prev, locationName: displayName }));
        }
    };

    const handleSaveActivity = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!data || !selectedDayId) return;

        try {
            if (editingActivityId) {
                await api.updateActivity(editingActivityId, {
                    dayId: selectedDayId,
                    title: newActivity.title || 'Nova Atividade',
                    timeStart: newActivity.timeStart,
                    locationName: newActivity.locationName,
                    latitude: newActivity.latitude,
                    longitude: newActivity.longitude,
                });
                toast({ message: 'Atividade atualizada!', type: 'success' });
            } else {
                await api.createActivity({
                    dayId: selectedDayId,
                    title: newActivity.title || 'Nova Atividade',
                    timeStart: newActivity.timeStart,
                    locationName: newActivity.locationName,
                    latitude: newActivity.latitude,
                    longitude: newActivity.longitude,
                });
                toast({ message: 'Atividade adicionada!', type: 'success' });
            }
            setModalOpen(null);
            setEditingActivityId(null);
            setNewActivity({ title: '' });
            fetchData(data.trip.id);
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

    const { trip, days, activities, reservations, stays } = data;

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
            <div className="relative h-56 md:h-64 bg-gray-900 overflow-hidden">
                {trip.coverImageUrl ? (
                    <>
                        <img src={trip.coverImageUrl} alt={trip.name} className="absolute inset-0 w-full h-full object-cover opacity-80" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                    </>
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-800 to-gray-900" />
                )}

                <div className="absolute top-3 left-3 z-10 safe-area-top">
                    <button onClick={() => {
                        if (activeTab === 'overview') {
                            onNavigate('trips');
                        } else {
                            setActiveTab('overview');
                        }
                    }} className="bg-black/40 hover:bg-black/60 text-white p-2.5 rounded-full backdrop-blur-sm transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8 text-white">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                                <Badge status={trip.status} />
                                {(() => { const tt = TRIP_TYPES.find(t => t.value === trip.type); return tt ? <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${tt.color}`}>{tt.emoji} {tt.label}</span> : null; })()}
                                <span className="text-xs opacity-90 flex items-center gap-1 font-medium bg-black/20 px-2 py-0.5 rounded-full backdrop-blur-sm">
                                    <Calendar size={12} />
                                    {formatDate(trip.startDate, 'range-start')} - {formatDate(trip.endDate, 'range-end')}
                                </span>
                            </div>
                            <h1 className="text-2xl md:text-3xl font-bold leading-tight">{trip.name}</h1>
                            <div className="flex items-center gap-1.5 text-gray-200">
                                <MapPin size={14} />
                                <span className="text-sm font-medium">{trip.destination}</span>
                                <button onClick={handleEditTripClick} className="ml-1 p-1.5 hover:bg-white/20 rounded-full transition-colors inline-flex items-center justify-center" title="Editar Viagem">
                                    <Edit2 size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>



            {/* Content */}
            <div className="p-4 md:p-8 max-w-4xl mx-auto">

                {/* OVERVIEW TAB */}
                {activeTab === 'overview' && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
                        {/* Greeting / Intro replacing the big hero button need */}
                        <div className="space-y-1 mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                                Tudo pronto para {trip.destination}?
                            </h2>
                            <p className="text-gray-500 text-base">
                                Veja o resumo da sua viagem abaixo ou acesse as ferramentas para organizá-la.
                            </p>
                        </div>

                        {/* Quick Actions Grid */}
                        <section className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
                            {[
                                { icon: Calendar, label: 'Roteiro', sub: `${days.length} dias`, action: () => setActiveTab('itinerary'), color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
                                { icon: Box, label: 'Reservas', sub: `${reservations.length} itens`, action: () => setActiveTab('reservations'), color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
                                { icon: Users, label: 'Participantes', sub: overviewData ? `${overviewData.participants.length} pessoas` : 'Carregando...', action: () => setActiveTab('participants'), color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
                                { icon: Wallet, label: 'Finanças', sub: 'Gastos e Saldos', action: () => setActiveTab('finances'), color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-100' },
                                { icon: List, label: 'Checklists', sub: checklistLoaded ? `${checklistItems.filter(i => i.isChecked).length}/${checklistItems.length}` : 'Carregando...', action: () => setActiveTab('checklist'), color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
                            ].map((item, idx) => (
                                <button
                                    key={idx}
                                    onClick={item.action}
                                    className={`group relative bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all text-left flex flex-col gap-2 hover:ring-1 hover:ring-brand-100/50`}
                                >
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.bg} ${item.color} ${item.border} border group-hover:scale-110 transition-transform shrink-0`}>
                                        <item.icon size={20} strokeWidth={2.5} />
                                    </div>
                                    <div className="min-w-0">
                                        <span className="block font-bold text-gray-900 text-sm md:text-[15px] leading-tight mb-0.5 group-hover:text-brand-700 transition-colors truncate">{item.label}</span>
                                        <span className="block text-[11px] font-medium text-gray-400 group-hover:text-gray-500 truncate">{item.sub}</span>
                                    </div>
                                </button>
                            ))}
                        </section>

                        {/* Widgets Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mt-6">

                            {/* Roteiro Widget */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-5 md:col-span-2 flex flex-col">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                        <div className="p-1.5 bg-blue-50 rounded-lg text-blue-600"><Calendar size={18} /></div>
                                        Próximas Atividades
                                    </h3>
                                    <button onClick={() => setActiveTab('itinerary')} className="text-sm font-medium text-brand-600 hover:underline">Ver roteiro completo</button>
                                </div>
                                <div className="space-y-2 flex-1 relative min-h-[120px]">
                                    {activities.slice(0, 3).map(act => (
                                        <div key={act.id} className="flex gap-3 p-3 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-colors">
                                            <div className="flex flex-col items-center justify-center w-10 shrink-0 text-gray-400 text-xs font-medium border-r border-gray-100 pr-3">
                                                {act.timeStart || <Clock size={14} />}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h4 className="font-semibold text-gray-800 text-sm truncate">{act.title}</h4>
                                                {act.locationName && <p className="text-xs text-gray-500 mt-0.5 truncate">{act.locationName}</p>}
                                            </div>
                                        </div>
                                    ))}
                                    {activities.length === 0 && <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">Nenhuma atividade planejada.</div>}
                                </div>
                            </div>

                            {/* Checklist Widget */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-5 flex flex-col h-full col-span-1">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                        <div className="p-1.5 bg-orange-50 rounded-lg text-orange-600"><List size={18} /></div>
                                        Checklist
                                    </h3>
                                    <button onClick={() => setActiveTab('checklist')} className="text-sm font-medium text-brand-600 hover:underline">Ver tudo</button>
                                </div>
                                <div className="space-y-2 flex-auto overflow-hidden min-h-[120px] relative">
                                    {checklistLoaded ? checklistItems.slice(0, 4).map((item, idx) => (
                                        <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg border border-gray-50 bg-gray-50/50">
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${item.isChecked ? 'bg-brand-500 border-brand-500' : 'border-gray-300 bg-white'}`}>
                                                <Check size={12} className={`text-white transition-opacity ${item.isChecked ? 'opacity-100' : 'opacity-0'}`} />
                                            </div>
                                            <span className={`text-sm truncate ${item.isChecked ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{item.text}</span>
                                        </div>
                                    )) : <div className="animate-pulse space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-8 bg-gray-100 rounded" />)}</div>}
                                    {checklistLoaded && checklistItems.length === 0 && <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">Lista vazia.</div>}
                                </div>
                            </div>

                            {/* Reservas Widget */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-5 md:col-span-2 flex flex-col">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                        <div className="p-1.5 bg-purple-50 rounded-lg text-purple-600"><Plane size={18} /></div>
                                        Reservas
                                    </h3>
                                    <button onClick={() => setActiveTab('reservations')} className="text-sm font-medium text-brand-600 hover:underline">Ver todas</button>
                                </div>
                                <div className="space-y-2 relative min-h-[120px] flex-1">
                                    {reservations.slice(0, 3).map(res => (
                                        <div key={res.id} className="flex gap-3 items-center p-3 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-colors">
                                            <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                                                {React.createElement(getReservationIcon(res.type), { size: 16 })}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-semibold text-gray-800 text-sm truncate">{res.title}</h4>
                                                <p className="text-xs text-gray-500 truncate">{formatDate(res.startDateTime, 'datetime')} • {res.provider || getReservationLabel(res.type)}</p>
                                            </div>
                                            <div className="shrink-0">
                                                <Badge status={res.status} />
                                            </div>
                                        </div>
                                    ))}
                                    {reservations.length === 0 && <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">Nenhuma reserva adicionada.</div>}
                                </div>
                            </div>

                            {/* Participantes Widget */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-5 flex flex-col col-span-1">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                        <div className="p-1.5 bg-green-50 rounded-lg text-green-600"><Users size={18} /></div>
                                        Viajantes
                                    </h3>
                                    <button onClick={() => setActiveTab('participants')} className="text-sm font-medium text-brand-600 hover:underline">Detalhes</button>
                                </div>
                                <div className="space-y-2 relative min-h-[120px] flex-1">
                                    {overviewLoading ? <div className="animate-pulse space-y-2">{[1, 2].map(i => <div key={i} className="h-10 bg-gray-100 rounded-xl" />)}</div> : overviewData ? overviewData.participants.slice(0, 4).map((p: any) => (
                                        <div key={p.id} className="flex items-center gap-3 p-2 rounded-xl border border-transparent hover:bg-gray-50 transition-colors">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0 border border-slate-200 shadow-sm">
                                                {p.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-gray-800 truncate leading-snug">{p.name}</p>
                                                {p.isOwner && <span className="text-[10px] font-semibold text-teal-600 uppercase tracking-wide">Organizador</span>}
                                            </div>
                                        </div>
                                    )) : null}
                                </div>
                            </div>

                            {/* Finanças Widget */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-5 md:col-span-full flex flex-col">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                        <div className="p-1.5 bg-teal-50 rounded-lg text-teal-600"><Wallet size={18} /></div>
                                        Orçamento e Saldos
                                    </h3>
                                    <button onClick={() => setActiveTab('finances')} className="text-sm font-medium text-brand-600 hover:underline">Gerenciar Finanças</button>
                                </div>
                                <div className="flex gap-4 overflow-x-auto pb-2 min-h-[80px] items-center no-scrollbar relative">
                                    {overviewLoading ? <div className="text-sm text-gray-400 absolute inset-0 flex items-center justify-center">Carregando dados financeiros...</div> : overviewData && overviewData.balances?.balances && Object.keys(overviewData.balances.balances).length > 0 ? Object.keys(overviewData.balances.balances).map(pid => {
                                        const pName = overviewData.participants.find((x: any) => x.id === pid)?.name || 'Anônimo';
                                        const val = overviewData.balances.balances[pid];
                                        if (Math.abs(val) < 0.01) return null;
                                        return (
                                            <div key={pid} className={`shrink-0 p-3 rounded-xl border min-w-[150px] flex flex-col gap-1 items-center justify-center text-center transition-colors ${val > 0 ? 'bg-green-50/50 border-green-100' : 'bg-red-50/50 border-red-100'}`}>
                                                <span className="text-sm font-semibold text-gray-700 truncate w-full">{pName}</span>
                                                <span className={`text-base font-bold ${val > 0 ? 'text-green-700' : 'text-red-700'}`}>
                                                    {val > 0 ? `+ ${trip.defaultCurrency} ${val.toFixed(2)}` : `- ${trip.defaultCurrency} ${Math.abs(val).toFixed(2)}`}
                                                </span>
                                            </div>
                                        )
                                    }) : <div className="text-sm text-gray-400 absolute inset-0 flex items-center justify-center">Nenhuma movimentação financeira.</div>}
                                </div>
                            </div>

                        </div>
                    </div>
                )}

                {/* ITINERARY TAB */}
                {activeTab === 'itinerary' && (
                    <ItineraryTab
                        days={days}
                        activities={activities}
                        stays={stays}
                        handleNewStay={handleNewStay}
                        handleNewActivity={handleNewActivity}
                        handleEditActivity={handleEditActivityClick}
                        handleDeleteActivityClick={handleDeleteActivityClick}
                        handleEditStay={handleEditStay}
                        handleDeleteStayClick={handleDeleteStayClick}
                        refetch={() => fetchData(trip.id)}
                    />
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

                {/* CHECKLIST TAB */}
                {activeTab === 'checklist' && (
                    <div className="animate-in slide-in-from-bottom-2 duration-300 space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <List size={20} className="text-orange-500" />
                                Checklist ({checklistItems.filter(i => i.isChecked).length}/{checklistItems.length})
                            </h2>
                        </div>

                        {/* Progress bar */}
                        {checklistItems.length > 0 && (
                            <div className="w-full bg-gray-100 rounded-full h-2">
                                <div
                                    className="bg-brand-500 h-2 rounded-full transition-all duration-500"
                                    style={{ width: `${(checklistItems.filter(i => i.isChecked).length / checklistItems.length) * 100}%` }}
                                />
                            </div>
                        )}

                        {/* Items */}
                        <div className="space-y-2">
                            {!checklistLoaded ? (
                                <div className="space-y-3">
                                    {[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}
                                </div>
                            ) : checklistItems.length > 0 ? (
                                checklistItems.map(item => (
                                    <div
                                        key={item.id}
                                        className={`flex items-center gap-4 p-3.5 rounded-xl transition-all border group ${item.isChecked
                                            ? 'bg-gray-50/50 border-transparent opacity-70'
                                            : 'bg-white border-gray-100 hover:border-brand-200 hover:shadow-sm'
                                            }`}
                                    >
                                        <div
                                            onClick={async () => {
                                                setChecklistItems(prev => prev.map(i => i.id === item.id ? { ...i, isChecked: !i.isChecked } : i));
                                                try { await api.toggleChecklistItem(item.id, !item.isChecked); }
                                                catch { setChecklistItems(prev => prev.map(i => i.id === item.id ? { ...i, isChecked: item.isChecked } : i)); toast({ message: 'Erro ao atualizar', type: 'error' }); }
                                            }}
                                            className={`w-6 h-6 rounded-lg border cursor-pointer flex items-center justify-center transition-all shrink-0 ${item.isChecked ? 'bg-brand-500 border-brand-500' : 'border-gray-300 bg-white group-hover:border-brand-400'
                                                }`}
                                        >
                                            <Check size={14} className={`text-white transition-transform ${item.isChecked ? 'scale-100' : 'scale-0'}`} />
                                        </div>
                                        <span className={`flex-1 text-sm font-medium select-none ${item.isChecked ? 'text-gray-400 line-through' : 'text-gray-700 group-hover:text-gray-900'
                                            }`}>
                                            {item.text}
                                        </span>
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                if (!confirm('Remover este item?')) return;
                                                try { await api.deleteChecklistItem(item.id); setChecklistItems(prev => prev.filter(i => i.id !== item.id)); }
                                                catch { toast({ message: 'Erro ao remover', type: 'error' }); }
                                            }}
                                            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity p-1"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <EmptyState
                                    title="Checklist vazio"
                                    description="Adicione itens importantes para esta viagem!"
                                    icon={List}
                                />
                            )}
                        </div>

                        {/* Add Item */}
                        <form
                            onSubmit={async (e) => {
                                e.preventDefault();
                                if (!newItemText.trim()) return;
                                try {
                                    const newItem = await api.createChecklistItem(trip.id, newItemText);
                                    setChecklistItems(prev => [...prev, newItem].sort((a, b) => a.text.localeCompare(b.text)));
                                    setNewItemText('');
                                    toast({ message: 'Item adicionado!', type: 'success' });
                                } catch { toast({ message: 'Erro ao adicionar', type: 'error' }); }
                            }}
                            className="flex gap-2 pt-4 border-t border-gray-100"
                        >
                            <input
                                type="text"
                                placeholder="Adicionar novo item..."
                                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                                value={newItemText}
                                onChange={e => setNewItemText(e.target.value)}
                            />
                            <Button type="submit" size="sm" disabled={!newItemText.trim()} className="rounded-xl aspect-square p-0 w-10 flex items-center justify-center">
                                <Plus size={18} />
                            </Button>
                        </form>
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
                                    <img src={editTripForm.coverImageUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
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

                    {/* Trip Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Viagem</label>
                        <div className="flex flex-wrap gap-2">
                            {TRIP_TYPES.map(tt => (
                                <button
                                    key={tt.value}
                                    type="button"
                                    onClick={() => setEditTripForm({ ...editTripForm, type: tt.value })}
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${editTripForm.type === tt.value
                                        ? 'border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-500/20'
                                        : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
                                        }`}
                                >
                                    <span>{tt.emoji}</span>
                                    <span>{tt.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Budget */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Orçamento Previsto (Opcional)</label>
                        <div className="relative">
                            <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="number"
                                min="0"
                                step="100"
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
                                placeholder="Ex: 5000"
                                value={editTripForm.budget ?? ''}
                                onChange={e => setEditTripForm({ ...editTripForm, budget: e.target.value ? Number(e.target.value) : null })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                </form >
            </Modal >

            {/* Activity Modal */}
            < Modal isOpen={modalOpen === 'activity'} onClose={() => setModalOpen(null)} title={editingActivityId ? "Editar Atividade" : "Nova Atividade"} >
                <form onSubmit={handleSaveActivity} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Dia</label>
                        <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                            value={selectedDayId}
                            onChange={(e) => setSelectedDayId(e.target.value)}
                        >
                            {[...days].sort((a, b) => a.date.localeCompare(b.date)).map(d => {
                                const dayActivities = activities.filter(a => a.dayId === d.id);
                                const titleStr = d.title?.trim() || (dayActivities.length > 0 ? dayActivities[0].title : '');
                                return (
                                    <option key={d.id} value={d.id}>
                                        {formatDate(d.date, 'select')}{titleStr ? ` - ${titleStr}` : ''}
                                    </option>
                                );
                            })}
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Horário</label>
                            <input
                                type="time"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                value={newActivity.timeStart || ''}
                                onChange={e => setNewActivity({ ...newActivity, timeStart: e.target.value })}
                            />
                        </div>
                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Local</label>
                            <input
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                placeholder="Nome do local ou endereço"
                                value={locationQuery}
                                onChange={handleLocationChange}
                                onFocus={() => {
                                    if (locationSuggestions.length > 0) setShowLocationDropdown(true);
                                }}
                            />
                            {/* Dropdown de Sugestões Simplificado e Robusto */}
                            {showLocationDropdown && (
                                <div className="mt-2 w-full overflow-hidden rounded-md border-2 border-brand-500 bg-white shadow-md z-50">
                                    {!isGoogleLoaded ? (
                                        <div className="p-3 text-red-600 bg-red-50 font-bold">
                                            ⚠️ API do Google carregando ou não configurada...
                                        </div>
                                    ) : isSearchingLocation ? (
                                        <div className="p-3 text-blue-600 bg-blue-50">
                                            ⏳ Buscando no Google...
                                        </div>
                                    ) : locationSuggestions.length === 0 ? (
                                        <div className="p-3 text-gray-700 bg-gray-50">
                                            ❌ Nenhum local encontrado pela API.
                                        </div>
                                    ) : (
                                        <div className="max-h-60 overflow-y-auto">
                                            {locationSuggestions.map((prediction: any, idx) => (
                                                <div
                                                    key={prediction.place_id || idx}
                                                    className="cursor-pointer border-b border-gray-100 p-3 hover:bg-brand-50"
                                                    onClick={() => handleLocationSelect(prediction)}
                                                >
                                                    <div className="font-semibold text-gray-900">
                                                        {prediction.structured_formatting.main_text}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {prediction.structured_formatting.secondary_text}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="pt-4 flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={() => setModalOpen(null)}>Cancelar</Button>
                        <Button type="submit">Salvar</Button>
                    </div>
                </form>
            </Modal >

            {/* Reservation Modal */}
            < Modal isOpen={modalOpen === 'reservation'} onClose={() => setModalOpen(null)} title={editingResId ? "Editar Reserva" : "Nova Reserva"} >
                <form onSubmit={handleSaveReservation} className="space-y-4">
                    {resFormError && (
                        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2">
                            <XCircle size={16} /> {resFormError}
                        </div>
                    )}

                    {/* Type & Status */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            </Modal >

            {/* Delete Reservation Confirmation */}
            < Modal isOpen={modalOpen === 'delete-res'} onClose={() => setModalOpen(null)} title="Excluir Reserva?" >
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
            </Modal >

            {/* Delete Activity Confirmation */}
            < Modal isOpen={modalOpen === 'delete-activity'} onClose={() => setModalOpen(null)} title="Excluir Atividade?" >
                <div className="py-2">
                    <p className="text-gray-600 mb-6">Tem certeza que deseja remover esta atividade? Esta ação não pode ser desfeita.</p>
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setModalOpen(null)}>Cancelar</Button>
                        <Button variant="danger" onClick={confirmDeleteActivity}>Excluir</Button>
                    </div>
                </div>
            </Modal >

            {/* Stay Modal */}
            <StayModal
                isOpen={modalOpen === 'stay'}
                onClose={() => setModalOpen(null)}
                onSave={handleSaveStay}
                stay={editingStay}
                tripStartDate={trip.startDate}
                tripEndDate={trip.endDate}
            />

            {/* Delete Stay Confirmation */}
            <Modal isOpen={modalOpen === 'delete-stay'} onClose={() => setModalOpen(null)} title="Excluir Estadia/Base?">
                <div className="py-2">
                    {stayError && (
                        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2 mb-4">
                            <XCircle size={16} /> {stayError}
                        </div>
                    )}
                    <p className="text-gray-600 mb-6 font-medium">Tem certeza que deseja remover esta estadia?</p>
                    <p className="text-gray-500 text-sm mb-6">Esta ação removerá apenas o agrupamento. Os dias e atividades em si não serão excluídos, apenas voltarão a ficar desagrupados.</p>
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setModalOpen(null)}>Cancelar</Button>
                        <Button variant="danger" onClick={confirmDeleteStay}>Excluir</Button>
                    </div>
                </div>
            </Modal>
        </div >
    );
};