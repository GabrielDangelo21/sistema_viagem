import React from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { EXPENSE_CATEGORIES, getCategoryByValue } from '../lib/expenseCategories';
import { Expense, Participant } from '../types';

interface FinanceChartsProps {
    expenses: Expense[];
    participants: Participant[];
    tripBudget?: number | null;
    tripCurrency?: string;
}

const UNCATEGORIZED_COLOR = '#d1d5db';

export const FinanceCharts: React.FC<FinanceChartsProps> = ({ expenses, participants, tripBudget, tripCurrency = 'BRL' }) => {
    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

    // --- Category Donut Data ---
    const categoryMap: Record<string, number> = {};
    expenses.forEach(e => {
        const key = e.category || 'uncategorized';
        categoryMap[key] = (categoryMap[key] || 0) + e.amount;
    });
    const donutData = Object.entries(categoryMap).map(([key, value]) => {
        const cat = getCategoryByValue(key);
        return {
            name: cat?.label || 'Sem Categoria',
            value: Number(value.toFixed(2)),
            color: cat?.color || UNCATEGORIZED_COLOR,
            emoji: cat?.emoji || '❓'
        };
    }).sort((a, b) => b.value - a.value);

    // --- Participant Bar Data ---
    const participantSpending: Record<string, number> = {};
    expenses.forEach(e => {
        participantSpending[e.paidByParticipantId] = (participantSpending[e.paidByParticipantId] || 0) + e.amount;
    });
    const barData = participants.map(p => ({
        name: p.name.split(' ')[0],
        total: Number((participantSpending[p.id] || 0).toFixed(2)),
    })).filter(d => d.total > 0).sort((a, b) => b.total - a.total);

    // --- Budget Gauge ---
    const budgetPct = tripBudget && tripBudget > 0 ? Math.min((totalSpent / tripBudget) * 100, 100) : 0;
    const gaugeColor = budgetPct < 70 ? '#22c55e' : budgetPct < 90 ? '#f59e0b' : '#ef4444';
    const remaining = tripBudget ? Math.max(tripBudget - totalSpent, 0) : 0;
    const gaugeData = tripBudget && tripBudget > 0
        ? [
            { name: 'Gasto', value: Math.min(totalSpent, tripBudget) },
            { name: 'Restante', value: remaining }
        ]
        : [];

    // --- Category Progress Bars ---
    const categoryBars = EXPENSE_CATEGORIES.filter(cat => categoryMap[cat.value]).map(cat => ({
        ...cat,
        spent: categoryMap[cat.value] || 0,
        pct: tripBudget && tripBudget > 0 ? ((categoryMap[cat.value] || 0) / tripBudget) * 100 : 0
    })).sort((a, b) => b.spent - a.spent);

    if (expenses.length === 0) {
        return (
            <div className="text-center py-16">
                <p className="text-gray-400 text-lg">📊</p>
                <p className="text-gray-500 mt-2">Adicione gastos para visualizar o resumo financeiro.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Top Row: Gauge + Donut */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Budget Gauge */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h3 className="font-bold text-gray-800 mb-1 text-base">Orçamento</h3>
                    {tripBudget && tripBudget > 0 ? (
                        <>
                            <p className="text-xs text-gray-400 mb-4">
                                {tripCurrency} {totalSpent.toFixed(2)} de {tripCurrency} {tripBudget.toFixed(2)}
                            </p>
                            <div className="flex justify-center">
                                <ResponsiveContainer width={200} height={200}>
                                    <PieChart>
                                        <Pie
                                            data={gaugeData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={65}
                                            outerRadius={85}
                                            startAngle={90}
                                            endAngle={-270}
                                            dataKey="value"
                                            strokeWidth={0}
                                        >
                                            <Cell fill={gaugeColor} />
                                            <Cell fill="#f1f5f9" />
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="text-center -mt-28 mb-16">
                                <span className="text-3xl font-bold" style={{ color: gaugeColor }}>
                                    {budgetPct.toFixed(0)}%
                                </span>
                                <p className="text-xs text-gray-400 mt-1">utilizado</p>
                            </div>
                            {totalSpent > tripBudget && (
                                <div className="mt-2 bg-red-50 text-red-700 text-xs font-bold rounded-lg p-2 text-center border border-red-100">
                                    ⚠️ Orçamento excedido em {tripCurrency} {(totalSpent - tripBudget).toFixed(2)}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <p className="text-gray-400 text-sm">Nenhum orçamento definido.</p>
                            <p className="text-gray-400 text-xs mt-1">
                                Edite a viagem para adicionar um orçamento previsto.
                            </p>
                            <div className="mt-4 bg-gray-50 rounded-xl p-4 w-full">
                                <p className="text-gray-700 font-bold text-lg">{tripCurrency} {totalSpent.toFixed(2)}</p>
                                <p className="text-gray-400 text-xs">Total gasto até agora</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Category Donut */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h3 className="font-bold text-gray-800 mb-4 text-base">Gastos por Categoria</h3>
                    <div className="flex justify-center">
                        <ResponsiveContainer width={200} height={200}>
                            <PieChart>
                                <Pie
                                    data={donutData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={55}
                                    outerRadius={85}
                                    dataKey="value"
                                    strokeWidth={2}
                                    stroke="#fff"
                                >
                                    {donutData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: number) => [`${tripCurrency} ${value.toFixed(2)}`, '']}
                                    contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '13px' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    {/* Legend */}
                    <div className="mt-4 space-y-2 max-h-36 overflow-y-auto">
                        {donutData.map((item, i) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                    <span className="text-gray-600">{item.emoji} {item.name}</span>
                                </div>
                                <span className="font-semibold text-gray-800">{tripCurrency} {item.value.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Category Progress Bars */}
            {tripBudget && tripBudget > 0 && categoryBars.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h3 className="font-bold text-gray-800 mb-4 text-base">Impacto por Categoria no Orçamento</h3>
                    <div className="space-y-3">
                        {categoryBars.map(cat => (
                            <div key={cat.value}>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm text-gray-600">{cat.emoji} {cat.label}</span>
                                    <span className="text-xs font-semibold text-gray-500">
                                        {tripCurrency} {cat.spent.toFixed(2)} ({cat.pct.toFixed(1)}%)
                                    </span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2">
                                    <div
                                        className="h-2 rounded-full transition-all duration-500"
                                        style={{ width: `${Math.min(cat.pct, 100)}%`, backgroundColor: cat.color }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Participant Spending Bars */}
            {barData.length > 1 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h3 className="font-bold text-gray-800 mb-4 text-base">Gastos por Participante</h3>
                    <ResponsiveContainer width="100%" height={barData.length * 50 + 40}>
                        <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
                            <XAxis type="number" hide />
                            <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 13, fill: '#374151' }} />
                            <Tooltip
                                formatter={(value: number) => [`${tripCurrency} ${value.toFixed(2)}`, 'Total Pago']}
                                contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '13px' }}
                            />
                            <Bar dataKey="total" fill="#14b8a6" radius={[0, 8, 8, 0]} barSize={24} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
};
