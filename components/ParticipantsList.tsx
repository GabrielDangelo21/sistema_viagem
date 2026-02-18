import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Participant } from '../types';

interface ParticipantsListProps {
    tripId: string;
}

export const ParticipantsList: React.FC<ParticipantsListProps> = ({ tripId }) => {
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [newName, setNewName] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadParticipants();
    }, [tripId]);

    const loadParticipants = async () => {
        try {
            const data = await api.getParticipants(tripId);
            setParticipants(data);
        } catch (error) {
            console.error('Failed to load participants', error);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName) return;
        setLoading(true);
        try {
            await api.addParticipant(tripId, { name: newName, email: newEmail || undefined });
            setNewName('');
            setNewEmail('');
            await loadParticipants();
        } catch (error) {
            alert('Erro ao adicionar participante');
        } finally {
            setLoading(false);
        }
    };

    const handleRemove = async (id: string) => {
        if (!confirm('Tem certeza?')) return;
        try {
            await api.removeParticipant(tripId, id);
            await loadParticipants();
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Erro ao remover participante');
        }
    };

    return (
        <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Participantes</h2>
            <ul className="space-y-3 mb-6">
                {participants.map(p => (
                    <li key={p.id} className="flex justify-between items-center p-3 bg-gray-50 rounded border border-gray-100">
                        <div>
                            <p className="font-semibold text-gray-900">{p.name} {p.isOwner && <span className="text-xs bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full ml-2">Organizador</span>}</p>
                            {p.email && <p className="text-sm text-gray-500">{p.email}</p>}
                        </div>
                        {!p.isOwner && (
                            <button onClick={() => handleRemove(p.id)} className="text-red-500 hover:text-red-700 text-sm font-medium">Remover</button>
                        )}
                    </li>
                ))}
                {participants.length === 0 && <p className="text-gray-500 italic">Nenhum participante adicionado.</p>}
            </ul>

            <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2">
                <input
                    type="text"
                    placeholder="Nome"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className="flex-1 border border-gray-300 p-2 rounded focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    required
                />
                <input
                    type="email"
                    placeholder="Email (opcional)"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    className="flex-1 border border-gray-300 p-2 rounded focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
                <button type="submit" disabled={loading} className="bg-teal-600 text-white px-4 py-2 rounded hover:bg-teal-700 disabled:opacity-50 transition-colors">
                    {loading ? 'Adicionando...' : 'Adicionar'}
                </button>
            </form>
        </div>
    );
};
