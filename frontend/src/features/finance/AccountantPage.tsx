import React, { useState, useEffect } from 'react';
import { PageContainer } from '../../components/PageContainer';
import { 
    Wallet, 
    TrendingUp, 
    TrendingDown, 
    Plus, 
    Search, 
    Calendar,
    MessageCircle,
    DollarSign,
    PieChart,
    ArrowDownRight,
    ArrowUpRight,
    FilterX
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Badge } from '../../components/ui/badge';
import { DataTable } from '../../components/ui/data-table';
import type { ColumnDef } from '@tanstack/react-table';

type Expense = {
    id: number;
    amount: number;
    date: string;
    comment: string;
    category: {
        id: number;
        name: string;
    };
    created_by: {
        full_name: string;
    };
};

type ExpenseCategory = {
    id: number;
    name: string;
};

export default function AccountantPage() {
    const queryClient = useQueryClient();
    const [isAddingExpense, setIsAddingExpense] = useState(false);
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    
    // Form States
    const [amount, setAmount] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [comment, setComment] = useState('');
    const [expenseDate, setExpenseDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [newCategoryName, setNewCategoryName] = useState('');

    // Fetch Stats
    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['finance-stats'],
        queryFn: async () => {
            const res = await api.get('/domain/analytics/stats/comprehensive', {
                params: { period: 'month', month: new Date().getMonth() + 1, year: new Date().getFullYear() }
            });
            return res.data.kpis;
        }
    });

    // Fetch Categories
    const { data: categories } = useQuery<ExpenseCategory[]>({
        queryKey: ['expense-categories'],
        queryFn: async () => {
            const res = await api.get('/finance/categories');
            return res.data;
        }
    });

    // Fetch Expenses
    const { data: expenses, isLoading: expensesLoading } = useQuery<Expense[]>({
        queryKey: ['expenses'],
        queryFn: async () => {
            const res = await api.get('/finance/expenses');
            return res.data;
        }
    });

    // Mutations
    const addExpenseMutation = useMutation({
        mutationFn: (data: any) => api.post('/finance/expenses', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            queryClient.invalidateQueries({ queryKey: ['finance-stats'] });
            setIsAddingExpense(false);
            setAmount('');
            setCategoryId('');
            setComment('');
        }
    });

    const addCategoryMutation = useMutation({
        mutationFn: (name: string) => api.post('/finance/categories', { name }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
            setIsAddingCategory(false);
            setNewCategoryName('');
        }
    });

    const handleAddExpense = (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !categoryId) return;
        addExpenseMutation.mutate({
            amount: parseFloat(amount),
            category_id: parseInt(categoryId),
            comment,
            date: expenseDate
        });
    };

    const handleAddCategory = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategoryName) return;
        addCategoryMutation.mutate(newCategoryName);
    };

    const formatCurrency = (val: any) => {
        const num = Number(val) || 0;
        return new Intl.NumberFormat('ru-RU').format(num) + ' UZS';
    };

    const columns: ColumnDef<Expense>[] = [
        {
            accessorKey: 'date',
            header: 'Дата',
            cell: ({ row }) => <span className="font-medium text-slate-600">{format(new Date(row.original.date), 'dd MMMM yyyy', { locale: ru })}</span>
        },
        {
            accessorKey: 'category.name',
            header: 'Категория',
            cell: ({ row }) => <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">{row.original.category.name}</Badge>
        },
        {
            accessorKey: 'amount',
            header: 'Сумма',
            cell: ({ row }) => <span className="font-black text-rose-600">-{formatCurrency(row.original.amount)}</span>
        },
        {
            accessorKey: 'comment',
            header: 'Комментарий',
            cell: ({ row }) => <span className="text-slate-500 italic max-w-xs block truncate">{row.original.comment || '—'}</span>
        }
    ];

    return (
        <PageContainer>
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                        Бухгалтерия
                        <div className="px-3 py-1 bg-violet-600 text-[10px] font-black text-white rounded-full tracking-widest uppercase">Admin Mode</div>
                    </h1>
                    <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Учёт расходов, Cash Flow и Финансовый аудит</p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setIsAddingCategory(!isAddingCategory)}
                        className="flex items-center gap-2 px-6 h-12 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold transition-all hover:bg-slate-50 active:scale-95 shadow-lg shadow-slate-100"
                    >
                        {isAddingCategory ? 'Отмена' : <><Plus className="w-5 h-5" /> Категория</>}
                    </button>
                    <button 
                        onClick={() => setIsAddingExpense(!isAddingExpense)}
                        className="flex items-center gap-2 px-6 h-12 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-violet-200"
                    >
                        {isAddingExpense ? 'Отмена' : <><Plus className="w-5 h-5" /> Добавить расход</>}
                    </button>
                </div>
            </div>

            {/* Forms Section */}
            {(isAddingExpense || isAddingCategory) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
                    {isAddingExpense && (
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-violet-100 border border-violet-50 space-y-6">
                            <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                                <Plus className="w-6 h-6 text-violet-600" /> Регистрация расхода
                            </h3>
                            <form onSubmit={handleAddExpense} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label htmlFor="exp_amount" className="text-[10px] font-black text-slate-400 uppercase ml-2">Сумма (UZS)</label>
                                    <input id="exp_amount" required type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-black outline-none focus:ring-4 focus:ring-violet-100 transition-all" />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="exp_category" className="text-[10px] font-black text-slate-400 uppercase ml-2">Категория</label>
                                    <select id="exp_category" required value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-black outline-none focus:ring-4 focus:ring-violet-100 transition-all">
                                        <option value="">Выберите...</option>
                                        {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label htmlFor="exp_comment" className="text-[10px] font-black text-slate-400 uppercase ml-2">Комментарий (Shu yerga yozing)</label>
                                    <input id="exp_comment" type="text" placeholder="Tafsilotlarni kiriting..." value={comment} onChange={(e) => setComment(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-black outline-none focus:ring-4 focus:ring-violet-100 transition-all" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Sana (Kalendar uchun bosing)</label>
                                    <input id="exp_date" type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-black outline-none focus:ring-4 focus:ring-violet-100 transition-all" />
                                </div>
                                <div className="flex items-end">
                                    <button id="exp_submit" disabled={addExpenseMutation.isPending} className="w-full h-14 bg-violet-600 text-white rounded-2xl font-black shadow-lg shadow-violet-100 hover:bg-violet-700 transition-all">
                                        {addExpenseMutation.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                    {isAddingCategory && (
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-indigo-100 border border-indigo-50 space-y-6">
                            <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                                <Plus className="w-6 h-6 text-indigo-600" /> Новая категория
                            </h3>
                            <form onSubmit={handleAddCategory} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Название категории</label>
                                    <input required type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-black outline-none focus:ring-4 focus:ring-indigo-100 transition-all" />
                                </div>
                                <button disabled={addCategoryMutation.isPending} className="w-full h-14 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
                                    {addCategoryMutation.isPending ? 'Создание...' : 'Создать категорию'}
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            )}

            {/* KPI Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <KpiCard 
                    label="Поступления (Cash In)" 
                    value={stats?.sales_fact_received_amount} 
                    icon={TrendingUp} 
                    color="emerald" 
                    subtitle="Всего денег поступило на счет"
                />
                <KpiCard 
                    label="Валовая Прибыль" 
                    value={stats?.gross_profit} 
                    icon={DollarSign} 
                    color="blue" 
                    subtitle="Доход минус себестоимость и МП-бонусы"
                    badge="Gross Profit"
                />
                <KpiCard 
                    label="Прочие Расходы" 
                    value={stats?.total_expenses} 
                    icon={TrendingDown} 
                    color="rose" 
                    subtitle="Аренда, налоги и офф. расходы"
                />
                <KpiCard 
                    label="Чистая Прибыль" 
                    value={stats?.net_profit} 
                    icon={PieChart} 
                    color="violet" 
                    subtitle="Итоговый финансовый результат"
                    badge="NET PROFIT"
                />
            </div>

            {/* Summary Statistics */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-slate-200/50 border border-slate-100 mb-8 overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                    <TrendingUp className="w-64 h-64 text-indigo-600" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
                    <div className="p-4 space-y-4">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Денежные обязательства</h4>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-500 text-sm font-bold">Дебиторская задолженность</span>
                            <span className="text-lg font-black text-slate-900">{formatCurrency(stats?.receivables)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-500 text-sm font-bold">Бонусный остаток (МП)</span>
                            <span className="text-lg font-black text-amber-600">{formatCurrency(stats?.bonus_balance)}</span>
                        </div>
                    </div>
                    <div className="p-4 space-y-4">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Анализ рентабельности</h4>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-500 text-sm font-bold">Рентабельность по валовой приб.</span>
                            <span className="text-lg font-black text-emerald-600">
                                {stats?.sales_fact_received_amount > 0 ? (stats.gross_profit / stats.sales_fact_received_amount * 100).toFixed(1) : 0}%
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Expenses Table */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-black text-slate-900 px-2">История расходов</h2>
                    <Badge variant="outline" className="px-4 py-1.5 rounded-xl border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                        Last 100 entries
                    </Badge>
                </div>
                <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
                    {expensesLoading ? (
                        <div className="py-20 flex flex-col items-center gap-4">
                            <div className="w-12 h-12 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
                            <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Загрузка данных...</p>
                        </div>
                    ) : (
                        <DataTable columns={columns} data={expenses || []} />
                    )}
                </div>
            </div>
        </PageContainer>
    );
}

function KpiCard({ label, value, icon: Icon, color, subtitle, badge }: any) {
    const colors: any = {
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        blue: 'bg-blue-50 text-blue-600 border-blue-100',
        rose: 'bg-rose-50 text-rose-600 border-rose-100',
        violet: 'bg-violet-50 text-violet-600 border-violet-100'
    };

    return (
        <div className="bg-white p-7 rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100 relative overflow-hidden group hover:shadow-2xl transition-all duration-500">
            <div className={`absolute top-0 right-0 w-32 h-32 ${colors[color].split(' ')[0]} rounded-full -mr-16 -mt-16 blur-3xl opacity-40 group-hover:scale-150 transition-transform duration-700`} />
            <div className="relative z-10 space-y-5">
                <div className={`w-14 h-14 rounded-2xl ${colors[color].split(' ')[0]} flex items-center justify-center border border-white shadow-sm`}>
                    <Icon className="w-7 h-7" />
                </div>
                <div>
                    <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">{label}</h3>
                    <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-2xl font-black text-slate-800 tracking-tighter">{(Number(value) || 0).toLocaleString()}</span>
                        <span className="text-[10px] font-bold text-slate-400">UZS</span>
                    </div>
                    <p className="text-slate-400 text-[10px] mt-2 font-medium">{subtitle}</p>
                    {badge && (
                        <div className="mt-4 inline-flex items-center px-3 py-1 bg-slate-900 text-white rounded-full text-[8px] font-black uppercase tracking-widest">
                            {badge}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
