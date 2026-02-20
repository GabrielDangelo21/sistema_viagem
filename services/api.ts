import {
  User, Workspace, Trip, ItineraryDay, Activity, Reservation,
  TripStatus, TripUI, CurrentUser, ReservationType, ReservationStatus,
  Participant, Expense, ExpenseShare, ChecklistItem,
} from '../types';

import { supabase } from '../lib/supabase';


const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333/api';

// --- AUTH HELPER ---
async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Usuário não autenticado');
  }
  return {
    'Authorization': `Bearer ${session.access_token}`
  };
}

async function handleResponse(res: Response) {
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message = errorData.message || 'Erro na requisição';
    throw new Error(message);
  }
  return res.json();
}

// --- API IMPLEMENTATION ---
export const api = {
  // --- USER ---
  getMe: async (): Promise<CurrentUser> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}/me`, { headers });
    const data = await handleResponse(res);
    return {
      ...data.user,
      plan: data.workspace.planId
    };
  },

  updateMe: async (patch: { name?: string; avatarUrl?: string | null; timezone?: string; locale?: string }): Promise<CurrentUser> => {
    const headers = {
      ...(await getAuthHeaders()),
      'Content-Type': 'application/json'
    };
    const res = await fetch(`${API_URL}/me`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(patch)
    });
    const data = await handleResponse(res);
    return data.user;
  },

  // --- TRIPS ---
  listTrips: async (): Promise<TripUI[]> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}/trips`, { headers });
    return handleResponse(res);
  },

  createTrip: async (payload: Pick<Trip, 'name' | 'destination' | 'startDate' | 'endDate' | 'coverImageUrl' | 'defaultCurrency'>): Promise<TripUI> => {
    const headers = {
      ...(await getAuthHeaders()),
      'Content-Type': 'application/json'
    };
    const res = await fetch(`${API_URL}/trips`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  updateTrip: async (tripId: string, patch: Partial<Pick<Trip, 'name' | 'destination' | 'startDate' | 'endDate' | 'coverImageUrl' | 'defaultCurrency'>>): Promise<TripUI> => {
    const headers = {
      ...(await getAuthHeaders()),
      'Content-Type': 'application/json'
    };
    const res = await fetch(`${API_URL}/trips/${tripId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(patch)
    });
    return handleResponse(res);
  },

  getTripDetails: async (tripId: string) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}/trips/${tripId}`, { headers });
    const trip = await handleResponse(res);

    // Backend now returns { ...trip, itineraryDays: [...], reservations: [...] }
    // We need to flatten the structure to match what the frontend expects:
    // { trip, days, activities, reservations }

    // Extract days and activities from trip structure
    const days = trip.itineraryDays || [];
    const reservations = trip.reservations || [];

    // Extract activities from days
    const activities = days.flatMap((day: any) =>
      (day.activities || []).map((activity: any) => ({
        ...activity,
        dayId: day.id // Ensure dayId is present
      }))
    );

    // Clean up trip object (remove nested data if needed, but UI might be tolerant)
    const { itineraryDays, reservations: _, ...tripData } = trip;

    return {
      trip: tripData as TripUI,
      days: days.map(({ activities, ...day }: any) => day) as ItineraryDay[],
      activities: activities as Activity[],
      reservations: reservations as Reservation[]
    };
  },

  deleteTrip: async (tripId: string): Promise<{ success: boolean }> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}/trips/${tripId}`, {
      method: 'DELETE',
      headers
    });
    await handleResponse(res);
    return { success: true };
  },

  // --- ACTIVITIES ---
  createActivity: async (payload: Omit<Activity, 'id' | 'createdAt' | 'updatedAt' | 'orderIndex'>): Promise<Activity> => {
    const headers = {
      ...(await getAuthHeaders()),
      'Content-Type': 'application/json'
    };
    const res = await fetch(`${API_URL}/activities`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  // --- RESERVATIONS ---
  createReservation: async (payload: Omit<Reservation, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<Reservation> => {
    const headers = {
      ...(await getAuthHeaders()),
      'Content-Type': 'application/json'
    };
    const res = await fetch(`${API_URL}/reservations`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...payload,
        status: 'confirmed' // Default status per implementation
      })
    });
    return handleResponse(res);
  },

  updateReservation: async (id: string, patch: Partial<Omit<Reservation, 'id' | 'tripId' | 'createdAt' | 'updatedAt'>>): Promise<Reservation> => {
    const headers = {
      ...(await getAuthHeaders()),
      'Content-Type': 'application/json'
    };
    const res = await fetch(`${API_URL}/reservations/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(patch)
    });
    return handleResponse(res);
  },

  deleteReservation: async (id: string): Promise<{ success: boolean }> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}/reservations/${id}`, {
      method: 'DELETE',
      headers
    });
    await handleResponse(res);
    return { success: true };
  },

  // --- PARTICIPANTS ---
  getParticipants: async (tripId: string): Promise<Participant[]> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}/trips/${tripId}/participants`, { headers });
    return handleResponse(res);
  },

  addParticipant: async (tripId: string, payload: { name: string, email?: string }): Promise<Participant> => {
    const headers = {
      ...(await getAuthHeaders()),
      'Content-Type': 'application/json'
    };
    const res = await fetch(`${API_URL}/trips/${tripId}/participants`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  removeParticipant: async (tripId: string, participantId: string): Promise<{ success: boolean }> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}/trips/${tripId}/participants/${participantId}`, {
      method: 'DELETE',
      headers
    });
    await handleResponse(res);
    return { success: true };
  },

  // --- EXPENSES ---
  getExpenses: async (tripId: string): Promise<Expense[]> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}/trips/${tripId}/expenses`, { headers });
    return handleResponse(res);
  },

  createExpense: async (tripId: string, payload: {
    title: string,
    amount: number,
    currency?: string,
    paidByParticipantId: string,
    participantIdsToSplit: string[],
    date?: string
  }): Promise<Expense> => {
    const headers = {
      ...(await getAuthHeaders()),
      'Content-Type': 'application/json'
    };
    const res = await fetch(`${API_URL}/trips/${tripId}/expenses`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  deleteExpense: async (tripId: string, expenseId: string): Promise<{ success: boolean }> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}/trips/${tripId}/expenses/${expenseId}`, {
      method: 'DELETE',
      headers
    });
    await handleResponse(res);
    return { success: true };
  },

  updateExpense: async (tripId: string, expenseId: string, payload: {
    title: string,
    amount: number,
    currency?: string,
    paidByParticipantId: string,
    participantIdsToSplit: string[],
    date?: string
  }): Promise<Expense> => {
    const headers = {
      ...(await getAuthHeaders()),
      'Content-Type': 'application/json'
    };
    const res = await fetch(`${API_URL}/trips/${tripId}/expenses/${expenseId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  getBalances: async (tripId: string): Promise<{
    balances: Record<string, number>,
    suggestedPayments: { from: string, to: string, amount: number, currency: string }[]
  }> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}/trips/${tripId}/expenses/balances`, { headers });
    return handleResponse(res);
  },

  // --- CHECKLIST ---
  getChecklist: async (tripId: string): Promise<ChecklistItem[]> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}/trips/${tripId}/checklist`, { headers });
    return handleResponse(res);
  },

  createChecklistItem: async (tripId: string, text: string): Promise<ChecklistItem> => {
    const headers = {
      ...(await getAuthHeaders()),
      'Content-Type': 'application/json'
    };
    const res = await fetch(`${API_URL}/trips/${tripId}/checklist`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ text })
    });
    return handleResponse(res);
  },

  toggleChecklistItem: async (id: string, isChecked: boolean): Promise<ChecklistItem> => {
    const headers = {
      ...(await getAuthHeaders()),
      'Content-Type': 'application/json'
    };
    const res = await fetch(`${API_URL}/checklist/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ isChecked })
    });
    return handleResponse(res);
  },

  deleteChecklistItem: async (id: string): Promise<{ success: boolean }> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}/checklist/${id}`, {
      method: 'DELETE',
      headers
    });
    await handleResponse(res);
    return { success: true };
  }
};