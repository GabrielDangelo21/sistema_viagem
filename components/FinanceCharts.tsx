import React from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { EXPENSE_CATEGORIES, getCategoryByValue } from '../lib/expenseCategories';
import { Expense, Participant } from '../types';
import { useTheme } from '../contexts/ThemeContext';

interface FinanceChartsProps {
    expenses: Expense[];
    participants: Participant[];
    tripBudget?: number | null;
    tripCurrency?: string;
    compact?: boolean;
}

const UNCATEGORIZED_COLOR = '#d1d5db';

export const FinanceCharts: React.FC<FinanceChartsProps> = ({ expenses, participants, tripBudget, tripCurrency = 'BRL', compact = false }) => {
    const { actualTheme } = useTheme();
    const isDark = actualTheme === 'dark';
    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

    const tooltipStyle = {
        borderRadius: '12px',
        border: `1px solid ${isDark ? '#1e293b' : '#e5e7eb'}`,
        backgroundColor: isDark ? '#0f172a' : '#ffffff',
        color: isDark ? '#f8fafc' : '#111827',
        fontSize: '13px'
    };

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
            <div className={`text-center ${compact ? 'py-6' : 'py-16'}`}>
                <p className="text-slate-400 dark:text-slate-500 text-lg">📊</p>
                <p className="text-slate-500 dark:text-slate-400 mt-2">Adicione gastos para visualizar o resumo financeiro.</p>
            </div>
        );
    }

    return (
        <div className={compact ? "space-y-4" : "space-y-8"}>
            {/* Top Row: Gauge + Donut */}
            <div className={`grid grid-cols-1 ${compact ? 'lg:grid-cols-2' : 'md:grid-cols-2'} gap-4 md:gap-6`}>
                {/* Budget Gauge */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 transition-colors">
                    <h3 className="font-bold text-slate-800 dark:text-white mb-1 text-base">Orçamento</h3>
                    {tripBudget && tripBudget > 0 ? (
                        <>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
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
                                            <Cell fill={isDark ? '#1e293b' : '#f1f5f9'} />
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="text-center -mt-28 mb-16">
                                <span className="text-3xl font-bold" style={{ color: gaugeColor }}>
                                    {budgetPct.toFixed(0)}%
                                </span>
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">utilizado</p>
                            </div>
                            {totalSpent > tripBudget && (
                                <div className="mt-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-xs font-bold rounded-lg p-2 text-center border border-red-100 dark:border-red-900/50">
                                    ⚠️ Orçamento excedido em {tripCurrency} {(totalSpent - tripBudget).toFixed(2)}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <p className="text-slate-400 dark:text-slate-500 text-sm">Nenhum orçamento definido.</p>
                            <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
                                Edite a viagem para adicionar um orçamento previsto.
                            </p>
                            <div className="mt-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 w-full">
                                <p className="text-slate-700 dark:text-slate-300 font-bold text-lg">{tripCurrency} {totalSpent.toFixed(2)}</p>
                                <p className="text-slate-400 dark:text-slate-500 text-xs">Total gasto até agora</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Category Donut */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 transition-colors">
                    <h3 className="font-bold text-slate-800 dark:text-white mb-4 text-base">Gastos por Categoria</h3>
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
                                    stroke={isDark ? '#0f172a' : '#fff'}
                                >
                                    {donutData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: number) => [`${tripCurrency} ${value.toFixed(2)}`, '']}
                                    contentStyle={tooltipStyle}
                                    itemStyle={{ color: isDark ? '#f8fafc' : '#111827' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    {/* Legend */}
                    <div className="mt-4 space-y-2 max-h-36 overflow-y-auto custom-scrollbar pr-2">
                        {donutData.map((item, i) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                    <span className="text-slate-600 dark:text-slate-400">{item.emoji} {item.name}</span>
                                </div>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">{tripCurrency} {item.value.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Category Progress Bars */}
            {!compact && tripBudget && tripBudget > 0 && categoryBars.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 transition-colors">
                    <h3 className="font-bold text-slate-800 dark:text-white mb-4 text-base">Impacto por Categoria no Orçamento</h3>
                    <div className="space-y-3">
                        {categoryBars.map(cat => (
                            <div key={cat.value}>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm text-slate-600 dark:text-slate-400">{cat.emoji} {cat.label}</span>
                                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-500">
                                        {tripCurrency} {cat.spent.toFixed(2)} ({cat.pct.toFixed(1)}%)
                                    </span>
                                </div>
                                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
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
            {!compact && barData.length > 1 && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 transition-colors">
                    <h3 className="font-bold text-slate-800 dark:text-white mb-4 text-base">Gastos por Participante</h3>
                    <ResponsiveContainer width="100%" height={barData.length * 50 + 40}>
                        <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
                            <XAxis type="number" hide />
                            <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 13, fill: isDark ? '#94a3b8' : '#475569' }} axisLine={false} tickLine={false} />
                            <Tooltip
                                formatter={(value: number) => [`${tripCurrency} ${value.toFixed(2)}`, 'Total Pago']}
                                contentStyle={tooltipStyle}
                                itemStyle={{ color: isDark ? '#f8fafc' : '#111827' }}
                                cursor={{ fill: isDark ? '#1e293b' : '#f1f5f9' }}
                            />
                            <Bar dataKey="total" fill="#14b8a6" radius={[0, 8, 8, 0]} barSize={24} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
};
