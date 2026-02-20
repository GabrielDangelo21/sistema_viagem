import { Trip, ItineraryDay, Activity, Reservation, User, Workspace } from '../types';

// Helper functions to replace date-fns
const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const subDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
};

const today = new Date();
const nowISO = today.toISOString();

export const MOCK_USER: User = {
  id: 'u1',
  name: 'Alex Pereira',
  email: 'alex@tripnest.com',
  timezone: 'America/Sao_Paulo',
  locale: 'pt-BR',
  createdAt: subDays(today, 120).toISOString(),
};

export const MOCK_WORKSPACE: Workspace = {
  id: 'w1',
  name: 'Personal Workspace',
  ownerUserId: 'u1',
  planId: 'free',
  createdAt: subDays(today, 120).toISOString(),
}

// Mock 1: Future Trip (Planned)
const futureStart = addDays(today, 35);
const futureEnd = addDays(today, 39);

export const TRIP_FUTURE: Trip = {
  id: 't1',
  workspaceId: 'w1',
  name: 'Explorando Tóquio',
  destination: 'Tóquio, Japão',
  startDate: futureStart.toISOString().split('T')[0], // ISO_DATE
  endDate: futureEnd.toISOString().split('T')[0],   // ISO_DATE
  coverImageUrl: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=1000&auto=format&fit=crop',
  createdAt: subDays(today, 10).toISOString(),
  updatedAt: subDays(today, 10).toISOString(),
};

// Days for Future Trip
export const DAYS_FUTURE: ItineraryDay[] = [
  { id: 'd1', tripId: 't1', date: futureStart.toISOString().split('T')[0], title: 'Chegada e Shibuya', createdAt: nowISO },
  { id: 'd2', tripId: 't1', date: addDays(futureStart, 1).toISOString().split('T')[0], title: 'Templos e Cultura', createdAt: nowISO },
  { id: 'd3', tripId: 't1', date: addDays(futureStart, 2).toISOString().split('T')[0], title: 'Akihabara Tech', createdAt: nowISO },
  { id: 'd4', tripId: 't1', date: addDays(futureStart, 3).toISOString().split('T')[0], title: 'Retorno', createdAt: nowISO },
];

// Activities for Future Trip
export const ACTIVITIES_FUTURE: Activity[] = [
  { id: 'a1', dayId: 'd1', title: 'Check-in Hotel', timeStart: '14:00', locationName: 'Hotel Gracery', orderIndex: 0, createdAt: nowISO, updatedAt: nowISO },
  { id: 'a2', dayId: 'd1', title: 'Shibuya Crossing', timeStart: '16:00', locationName: 'Shibuya', orderIndex: 1, createdAt: nowISO, updatedAt: nowISO },
  { id: 'a3', dayId: 'd1', title: 'Jantar Sushi', timeStart: '19:30', locationName: 'Uobei Sushi', cost: 150, currency: 'JPY', orderIndex: 2, createdAt: nowISO, updatedAt: nowISO },
  { id: 'a4', dayId: 'd2', title: 'Senso-ji Temple', timeStart: '09:00', locationName: 'Asakusa', orderIndex: 0, createdAt: nowISO, updatedAt: nowISO },
];

// Mock 2: Past Trip (Completed)
const pastStart = subDays(today, 60);
const pastEnd = subDays(today, 55);

export const TRIP_PAST: Trip = {
  id: 't2',
  workspaceId: 'w1',
  name: 'Carnaval no Rio',
  destination: 'Rio de Janeiro, Brasil',
  startDate: pastStart.toISOString().split('T')[0],
  endDate: pastEnd.toISOString().split('T')[0],
  coverImageUrl: 'https://images.unsplash.com/photo-1483394007887-1464826b548d?q=80&w=1000&auto=format&fit=crop',
  createdAt: subDays(today, 100).toISOString(),
  updatedAt: subDays(today, 100).toISOString(),
};

export const RESERVATIONS_PAST: Reservation[] = [
  {
    id: 'r1', tripId: 't2', type: 'flight', title: 'Voo SP -> RJ', provider: 'Latam',
    confirmationCode: 'LA4590', startDateTime: pastStart.toISOString(),
    currency: 'BRL', price: 450, status: 'confirmed', createdAt: nowISO, updatedAt: nowISO
  },
  {
    id: 'r2', tripId: 't2', type: 'hotel', title: 'Copacabana Palace', provider: 'Belmond',
    confirmationCode: 'HTL-999', startDateTime: pastStart.toISOString(), endDateTime: pastEnd.toISOString(),
    currency: 'BRL', price: 2500, status: 'confirmed', address: 'Av. Atlântica, 1702', createdAt: nowISO, updatedAt: nowISO
  }
];

export const INITIAL_TRIPS = [TRIP_FUTURE, TRIP_PAST];
export const INITIAL_DAYS = [...DAYS_FUTURE];
export const INITIAL_ACTIVITIES = [...ACTIVITIES_FUTURE];
export const INITIAL_RESERVATIONS = [...RESERVATIONS_PAST];