import { 
  User, Workspace, Trip, ItineraryDay, Activity, Reservation, 
  TripStatus, TripUI, CurrentUser, ReservationType, ReservationStatus 
} from '../types';
import { 
  MOCK_USER, MOCK_WORKSPACE, INITIAL_TRIPS, INITIAL_DAYS, 
  INITIAL_ACTIVITIES, INITIAL_RESERVATIONS 
} from './mockData';

// --- IN-MEMORY DATABASE ---
let users: User[] = [MOCK_USER];
let workspaces: Workspace[] = [MOCK_WORKSPACE];
let trips: Trip[] = [...INITIAL_TRIPS];
let days: ItineraryDay[] = [...INITIAL_DAYS];
let activities: Activity[] = [...INITIAL_ACTIVITIES];
let reservations: Reservation[] = [...INITIAL_RESERVATIONS];

// --- CONSTANTS ---
const LATENCY_MIN = 200;
const LATENCY_MAX = 600;
const ERROR_PROBABILITY = 0.00; // 0% for stability during MVP testing, can be increased

const ERROR_MESSAGES = {
  INTERNAL_SERVER_ERROR: 'Erro interno do servidor simulado.',
  INVALID_DATE_FORMAT: 'Formato de data inválido. Use AAAA-MM-DD.',
  INVALID_DATE: 'Data inválida.',
  USER_NOT_AUTHENTICATED: 'Usuário não autenticado.',
  WORKSPACE_NOT_FOUND: 'Workspace não encontrado.',
  NO_WORKSPACE_FOR_USER: 'Nenhum workspace encontrado para o usuário.',
  PLAN_LIMIT_REACHED: 'No plano gratuito, você pode ter no máximo 2 viagens ativas. Faça upgrade para criar mais.',
  TRIP_END_DATE_BEFORE_START: 'A data final não pode ser anterior à data de início.',
  TRIP_NOT_FOUND: 'Viagem não encontrada.',
  DAY_NOT_FOUND: 'Dia não encontrado.',
  RESERVATION_END_DATE_BEFORE_START: 'A data/hora final não pode ser anterior à data/hora inicial.',
  RESERVATION_NOT_FOUND: 'Reserva não encontrada.'
};

// --- TYPES FOR API ERRORS ---
type ApiErrorCode = 
  | 'UNAUTHORIZED' 
  | 'FORBIDDEN' 
  | 'NOT_FOUND' 
  | 'VALIDATION_ERROR' 
  | 'PLAN_LIMIT_REACHED' 
  | 'INTERNAL_ERROR';

class ApiError extends Error {
  public code: ApiErrorCode;
  public details?: any;

