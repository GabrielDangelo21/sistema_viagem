import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Expense, Participant } from '../types';
import { EXPENSE_CATEGORIES, getCategoryByValue } from '../lib/expenseCategories';
import { FinanceCharts } from './FinanceCharts';
import { AuditTimeline } from './AuditTimeline';
import { Receipt, Scale, PieChart, Activity } from 'lucide-react';

interface FinanceModuleProps {
    tripId: string;
    tripDefaultCurrency?: string;
    tripBudget?: number | null;
}

export const FinanceModule: React.FC<FinanceModuleProps> = ({ tripId, tripDefaultCurrency, tripBudget }) => {
    const [activeTab, setActiveTab] = useState<'expenses' | 'balances' | 'summary' | 'history'>('expenses');
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [balances, setBalances] = useState<Record<string, number>>({});
    const [suggestedPayments, setSuggestedPayments] = useState<any[]>([]);
    const [participants, setParticipants] = useState<Participant[]>([]);

    // New Expense Form State
    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState(tripDefaultCurrency || 'BRL');
    const [paidBy, setPaidBy] = useState('');
    const [splitWith, setSplitWith] = useState<string[]>([]);
    const [category, setCategory] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadData();
        loadParticipants();
    }, [tripId]);

    const loadData = async () => {
        try {
            const expData = await api.getExpenses(tripId);
            setExpenses(expData);

            const balData = await api.getBalances(tripId);
            setBalances(balData.balances);
            setSuggestedPayments(balData.suggestedPayments);
        } catch (e) {
            console.error(e);
        }
    };

    const loadParticipants = async () => {
        try {
            const data = await api.getParticipants(tripId);
            setParticipants(data);
            setSplitWith(data.map(p => p.id));
            if (data.length > 0) setPaidBy(data[0].id);
        } catch (e) {
            console.error(e);
        }
    };

    const [editingId, setEditingId] = useState<string | null>(null);

    const handleCreateOrUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !amount || !paidBy || splitWith.length === 0) return;
        setLoading(true);
        try {
            const payload = {
                title,
                amount: parseFloat(amount),
                currency,
                paidByParticipantId: paidBy,
                participantIdsToSplit: splitWith,
                date: new Date().toISOString(),
                category: category || undefined,
            };

            if (editingId) {
                const original = expenses.find(e => e.id === editingId);
                await api.updateExpense(tripId, editingId, {
                    ...payload,
                    date: original?.date
                });
            } else {
                await api.createExpense(tripId, payload);
            }

            resetForm();
            await loadData();
        } catch (e) {
            alert('Erro ao salvar despesa');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (exp: Expense) => {
        setEditingId(exp.id);
        setTitle(exp.title);
        setAmount(exp.amount.toString());
        setCurrency(exp.currency);
        setPaidBy(exp.paidByParticipantId);
        setCategory(exp.category || '');
        if (exp.shares) {
            setSplitWith(exp.shares.map(s => s.participantId));
        } else {
            setSplitWith([]);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta despesa?')) return;
        try {
            await api.deleteExpense(tripId, id);
            await loadData();
        } catch (e) {
            alert('Erro ao excluir despesa');
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setTitle('');
        setAmount('');
        setCurrency(tripDefaultCurrency || 'BRL');
        setCategory('');
        if (participants.length > 0) setPaidBy(participants[0].id);
        setSplitWith(participants.map(p => p.id));
    };

    const toggleSplit = (id: string) => {
        setSplitWith(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const toggleAllSplit = () => {
        if (splitWith.length === participants.length) {
            setSplitWith([]);
        } else {
            setSplitWith(participants.map(p => p.id));
        }
    };

    const tabs = [
        { key: 'expenses' as const, label: 'Gastos', icon: Receipt },
        { key: 'balances' as const, label: 'Saldos & Acertos', icon: Scale },
        { key: 'summary' as const, label: 'Resumo', icon: PieChart },
        { key: 'history' as const, label: 'Histórico', icon: Activity },
    ];

    return (
        <div className="bg-white dark:bg-slate-900 shadow rounded-lg p-6 mt-6 border border-transparent dark:border-slate-800 transition-colors">
            <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6 overflow-x-auto no-scrollbar">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-4 py-2 mr-2 font-medium whitespace-nowrap flex items-center gap-2 transition-colors ${activeTab === tab.key ? 'border-b-2 border-teal-600 text-teal-700 dark:text-teal-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'expenses' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Form */}
                    <div className="lg:col-span-1">
                        <form onSubmit={handleCreateOrUpdate} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700/50 sticky top-4 transition-colors">
                            <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white">
                                {editingId ? 'Editar Gasto' : 'Novo Gasto'}
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">O que?</label>
                                    <input className="w-full border border-slate-300 dark:border-slate-700 p-2 rounded bg-transparent dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none placeholder:text-slate-400 transition-colors" placeholder="Ex: Jantar" value={title} onChange={e => setTitle(e.target.value)} required />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Categoria</label>
                                    <select
                                        className="w-full border border-slate-300 dark:border-slate-700 p-2 rounded bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none transition-colors"
                                        value={category}
                                        onChange={e => setCategory(e.target.value)}
                                    >
                                        <option value="">Sem categoria</option>
                                        {EXPENSE_CATEGORIES.map(cat => (
                                            <option key={cat.value} value={cat.value}>{cat.emoji} {cat.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Quanto?</label>
                                    <div className="flex gap-2">
                                        <select
                                            className="border border-slate-300 dark:border-slate-700 p-2 rounded bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none w-24 transition-colors"
                                            value={currency}
                                            onChange={e => setCurrency(e.target.value)}
                                        >
                                            <option value="BRL">BRL (R$)</option>
                                            <option value="USD">USD ($)</option>
                                            <option value="EUR">EUR (€)</option>
                                            <option value="GBP">GBP (£)</option>
                                        </select>
                                        <input
                                            className="flex-1 min-w-0 border border-slate-300 dark:border-slate-700 p-2 rounded bg-transparent dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none placeholder:text-slate-400 transition-colors"
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            value={amount}
                                            onChange={e => setAmount(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Quem pagou?</label>
                                    <select className="w-full border border-slate-300 dark:border-slate-700 p-2 rounded bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none transition-colors" value={paidBy} onChange={e => setPaidBy(e.target.value)}>
                                        {participants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Dividir com:</label>
                                        <button type="button" onClick={toggleAllSplit} className="text-xs text-teal-600 dark:text-teal-400 hover:underline">Todos/Nenhum</button>
                                    </div>
                                    <div className="max-h-40 overflow-y-auto border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 p-2 transition-colors">
                                        {participants.map(p => (
                                            <label key={p.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 rounded px-1 transition-colors">
                                                <input type="checkbox" checked={splitWith.includes(p.id)} onChange={() => toggleSplit(p.id)} className="rounded border-slate-300 dark:border-slate-700 text-teal-600 focus:ring-teal-500 dark:bg-slate-800" />
                                                <span className="text-sm dark:text-slate-200">{p.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button type="submit" disabled={loading} className="flex-1 mt-4 bg-teal-600 text-white py-2 rounded font-bold hover:bg-teal-700 disabled:opacity-50 transition-colors">
                                    {loading ? 'Salvando...' : (editingId ? 'Atualizar' : 'Salvar')}
                                </button>
                                {editingId && (
                                    <button type="button" onClick={resetForm} className="mt-4 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                        Cancelar
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>

                    {/* List */}
                    <div className="lg:col-span-2">
                        <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white">Histórico de Gastos</h3>
                        <ul className="space-y-3">
                            {expenses.map(exp => {
                                const cat = getCategoryByValue(exp.category);
                                return (
                                    <li key={exp.id} className="flex justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm hover:shadow-md dark:shadow-none dark:hover:border-slate-700 transition-all items-center">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <p className="font-bold text-slate-900 dark:text-white text-lg truncate">{exp.title}</p>
                                                {cat && (
                                                    <span
                                                        className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                                                        style={{ backgroundColor: cat.color + '20', color: cat.color }}
                                                    >
                                                        {cat.emoji} {cat.label}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                                Pago por <span className="font-medium text-slate-700 dark:text-slate-300">{exp.paidBy?.name || 'Desconhecido'}</span> &bull; {new Date(exp.date).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-4 shrink-0">
                                            <span className="font-bold text-xl text-teal-700 dark:text-teal-400">
                                                {exp.currency} {exp.amount.toFixed(2)}
                                            </span>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleEdit(exp)} className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" title="Editar">
                                                    ✏️
                                                </button>
                                                <button onClick={() => handleDelete(exp.id)} className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors" title="Excluir">
                                                    🗑️
                                                </button>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                            {expenses.length === 0 && (
                                <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
                                    <p className="text-slate-500 dark:text-slate-400">Nenhum gasto registrado ainda.</p>
                                    <p className="text-slate-400 dark:text-slate-500 text-sm">Use o formulário para adicionar o primeiro.</p>
                                </div>
                            )}
                        </ul>
                    </div>
                </div>
            )}

            {activeTab === 'balances' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white">Saldos Líquidos</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Quanto cada um deve ou tem a receber no total.</p>
                        <ul className="space-y-3">
                            {participants.map(p => {
                                const val = balances[p.id] || 0;
                                if (Math.abs(val) < 0.01) return null;
                                return (
                                    <li key={p.id} className={`p-4 rounded-lg border flex justify-between items-center transition-colors ${val > 0 ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900/50' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/50'}`}>
                                        <span className="font-bold text-slate-900 dark:text-white">{p.name}</span>
                                        <span className={`font-bold ${val > 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                                            {val > 0 ? `Recebe R$ ${val.toFixed(2)}` : `Deve R$ ${Math.abs(val).toFixed(2)}`}
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white">Sugestão de Acertos</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">A forma mais eficiente de quitar todas as dívidas.</p>
                        <ul className="space-y-3">
                            {suggestedPayments.map((pay, i) => (
                                <li key={i} className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/50 rounded-lg flex items-center gap-2 flex-wrap transition-colors">
                                    <span className="font-bold text-slate-900 dark:text-white">{pay.from}</span>
                                    <span className="text-slate-500 dark:text-slate-400 text-sm">paga</span>
                                    <span className="font-bold text-teal-700 dark:text-teal-400 bg-white dark:bg-slate-900 px-2 py-1 rounded border border-teal-200 dark:border-teal-900/50 shadow-sm">R$ {pay.amount.toFixed(2)}</span>
                                    <span className="text-slate-500 dark:text-slate-400 text-sm">para</span>
                                    <span className="font-bold text-slate-900 dark:text-white">{pay.to}</span>
                                </li>
                            ))}
                            {suggestedPayments.length === 0 && (
                                <div className="text-center py-8 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-900/50 transition-colors">
                                    <p className="text-green-700 dark:text-green-400 font-bold">✨ Tudo quitado!</p>
                                    <p className="text-green-600 dark:text-green-500 text-sm">Ninguém deve nada para ninguém.</p>
                                </div>
                            )}
                        </ul>
                    </div>
                </div>
            )}

            {activeTab === 'summary' && (
                <FinanceCharts
                    expenses={expenses}
                    participants={participants}
                    tripBudget={tripBudget}
                    tripCurrency={tripDefaultCurrency || 'BRL'}
                />
            )}

            {activeTab === 'history' && (
                <div className="animate-in slide-in-from-bottom-2 duration-300">
                    <AuditTimeline tripId={tripId} />
                </div>
            )}
        </div>
    );
};
