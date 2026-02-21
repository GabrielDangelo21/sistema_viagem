import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Clock, DollarSign, MoveUp, MoveDown, Trash2, Edit2, Map as MapIcon, List as ListIcon, Calendar as CalendarIcon } from 'lucide-react';
import { Button, Badge } from './UI';
import { CSS } from '@dnd-kit/utilities';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import iconMarker from 'leaflet/dist/images/marker-icon.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { api } from '../services/api';

// Fix Leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: iconRetina,
    iconUrl: iconMarker,
    shadowUrl: iconShadow,
});

// Format helper
const formatDate = (dateStr: string, formatType: string) => {
    const isIsoDateTime = dateStr.includes('T');
    const d = isIsoDateTime ? new Date(dateStr) : new Date(dateStr + 'T00:00:00');
    switch (formatType) {
        case 'day-header': return new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(d);
        case 'select': return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(d);
        default: return d.toLocaleDateString();
    }
};

const SortableActivity = ({ act, onEdit, onDelete }: { act: any, onEdit: any, onDelete: any }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: act.id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.8 : 1
    };

    return (
        <div ref={setNodeRef} style={style} className={`bg-white p-4 rounded-xl border ${isDragging ? 'border-brand-500 shadow-lg relative' : 'border-gray-100 shadow-sm'} flex gap-4 hover:border-brand-200 transition-colors group`}>
            {/* Drag Handle */}
            <div {...attributes} {...listeners} className="flex flex-col items-center justify-center w-8 cursor-grab active:cursor-grabbing text-gray-300 hover:text-brand-500 hover:bg-brand-50 rounded-lg shrink-0 touch-none">
                <MoveUp size={14} className="-mb-1" />
                <MoveDown size={14} />
            </div>

            <div className="flex flex-col items-center justify-center w-12 text-gray-400 text-xs font-medium border-r border-gray-100 pr-4 shrink-0">
                {act.timeStart ? (
                    <>
                        <span className="text-gray-700">{act.timeStart}</span>
                        {act.timeEnd && <span className="text-[10px] opacity-60">até {act.timeEnd}</span>}
                    </>
                ) : (
                    <Clock size={16} />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-800 truncate">{act.title}</h4>
                {act.locationName && (
                    <p className="text-sm text-gray-500 flex items-center mt-1 truncate">
                        <MapPin size={12} className="mr-1 shrink-0" /> {act.locationName}
                    </p>
                )}
                {act.cost && (
                    <p className="text-xs text-green-600 font-medium mt-1 flex items-center">
                        <DollarSign size={10} className="shrink-0" /> {act.currency || 'R$'} {act.cost}
                    </p>
                )}
            </div>

            <div className="flex gap-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity items-center shrink-0 pr-2">
                <button onClick={() => onEdit(act)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors" title="Editar">
                    <Edit2 size={16} />
                </button>
                <button onClick={() => onDelete(act.id)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
                    <Trash2 size={16} />
                </button>
            </div>
        </div>
    );
};

const DayActivityList = ({ dayId, acts, onEdit, onDelete }: any) => {
    const { setNodeRef } = useDroppable({ id: dayId });

    return (
        <div ref={setNodeRef} className="space-y-3 min-h-[60px] rounded-xl transition-colors">
            <SortableContext items={acts.map((a: any) => a.id)} strategy={verticalListSortingStrategy}>
                {acts.length > 0 ? (
                    acts.map((act: any) => (
                        <SortableActivity key={act.id} act={act} onEdit={onEdit} onDelete={onDelete} />
                    ))
                ) : (
                    <div className="text-sm text-gray-400 italic bg-gray-50 p-3 rounded-lg border border-dashed border-gray-200 pointer-events-none">
                        Arraste uma atividade para cá ou adicione uma nova.
                    </div>
                )}
            </SortableContext>
        </div>
    );
};

const TimelineView = ({ days, activities, onEdit, onDelete }: any) => {
    // Flatten and sort absolutely everything by date and time
    const timelineItems = days.flatMap((day: any) => {
        const dayActs = activities.filter((a: any) => a.dayId === day.id);
        return dayActs.map((act: any) => ({
            ...act,
            parsedDate: day.date,
            sortTime: act.timeStart || '24:00',
            dayTitle: day.title
        }));
    }).sort((a: any, b: any) => {
        const dateDiff = a.parsedDate.localeCompare(b.parsedDate);
        if (dateDiff !== 0) return dateDiff;
        return a.sortTime.localeCompare(b.sortTime);
    });

    if (timelineItems.length === 0) {
        return (
            <div className="text-center py-20 bg-gray-50 rounded-2xl border border-gray-100">
                <CalendarIcon size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">Adicione atividades para visualizar na linha do tempo.</p>
            </div>
        );
    }

    let currentDate = '';

    return (
        <div className="relative border-l-2 border-brand-200 ml-4 md:ml-8 py-4 space-y-8">
            {timelineItems.map((act: any, idx: number) => {
                const isNewDate = act.parsedDate !== currentDate;
                if (isNewDate) {
                    currentDate = act.parsedDate;
                }

                return (
                    <React.Fragment key={act.id}>
                        {isNewDate && (
                            <div className="relative -left-[9px] flex items-center mb-6 mt-8 first:mt-0">
                                <div className="w-4 h-4 rounded-full bg-brand-500 border-4 border-white shadow-sm ring-1 ring-brand-200" />
                                <h3 className="ml-4 text-lg font-bold text-gray-900 bg-white px-3 py-1 rounded-full shadow-sm border border-gray-100">
                                    {formatDate(act.parsedDate, 'day-header')}
                                </h3>
                            </div>
                        )}
                        <div className="relative pl-8 md:pl-12 group">
                            {/* Connector Node */}
                            <div className="absolute -left-[5px] top-4 w-2 h-2 rounded-full bg-brand-300 group-hover:bg-brand-500 group-hover:scale-150 transition-all" />

                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:border-brand-300 transition-colors flex flex-col md:flex-row gap-4">
                                <div className="text-sm font-bold text-brand-600 w-16 md:border-r border-gray-100 md:pr-4 flex items-center md:justify-center">
                                    {act.timeStart || 'S/ Hora'}
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-gray-800 text-lg">{act.title}</h4>
                                    {act.locationName && (
                                        <p className="text-sm text-gray-500 flex items-center mt-1">
                                            <MapPin size={14} className="mr-1 text-gray-400" /> {act.locationName}
                                        </p>
                                    )}
                                    {act.notes && (
                                        <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
                                            {act.notes}
                                        </p>
                                    )}
                                </div>
                                {act.cost && (
                                    <div className="flex items-start">
                                        <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-1 rounded border border-green-100">
                                            {act.currency || 'R$'} {act.cost}
                                        </span>
                                    </div>
                                )}

                                <div className="flex flex-row md:flex-col gap-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity justify-center mt-2 md:mt-0 pt-2 md:pt-0 border-t md:border-t-0 md:border-l border-gray-100 md:pl-2 shrink-0">
                                    <button onClick={() => onEdit(act)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors" title="Editar">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => onDelete(act.id)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </React.Fragment>
                );
            })}
        </div>
    );
};

// FitBounds component to auto-pan to all markers
const MapBounds = ({ activities }: { activities: any[] }) => {
    const map = useMap();
    useEffect(() => {
        const coords = activities.filter(a => a.latitude && a.longitude).map(a => [a.latitude, a.longitude] as [number, number]);
        if (coords.length > 0) {
            const bounds = L.latLngBounds(coords);
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        }
    }, [activities, map]);
    return null;
};

const MapView = ({ activities, days }: any) => {
    const mappableActs = activities.filter((a: any) => a.latitude && a.longitude);

    if (mappableActs.length === 0) {
        return (
            <div className="text-center py-20 bg-gray-50 rounded-2xl border border-gray-100">
                <MapIcon size={48} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-bold text-gray-700">Nenhum local mapeado</h3>
                <p className="text-gray-500">Adicione atividades com endereços precisos para gerar o mapa.</p>
            </div>
        );
    }

    const center: [number, number] = [mappableActs[0].latitude, mappableActs[0].longitude];

    return (
        <div className="h-[500px] rounded-2xl overflow-hidden border border-gray-200 shadow-inner z-0 relative isolate">
            <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                />
                <MapBounds activities={mappableActs} />

                {mappableActs.map((act: any) => {
                    const actDay = days.find((d: any) => d.id === act.dayId);
                    return (
                        <Marker key={act.id} position={[act.latitude, act.longitude]}>
                            <Popup className="rounded-xl font-sans">
                                <div className="text-center">
                                    <h4 className="font-bold text-gray-900 border-b pb-1 mb-1">{act.title}</h4>
                                    {actDay && <p className="text-xs font-semibold text-brand-600 mb-1 capitalize">{formatDate(actDay.date, 'day-header')}</p>}
                                    <p className="text-sm text-gray-600 mb-1">{act.locationName || act.address}</p>
                                    {act.timeStart && <p className="text-xs font-bold text-gray-800">{act.timeStart} {act.timeEnd ? `até ${act.timeEnd}` : ''}</p>}
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
};

export function ItineraryTab({ days, activities, stays, handleNewStay, handleNewActivity, handleEditActivity, handleDeleteActivityClick, handleEditStay, handleDeleteStayClick, refetch }: any) {
    const [view, setView] = useState<'list' | 'timeline' | 'map'>('timeline');

    const [localActs, setLocalActs] = useState(activities);
    useEffect(() => { setLocalActs(activities); }, [activities]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const findDayId = (id: string, currentActs: any[]) => {
        if (days.some((d: any) => d.id === id)) return id; // It's a day bucket
        const act = currentActs.find((a: any) => a.id === id);
        return act?.dayId;
    };

    const handleDragEnd = async (event: any) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        if (activeId === overId) return;

        const activeDayId = findDayId(activeId, localActs);
        const overDayId = findDayId(overId, localActs);

        if (!activeDayId || !overDayId) return;

        const activeAct = localActs.find((a: any) => a.id === activeId);
        if (!activeAct) return;

        let newActs = [...localActs];

        if (activeDayId === overDayId) {
            const dayActs = newActs.filter(a => a.dayId === activeDayId).sort((a, b) => a.orderIndex - b.orderIndex);
            const oldIndex = dayActs.findIndex(a => a.id === activeId);
            const newIndex = dayActs.findIndex(a => a.id === overId);

            const reorderedDayActs = arrayMove(dayActs, oldIndex, newIndex);

            newActs = newActs.map(a => {
                if (a.dayId === activeDayId) {
                    const idx = reorderedDayActs.findIndex((ra: any) => ra.id === a.id);
                    return { ...a, orderIndex: idx };
                }
                return a;
            });

            setLocalActs(newActs);

            try {
                await api.reorderActivities(activeDayId, reorderedDayActs.map(a => a.id));
                refetch();
            } catch (err) {
                console.error(err);
                setLocalActs(activities);
            }
        } else {
            const newDayId = overDayId;

            newActs = newActs.map(a => {
                if (a.id === activeId) {
                    return { ...a, dayId: newDayId };
                }
                return a;
            });

            const sourceDayActs = newActs.filter(a => a.dayId === activeDayId).sort((a, b) => a.orderIndex - b.orderIndex);
            const targetDayActs = newActs.filter(a => a.dayId === newDayId).sort((a, b) => a.orderIndex - b.orderIndex);

            let finalTargetActs = [...targetDayActs];

            if (overId !== newDayId) {
                const overIndex = targetDayActs.findIndex((a: any) => a.id === overId);
                const activeIndexInTarget = finalTargetActs.findIndex((a: any) => a.id === activeId);
                if (activeIndexInTarget >= 0) {
                    finalTargetActs = arrayMove(finalTargetActs, activeIndexInTarget, overIndex);
                }
            }

            newActs = newActs.map(a => {
                if (a.dayId === activeDayId) {
                    return { ...a, orderIndex: sourceDayActs.findIndex(sa => sa.id === a.id) };
                }
                if (a.dayId === newDayId) {
                    return { ...a, orderIndex: finalTargetActs.findIndex(ta => ta.id === a.id) };
                }
                return a;
            });

            setLocalActs(newActs);

            try {
                await api.updateActivity(activeId, { dayId: newDayId });
                await api.reorderActivities(newDayId, finalTargetActs.map(a => a.id));
                await api.reorderActivities(activeDayId, sourceDayActs.map(a => a.id));
                refetch();
            } catch (err) {
                console.error(err);
                setLocalActs(activities);
            }
        }
    };

    // Group days chronologically
    const grouped: any[] = [];
    const sortedDays = [...days].sort((a: any, b: any) => a.date.localeCompare(b.date));
    let currentUnassignedBlock: any = null;

    sortedDays.forEach(day => {
        const dDate = day.date.substring(0, 10);
        const matchingStay = stays?.find((s: any) => {
            const sStart = s.startDate.substring(0, 10);
            const sEnd = s.endDate.substring(0, 10);
            return dDate >= sStart && dDate <= sEnd;
        });

        if (matchingStay) {
            if (currentUnassignedBlock) {
                grouped.push(currentUnassignedBlock);
                currentUnassignedBlock = null;
            }

            let stayBlock = grouped.find(g => g.type === 'stay' && g.stay.id === matchingStay.id);
            if (!stayBlock) {
                stayBlock = { type: 'stay', stay: matchingStay, days: [] };
                grouped.push(stayBlock);
            }
            stayBlock.days.push(day);
        } else {
            if (!currentUnassignedBlock) {
                currentUnassignedBlock = { type: 'unassigned', days: [] };
            }
            currentUnassignedBlock.days.push(day);
        }
    });

    if (currentUnassignedBlock) {
        grouped.push(currentUnassignedBlock);
    }

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
            {/* Header controls */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-gray-800">Dia a Dia</h2>

                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button onClick={() => setView('list')} className={`p-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors ${view === 'list' ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                            <ListIcon size={14} /> Lista
                        </button>
                        <button onClick={() => setView('timeline')} className={`p-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors ${view === 'timeline' ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                            <CalendarIcon size={14} /> Linha do Tempo
                        </button>
                        <button onClick={() => setView('map')} className={`p-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors ${view === 'map' ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                            <MapIcon size={14} /> Mapa
                        </button>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={handleNewStay}><MapPin size={16} className="mr-1" /> Nova Estadia</Button>
                    <Button size="sm" onClick={handleNewActivity}><Plus size={16} className="mr-1" /> Atividade</Button>
                </div>
            </div>

            {/* List View */}
            {view === 'list' && (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <div className="space-y-12">
                        {grouped.map((group, gIdx) => (
                            <div key={group.type === 'stay' ? group.stay.id : `unassigned-${gIdx}`} className="space-y-6">
                                {group.type === 'stay' && (
                                    <div className="bg-brand-50 rounded-2xl p-4 md:p-6 border border-brand-100 flex justify-between items-center group">
                                        <div>
                                            <h3 className="text-lg md:text-xl font-bold text-brand-900 flex items-center gap-2">
                                                <MapPin size={20} className="text-brand-600" />
                                                {group.stay.name}
                                            </h3>
                                            <p className="text-brand-700/80 text-sm mt-1 font-medium">
                                                {formatDate(group.stay.startDate, 'select')} a {formatDate(group.stay.endDate, 'select')}
                                                ({group.days.length} diárias planejadas)
                                            </p>
                                        </div>
                                        <div className="flex gap-2 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleEditStay(group.stay)} className="w-8 h-8 flex items-center justify-center bg-white/60 hover:bg-white text-brand-700 rounded-full transition-colors shadow-sm" title="Editar Estadia"><Edit2 size={16} /></button>
                                            <button onClick={() => handleDeleteStayClick(group.stay.id)} className="w-8 h-8 flex items-center justify-center bg-white/60 hover:bg-white text-red-600 rounded-full transition-colors shadow-sm" title="Excluir Estadia"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                )}

                                <div className="relative border-l-2 border-gray-200 ml-3 md:ml-6 space-y-10 pb-4">
                                    {group.days.map((day: any) => {
                                        const dayActs = localActs
                                            .filter((a: any) => a.dayId === day.id)
                                            .sort((a: any, b: any) => {
                                                if (a.orderIndex !== b.orderIndex) return a.orderIndex - b.orderIndex;
                                                return (a.timeStart || '24:00').localeCompare((b.timeStart || '24:00'));
                                            });

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

                                                <DayActivityList
                                                    dayId={day.id}
                                                    acts={dayActs}
                                                    onEdit={handleEditActivity}
                                                    onDelete={handleDeleteActivityClick}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </DndContext>
            )}

            {/* Timeline View */}
            {view === 'timeline' && (
                <div className="animate-in fade-in duration-500">
                    <TimelineView
                        days={days}
                        activities={activities}
                        onEdit={handleEditActivity}
                        onDelete={handleDeleteActivityClick}
                    />
                </div>
            )}

            {/* Map View */}
            {view === 'map' && (
                <div className="animate-in fade-in duration-500">
                    <MapView activities={activities} days={days} />
                </div>
            )}
        </div>
    );
}