  constructor(code: ApiErrorCode, message: string, details?: any) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

// --- HELPER FUNCTIONS ---

const delay = (ms?: number) => new Promise(resolve => 
  setTimeout(resolve, ms || Math.floor(Math.random() * (LATENCY_MAX - LATENCY_MIN + 1) + LATENCY_MIN))
);

const maybeThrowError = () => {
  if (Math.random() < ERROR_PROBABILITY) {
    throw new ApiError('INTERNAL_ERROR', ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
  }
};

const generateId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const getIsoToday = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`; // YYYY-MM-DD
};

const getIsoNow = (): string => {
  return new Date().toISOString(); // YYYY-MM-DDTHH:mm:ss.sssZ
};

const ensureISODate = (value: string) => {
  const regex = /^(\d{4})-(\d{2})-(\d{2})$/;
  const match = regex.exec(value);
  if (!match) {
    throw new ApiError('VALIDATION_ERROR', ERROR_MESSAGES.INVALID_DATE_FORMAT, { value });
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  // month: 1-12, day: 1-31 (limits checked by Date round-trip)
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw new ApiError('VALIDATION_ERROR', ERROR_MESSAGES.INVALID_DATE_FORMAT, { value });
  }

  // Round-trip check to reject invalid dates like 2025-02-31
  const d = new Date(Date.UTC(year, month - 1, day));
  const yyyy = d.getUTCFullYear();
  const mm = d.getUTCMonth() + 1;
  const dd = d.getUTCDate();

  if (yyyy !== year || mm !== month || dd !== day) {
    throw new ApiError('VALIDATION_ERROR', ERROR_MESSAGES.INVALID_DATE, { value });
  }
};

const deriveTripStatus = (startDate: string, endDate: string): TripStatus => {
  const today = getIsoToday();
  // String comparison works for ISO_DATE format (YYYY-MM-DD)
  if (startDate > today) return 'planned';
  if (endDate < today) return 'completed';
  return 'ongoing';
};

const isActiveStatus = (status: TripStatus): boolean => {
  return status === 'planned' || status === 'ongoing';
};

// --- AUTH SIMULATION ---
const getCurrentUserOrThrow = (): User => {
  // In a real app, we would parse a token. Here we use the mock user.
  const user = users[0];
  if (!user) throw new ApiError('UNAUTHORIZED', ERROR_MESSAGES.USER_NOT_AUTHENTICATED);
  return user;
};

// --- ENTITLEMENTS ---

const getWorkspaceUsage = (workspaceId: string) => {
  const workspaceTrips = trips.filter(t => t.workspaceId === workspaceId);
  
  // Calculate active trips dynamically based on current date
  const activeTripsCount = workspaceTrips.reduce((count, trip) => {
    const status = deriveTripStatus(trip.startDate, trip.endDate);
    return isActiveStatus(status) ? count + 1 : count;
  }, 0);

  return {
    totalTrips: workspaceTrips.length,
    activeTrips: activeTripsCount
  };
};

const checkPlanLimits = (workspaceId: string) => {
  const workspace = workspaces.find(w => w.id === workspaceId);
  if (!workspace) throw new ApiError('NOT_FOUND', ERROR_MESSAGES.WORKSPACE_NOT_FOUND);

  if (workspace.planId === 'free') {
    const usage = getWorkspaceUsage(workspaceId);
    if (usage.activeTrips >= 2) {
      throw new ApiError(
        'PLAN_LIMIT_REACHED', 
        ERROR_MESSAGES.PLAN_LIMIT_REACHED
      );
    }
  }
};

// --- PUBLIC API IMPLEMENTATION ---

export const api = {
  // --- USER ---
  getMe: async (): Promise<CurrentUser> => {
    await delay();
    maybeThrowError();
    const user = getCurrentUserOrThrow();
    const ws = workspaces.find(w => w.ownerUserId === user.id);
    
    return {
      ...user,
      plan: ws ? ws.planId : 'free'
    };
  },

  // --- TRIPS ---
  listTrips: async (): Promise<TripUI[]> => {
    await delay();
    maybeThrowError();
    const user = getCurrentUserOrThrow();
    const ws = workspaces.find(w => w.ownerUserId === user.id);
    if (!ws) return [];

    const userTrips = trips.filter(t => t.workspaceId === ws.id);
    
    // Sort by startDate desc and add derived status
    return userTrips
      .map(trip => ({
        ...trip,
        status: deriveTripStatus(trip.startDate, trip.endDate)
      }))
      .sort((a, b) => b.startDate.localeCompare(a.startDate));
  },

  createTrip: async (payload: Pick<Trip, 'name' | 'destination' | 'startDate' | 'endDate' | 'coverImageUrl'>): Promise<TripUI> => {
    await delay(800); // Slightly longer for "creation"
    maybeThrowError();
    const user = getCurrentUserOrThrow();
    const ws = workspaces.find(w => w.ownerUserId === user.id);
    if (!ws) throw new ApiError('INTERNAL_ERROR', ERROR_MESSAGES.NO_WORKSPACE_FOR_USER);

    // 0. Format Validation
    ensureISODate(payload.startDate);
    ensureISODate(payload.endDate);

    // 1. Logic Validation
    if (payload.endDate < payload.startDate) {
      throw new ApiError('VALIDATION_ERROR', ERROR_MESSAGES.TRIP_END_DATE_BEFORE_START, {
        startDate: payload.startDate,
        endDate: payload.endDate
      });
    }

    // 2. Derive status to check logic
    const intendedStatus = deriveTripStatus(payload.startDate, payload.endDate);

    // 3. Check Limits (Only if the new trip would be active)
    if (isActiveStatus(intendedStatus)) {
      checkPlanLimits(ws.id);
    }

    // 4. Create Entity
    const now = getIsoNow();
    const newTrip: Trip = {
      id: generateId('t'),
      workspaceId: ws.id,
      name: payload.name,
      destination: payload.destination,
      startDate: payload.startDate,
      endDate: payload.endDate,
      coverImageUrl: payload.coverImageUrl,
      createdAt: now,
      updatedAt: now
    };

    trips.push(newTrip);

    // 5. Auto-generate Days
    const start = new Date(payload.startDate + 'T00:00:00');
    const end = new Date(payload.endDate + 'T00:00:00');
    
    let loopDate = new Date(start);
    let dayCount = 1;

    while (loopDate <= end) {
      const year = loopDate.getFullYear();
      const month = String(loopDate.getMonth() + 1).padStart(2, '0');
      const d = String(loopDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${d}`;

      const newDay: ItineraryDay = {
        id: generateId('d'),
        tripId: newTrip.id,
        date: dateStr,
        title: `Dia ${dayCount}`,
        createdAt: now
      };
      
      days.push(newDay);
      
      // Next day
      loopDate.setDate(loopDate.getDate() + 1);
      dayCount++;
    }

