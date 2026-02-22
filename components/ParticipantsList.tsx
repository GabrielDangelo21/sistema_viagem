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
    const [inviteLink, setInviteLink] = useState('');
    const [generatingInvite, setGeneratingInvite] = useState(false);

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

    const handleGenerateInvite = async () => {
        setGeneratingInvite(true);
        setInviteLink('');
        try {
            const result = await api.createInvite(tripId, 'editor');
            const link = `${window.location.origin}/?invite=${result.token}`;
            setInviteLink(link);
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Erro ao gerar convite');
        } finally {
            setGeneratingInvite(false);
        }
    };

    const copyInviteLink = async () => {
        if (!inviteLink) return;
        try {
            await navigator.clipboard.writeText(inviteLink);
            alert('Link copiado para a área de transferência!');
        } catch (err) {
            console.error('Failed to copy', err);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-900 shadow rounded-lg p-6 border border-transparent dark:border-slate-800 transition-colors">
            <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-white">Participantes</h2>
            <ul className="space-y-3 mb-6">
                {participants.map(p => (
                    <li key={p.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-100 dark:border-slate-700/50 transition-colors">
                        <div>
                            <p className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                {p.name}
                                {p.role === 'owner' && <span className="text-xs bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300 px-2 py-0.5 rounded-full">Organizador</span>}
                                {p.role === 'editor' && <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-full">Editor</span>}
                                {p.role === 'viewer' && <span className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-300 px-2 py-0.5 rounded-full">Leitor</span>}
                            </p>
                            {p.email && <p className="text-sm text-slate-500 dark:text-slate-400">{p.email}</p>}
                        </div>
                        {p.role !== 'owner' && (
                            <button onClick={() => handleRemove(p.id)} className="text-red-500 hover:text-red-700 dark:hover:text-red-400 text-sm font-medium transition-colors">Remover</button>
                        )}
                    </li>
                ))}
                {participants.length === 0 && <p className="text-slate-500 dark:text-slate-400 italic">Nenhum participante adicionado.</p>}
            </ul>

            <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2 mb-4">
                <input
                    type="text"
                    placeholder="Nome"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className="flex-1 border border-slate-300 dark:border-slate-700 bg-transparent dark:text-white p-2 rounded focus:ring-2 focus:ring-teal-500 focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors"
                    required
                />
                <input
                    type="email"
                    placeholder="Email (opcional)"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    className="flex-1 border border-slate-300 dark:border-slate-700 bg-transparent dark:text-white p-2 rounded focus:ring-2 focus:ring-teal-500 focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors"
                />
                <button type="submit" disabled={loading} className="bg-teal-600 text-white px-4 py-2 rounded hover:bg-teal-700 disabled:opacity-50 transition-colors">
                    {loading ? '...' : 'Adicionar'}
                </button>
            </form>

            <div className="mt-8 border-t border-slate-200 dark:border-slate-800 pt-6">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">Convidar via Link Mágico</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Gere um link temporário (7 dias) para outras pessoas entrarem na viagem. Todos convidados por link serão adicionados como Editores.</p>
                <div className="flex gap-2 items-center">
                    <button
                        onClick={handleGenerateInvite}
                        disabled={generatingInvite}
                        className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 px-4 py-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors whitespace-nowrap"
                    >
                        {generatingInvite ? 'Gerando...' : 'Gerar Link de Convite'}
                    </button>
                </div>

                {inviteLink && (
                    <div className="mt-4 p-3 bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-900/50 rounded flex flex-col gap-2">
                        <p className="text-sm text-slate-700 dark:text-teal-400 font-medium">Link de Convite Gerado:</p>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                readOnly
                                value={inviteLink}
                                className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-2 rounded text-sm text-slate-600 dark:text-slate-300 truncate"
                            />
                            <button
                                onClick={copyInviteLink}
                                className="bg-teal-600 text-white px-3 py-2 rounded hover:bg-teal-700 transition"
                            >
                                Copiar
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
