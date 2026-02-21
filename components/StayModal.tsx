import React, { useState, useEffect } from 'react';
import { Modal, Button } from './UI';
import { Stay } from '../types';

interface StayModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (stay: Partial<Stay>) => Promise<void>;
    stay?: Stay | null;
    tripStartDate: string;
    tripEndDate: string;
}

export const StayModal: React.FC<StayModalProps> = ({
    isOpen,
    onClose,
    onSave,
    stay,
    tripStartDate,
    tripEndDate
}) => {
    const [name, setName] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (stay) {
                setName(stay.name);
                setStartDate(stay.startDate);
                setEndDate(stay.endDate);
            } else {
                setName('');
                setStartDate(tripStartDate);
                setEndDate(tripEndDate);
            }
            setError(null);
            setIsSubmitting(false);
        }
    }, [isOpen, stay, tripStartDate, tripEndDate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!name.trim()) {
            setError('O nome da estadia é obrigatório.');
            return;
        }

        if (startDate > endDate) {
            setError('A data inicial não pode ser depois da data final.');
            return;
        }

        if (startDate < tripStartDate || endDate > tripEndDate) {
            setError(`A estadia deve estar dentro das datas da viagem (${tripStartDate} a ${tripEndDate}).`);
            return;
        }

        setIsSubmitting(true);
        try {
            await onSave({
                name: name.trim(),
                startDate,
                endDate
            });
            onClose();
        } catch (err: any) {
            setError(err.message || 'Erro ao salvar estadia.');
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={stay ? "Editar Estadia/Base" : "Nova Estadia/Base"}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nome da Estadia (Cidade, Região)
                    </label>
                    <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ex: Paris, Vale do Loire..."
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-shadow"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Data de Início
                        </label>
                        <input
                            type="date"
                            required
                            min={tripStartDate}
                            max={tripEndDate}
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-shadow"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Data de Fim
                        </label>
                        <input
                            type="date"
                            required
                            min={startDate || tripStartDate}
                            max={tripEndDate}
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-shadow"
                        />
                    </div>
                </div>

                <p className="text-xs text-gray-500 italic">
                    Os dias do seu roteiro serão agrupados automaticamente por estas estadias.
                </p>

                <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                    <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                        Cancelar
                    </Button>
                    <Button type="submit" loading={isSubmitting}>
                        Salvar
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
