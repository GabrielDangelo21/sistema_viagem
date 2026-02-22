import React, { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { RouteName } from '@/types';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';

interface AcceptInviteProps {
    token: string;
    onNavigate: (route: RouteName, params?: any) => void;
}

export const AcceptInvite: React.FC<AcceptInviteProps> = ({ token, onNavigate }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<{ message: string; tripId: string } | null>(null);

    useEffect(() => {
        if (!token) {
            setError('Token de convite não encontrado na URL.');
            setLoading(false);
            return;
        }
        accept();
    }, [token]);

    const accept = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await api.acceptInvite(token);
            setSuccess(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao aceitar convite.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center h-[50vh]">
                <Loader2 className="w-12 h-12 text-teal-600 animate-spin mb-4" />
                <p className="text-gray-600">Processando convite...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center h-[50vh]">
                <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
                <h2 className="text-xl font-bold text-gray-800 mb-2">Convite Inválido</h2>
                <p className="text-gray-600 mb-6 max-w-md">{error}</p>
                <button
                    onClick={() => onNavigate('trips')}
                    className="bg-brand-600 text-white px-6 py-2 rounded-lg hover:bg-brand-700 transition"
                >
                    Ir para Minhas Viagens
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center p-12 text-center h-[50vh]">
            <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Sucesso!</h2>
            <p className="text-gray-600 mb-6">{success?.message || 'Você entrou na viagem.'}</p>
            <button
                onClick={() => onNavigate('trip-details', { id: success?.tripId })}
                className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 transition"
            >
                Acessar Viagem
            </button>
        </div>
    );
};
