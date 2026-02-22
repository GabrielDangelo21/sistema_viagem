import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { AuditLog } from '../types';
import { Loader2, Activity as ActivityIcon } from 'lucide-react';
import { EmptyState } from './UI';

interface AuditTimelineProps {
    tripId: string;
}

export const AuditTimeline: React.FC<AuditTimelineProps> = ({ tripId }) => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadLogs();
    }, [tripId]);

    const loadLogs = async () => {
        setLoading(true);
        try {
            const data = await api.getAuditLog(tripId);
            setLogs(data);
        } catch (err) {
            console.error('Failed to load audit logs', err);
        } finally {
            setLoading(false);
        }
    };

    const getLogMessage = (log: AuditLog) => {
        const userDisplay = log.user?.name || log.user?.email || 'Sistema';
        const metadataStr = log.metadata ? ` ( ${JSON.stringify(log.metadata)} )` : '';
        switch (log.action) {
            case 'trip_created': return `${userDisplay} criou a viagem`;
            case 'trip_updated': return `${userDisplay} atualizou detalhes da viagem`;
            case 'trip_deleted': return `${userDisplay} excluiu a viagem`;
            case 'activity_created': return `${userDisplay} adicionou uma atividade${metadataStr}`;
            case 'activity_updated': return `${userDisplay} atualizou uma atividade${metadataStr}`;
            case 'activity_deleted': return `${userDisplay} removeu uma atividade${metadataStr}`;
            case 'reservation_created': return `${userDisplay} criou uma reserva${metadataStr}`;
            case 'reservation_updated': return `${userDisplay} modificou uma reserva${metadataStr}`;
            case 'reservation_deleted': return `${userDisplay} excluiu uma reserva${metadataStr}`;
            case 'expense_created': return `${userDisplay} adicionou um gasto${metadataStr}`;
            case 'expense_deleted': return `${userDisplay} removeu um gasto${metadataStr}`;
            case 'participant_added': return `${userDisplay} adicionou um participante${metadataStr}`;
            case 'participant_removed': return `${userDisplay} removeu um participante${metadataStr}`;
            case 'invite_generated': return `${userDisplay} gerou um link de convite${metadataStr}`;
            case 'invite_accepted': return `${userDisplay} entrou na viagem por um link de convite`;
            default: return `${userDisplay} realizou ação: ${log.action}`;
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-10">
                <Loader2 className="animate-spin text-teal-600" />
            </div>
        );
    }

    if (logs.length === 0) {
        return (
            <EmptyState
                icon={ActivityIcon}
                title="Histórico Vazio"
                description="Nenhuma atividade recente encontrada."
            />
        );
    }

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-6">Histórico de Atividades</h3>
            <div className="relative border-l border-gray-200 ml-3 space-y-6">
                {logs.map((log) => (
                    <div key={log.id} className="relative pl-6">
                        <span className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-teal-500 ring-4 ring-white" />
                        <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-900 leading-snug">
                                {getLogMessage(log)}
                            </span>
                            <span className="text-xs text-gray-500 mt-1">
                                {new Date(log.createdAt).toLocaleString('pt-BR')}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