    return {
      ...newTrip,
      status: intendedStatus
    };
  },

  updateTrip: async (tripId: string, patch: Partial<Pick<Trip, 'name' | 'destination' | 'startDate' | 'endDate' | 'coverImageUrl'>>): Promise<TripUI> => {
    await delay(500);
    maybeThrowError();
    
    const tripIndex = trips.findIndex(t => t.id === tripId);
    if (tripIndex === -1) throw new ApiError('NOT_FOUND', ERROR_MESSAGES.TRIP_NOT_FOUND);
    
    const currentTrip = trips[tripIndex];
    
    // 0. Format Validation
    if (patch.startDate) ensureISODate(patch.startDate);
    if (patch.endDate) ensureISODate(patch.endDate);

    const newStartDate = patch.startDate || currentTrip.startDate;
    const newEndDate = patch.endDate || currentTrip.endDate;

    // 1. Logic Validation
    if (newEndDate < newStartDate) {
      throw new ApiError('VALIDATION_ERROR', ERROR_MESSAGES.TRIP_END_DATE_BEFORE_START, {
        startDate: newStartDate,
        endDate: newEndDate
      });
    }

    // 2. Check Plan Limits if status is active
    const newStatus = deriveTripStatus(newStartDate, newEndDate);
    
    if (isActiveStatus(newStatus)) {
        const ws = workspaces.find(w => w.id === currentTrip.workspaceId);
        if (ws && ws.planId === 'free') {
            // Count active trips EXCLUDING the current one being updated
            const otherActiveTrips = trips.filter(t => 
                t.id !== tripId && 
                t.workspaceId === ws.id && 
                isActiveStatus(deriveTripStatus(t.startDate, t.endDate))
            ).length;
            
            // If we have 2 or more active trips already, adding this one (making it active) would exceed limit
            if (otherActiveTrips >= 2) {
                throw new ApiError(
                    'PLAN_LIMIT_REACHED', 
                    ERROR_MESSAGES.PLAN_LIMIT_REACHED
                );
            }
        }
    }

    const updatedTrip = {
        ...currentTrip,
        ...patch,
        updatedAt: getIsoNow()
    };
    
    trips[tripIndex] = updatedTrip;
    
    return {
        ...updatedTrip,
        status: newStatus
    };
  },

  getTripDetails: async (tripId: string) => {
    await delay();
    maybeThrowError();
    const trip = trips.find(t => t.id === tripId);
    if (!trip) throw new ApiError('NOT_FOUND', ERROR_MESSAGES.TRIP_NOT_FOUND);

    const tripDays = days.filter(d => d.tripId === tripId).sort((a, b) => a.date.localeCompare(b.date));
    const dayIds = tripDays.map(d => d.id);
    
    const tripActivities = activities
      .filter(a => dayIds.includes(a.dayId))
      .sort((a, b) => a.orderIndex - b.orderIndex); // Sort by orderIndex

    const tripReservations = reservations.filter(r => r.tripId === tripId);

    return {
      trip: {
        ...trip,
        status: deriveTripStatus(trip.startDate, trip.endDate)
      } as TripUI,
      days: tripDays,
      activities: tripActivities,
      reservations: tripReservations
    };
  },

  deleteTrip: async (tripId: string): Promise<{ success: boolean }> => {
    await delay();
    const index = trips.findIndex(t => t.id === tripId);
    if (index === -1) throw new ApiError('NOT_FOUND', ERROR_MESSAGES.TRIP_NOT_FOUND);
    
    // Cascade delete: Days, Activities, Reservations
    const tripDayIds = days.filter(d => d.tripId === tripId).map(d => d.id);
    
    // 1. Delete Trip
    trips.splice(index, 1);
    
    // 2. Delete Days
    days = days.filter(d => d.tripId !== tripId);
    
    // 3. Delete Activities
    activities = activities.filter(a => !tripDayIds.includes(a.dayId));
    
    // 4. Delete Reservations
    reservations = reservations.filter(r => r.tripId !== tripId);

    return { success: true };
  },

  // --- ACTIVITIES ---
  
  createActivity: async (payload: Omit<Activity, 'id' | 'createdAt' | 'updatedAt' | 'orderIndex'>): Promise<Activity> => {
    await delay(300);
    maybeThrowError();
    
    const day = days.find(d => d.id === payload.dayId);
    if (!day) throw new ApiError('NOT_FOUND', ERROR_MESSAGES.DAY_NOT_FOUND);

    // Calculate order index (append to end)
    const existingActivities = activities.filter(a => a.dayId === payload.dayId);
    const maxOrder = existingActivities.reduce((max, curr) => Math.max(max, curr.orderIndex), -1);

    const now = getIsoNow();
    const newActivity: Activity = {
      id: generateId('a'),
      ...payload,
      orderIndex: maxOrder + 1,
      createdAt: now,
      updatedAt: now
    };

    activities.push(newActivity);
    return newActivity;
  },

  // --- RESERVATIONS ---

  createReservation: async (payload: Omit<Reservation, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<Reservation> => {
    await delay(400);
    maybeThrowError();

    const trip = trips.find(t => t.id === payload.tripId);
    if (!trip) throw new ApiError('NOT_FOUND', ERROR_MESSAGES.TRIP_NOT_FOUND);

    if (payload.endDateTime && payload.startDateTime > payload.endDateTime) {
      throw new ApiError('VALIDATION_ERROR', ERROR_MESSAGES.RESERVATION_END_DATE_BEFORE_START);
    }

    const now = getIsoNow();
    const newReservation: Reservation = {
      id: generateId('r'),
      ...payload,
      status: 'confirmed', // Default status
      createdAt: now,
      updatedAt: now
    };

    reservations.push(newReservation);
    return newReservation;
  },

  updateReservation: async (id: string, patch: Partial<Omit<Reservation, 'id' | 'tripId' | 'createdAt' | 'updatedAt'>>): Promise<Reservation> => {
    await delay(400);
    maybeThrowError();

    const idx = reservations.findIndex(r => r.id === id);
    if (idx === -1) throw new ApiError('NOT_FOUND', ERROR_MESSAGES.RESERVATION_NOT_FOUND);

    const current = reservations[idx];
    const newStart = patch.startDateTime || current.startDateTime;
    const newEnd = patch.endDateTime !== undefined ? patch.endDateTime : current.endDateTime;

    if (newEnd && newStart > newEnd) {
      throw new ApiError('VALIDATION_ERROR', ERROR_MESSAGES.RESERVATION_END_DATE_BEFORE_START);
    }

    const updated: Reservation = {
      ...current,
      ...patch,
      updatedAt: getIsoNow()
    };

    reservations[idx] = updated;
    return updated;
  },

  deleteReservation: async (id: string): Promise<{ success: boolean }> => {
    await delay(300);
    maybeThrowError();

    const idx = reservations.findIndex(r => r.id === id);
    if (idx === -1) throw new ApiError('NOT_FOUND', ERROR_MESSAGES.RESERVATION_NOT_FOUND);

    reservations.splice(idx, 1);
    return { success: true };
  }
};