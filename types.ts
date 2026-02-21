// --- ENTITIES (STRICTLY FROM CONTRACT.MD) ---

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  timezone: string;
  locale: string;
  createdAt: string; // ISO_DATETIME
}

export interface Workspace {
  id: string;
  name: string;
  ownerUserId: string;
  planId: 'free' | 'pro' | 'family';
  createdAt: string; // ISO_DATETIME
}

export interface Trip {
  id: string;
  workspaceId: string;
  name: string;
  destination: string;
  startDate: string; // ISO_DATE
  endDate: string; // ISO_DATE
  coverImageUrl?: string;
  type?: string;
  budget?: number | null;
  defaultCurrency?: string;
  createdAt: string; // ISO_DATETIME
  updatedAt: string; // ISO_DATETIME
  stays?: Stay[];
}

export interface ItineraryDay {
  id: string;
  tripId: string;
  date: string; // ISO_DATE
  title?: string;
  createdAt: string; // ISO_DATETIME
}

export interface Stay {
  id: string;
  tripId: string;
  name: string;
  startDate: string; // ISO_DATE
  endDate: string; // ISO_DATE
  createdAt?: string; // ISO_DATETIME
}

export interface Activity {
  id: string;
  dayId: string;
  title: string;
  timeStart?: string; // HH:mm
  timeEnd?: string; // HH:mm
  locationName?: string;
  address?: string;
  mapUrl?: string;
  cost?: number;
  currency?: string;
  notes?: string;
  latitude?: number;
  longitude?: number;
  orderIndex: number;
  createdAt: string; // ISO_DATETIME
  updatedAt: string; // ISO_DATETIME
}

export type ReservationType = 'flight' | 'hotel' | 'car' | 'train' | 'bus' | 'restaurant' | 'tour' | 'other';
export type ReservationStatus = 'confirmed' | 'pending' | 'canceled';

export interface Reservation {
  id: string;
  tripId: string;
  type: ReservationType;
  title: string;
  provider?: string;
  confirmationCode?: string;
  startDateTime: string; // ISO_DATETIME
  endDateTime?: string; // ISO_DATETIME
  address?: string;
  mapUrl?: string;
  price?: number;
  currency: string;
  status: ReservationStatus;
  attachmentFileId?: string;
  notes?: string;
  createdAt: string; // ISO_DATETIME
  updatedAt: string; // ISO_DATETIME
}

export interface FileMeta {
  id: string;
  workspaceId: string;
  ownerUserId: string;
  path: string;
  mimeType: string;
  sizeBytes: number;
  originalName: string;
  createdAt: string; // ISO_DATETIME
}


export type WorkspaceRole = 'owner' | 'admin' | 'editor' | 'viewer';
export type TripRole = 'trip_admin' | 'trip_editor' | 'trip_viewer';

export interface Participant {
  id: string;
  tripId: string;
  userId?: string;
  name: string;
  email?: string;
  isOwner: boolean;
}

export interface ChecklistItem {
  id: string;
  tripId: string;
  text: string;
  isChecked: boolean;
  createdAt: string;
}

export interface Expense {
  id: string;
  tripId: string;
  title: string;
  amount: number;
  currency: string;
  paidByParticipantId: string;
  date: string; // ISO_DATETIME
  createdAt: string; // ISO_DATETIME

  // Relations (optional/included)
  paidBy?: Participant;
  shares?: ExpenseShare[];
}

export interface ExpenseShare {
  id: string;
  expenseId: string;
  participantId: string;
  amount: number;
  isPaid: boolean;

  participant?: Participant;
}

// --- UI / APP SPECIFIC TYPES (DERIVED) ---

export type TripStatus = 'planned' | 'ongoing' | 'completed';

export interface TripUI extends Trip {
  status: TripStatus;
}

export interface CurrentUser extends User {
  plan: 'free' | 'pro' | 'family';
}

export type RouteName = 'dashboard' | 'trips' | 'trip-details' | 'upgrade' | 'profile';

export interface AppState {
  currentRoute: RouteName;
  params?: Record<string, any>;
}