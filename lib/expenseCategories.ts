export interface ExpenseCategory {
    value: string;
    label: string;
    emoji: string;
    color: string;
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
    { value: 'food', label: 'Alimentação', emoji: '🍽️', color: '#f97316' },
    { value: 'lodging', label: 'Hospedagem', emoji: '🏨', color: '#6366f1' },
    { value: 'transport', label: 'Transporte', emoji: '✈️', color: '#3b82f6' },
    { value: 'entertainment', label: 'Entretenimento', emoji: '🎭', color: '#ec4899' },
    { value: 'shopping', label: 'Compras', emoji: '🛍️', color: '#a855f7' },
    { value: 'health', label: 'Saúde', emoji: '🏥', color: '#22c55e' },
    { value: 'communication', label: 'Comunicação', emoji: '📱', color: '#14b8a6' },
    { value: 'taxes', label: 'Taxas/Impostos', emoji: '📄', color: '#64748b' },
    { value: 'other', label: 'Outros', emoji: '🎁', color: '#78716c' },
];

export const getCategoryByValue = (value?: string | null): ExpenseCategory | undefined => {
    if (!value) return undefined;
    return EXPENSE_CATEGORIES.find(c => c.value === value);
};
