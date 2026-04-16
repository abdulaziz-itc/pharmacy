import React, { useState } from 'react';
import { PageContainer } from '../../components/PageContainer';
import { 
    TrendingUp, 
    TrendingDown, 
    Plus, 
    DollarSign,
    PieChart,
    Trash2,
    Landmark
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Badge } from '../../components/ui/badge';
import { DataTable } from '../../components/ui/data-table';
import type { ColumnDef } from '@tanstack/react-table';
import { DrilldownModal } from '../../components/analytics/DrilldownModal';
import { motion, AnimatePresence } from 'framer-motion';
import { PremiumKpiCard } from '../../components/analytics/PremiumKpiCard';
import { MoneyInput } from '../../components/ui/MoneyInput';

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
    const [drilldownMetric, setDrilldownMetric] = useState<{ id: string, label: string } | null>(null);

    // Filter States
    const [selectedMonth, setSelectedMonth] = useState<number | undefined>(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState<number | undefined>(new Date().getFullYear());
    const [selectedQuarter, setSelectedQuarter] = useState<number | undefined>(undefined);
    const [selectedRegion, setSelectedRegion] = useState<string>("all");
    const [selectedProduct, setSelectedProduct] = useState<string>("all");
    const [selectedMedRep, setSelectedMedRep] = useState<string>("all");
    const [selectedPM, setSelectedPM] = useState<string>("all");

    // Fetch Reference Data for Filters
    const { data: regions = [] } = useQuery({
        queryKey: ['regions'],
        queryFn: async () => {
            const res = await api.get('/crm/regions/');
            return Array.isArray(res.data) ? res.data : (res.data?.items || []);
        }
    });

    const { data: products = [] } = useQuery({
        queryKey: ['products'],
        queryFn: async () => {
            const res = await api.get('/products/', { params: { limit: 1000 } });
            return Array.isArray(res.data) ? res.data : (res.data?.items || []);
        }
    });

    const { data: usersData = [] } = useQuery({
        queryKey: ['users-filter'],
        queryFn: async () => {
            const res = await api.get('/users/', { params: { limit: 1000 } });
            return Array.isArray(res.data) ? res.data : (res.data?.items || []);
        }
    });

    const medReps = usersData.filter((u: any) => u.role === 'med_rep');
    const productManagers = usersData.filter((u: any) => u.role === 'product_manager');

    // Fetch Stats
    const { data: stats } = useQuery({
        queryKey: ['finance-stats', selectedMonth, selectedYear, selectedQuarter, selectedRegion, selectedProduct, selectedMedRep, selectedPM],
        queryFn: async () => {
            const params: any = {};
            if (selectedMonth) params.month = selectedMonth;
            if (selectedYear) params.year = selectedYear;
            if (selectedQuarter) params.quarter = selectedQuarter;
            if (selectedRegion && selectedRegion !== 'all') params.region_id = parseInt(selectedRegion);
            if (selectedProduct && selectedProduct !== 'all') params.product_id = parseInt(selectedProduct);
            if (selectedMedRep && selectedMedRep !== 'all') params.med_rep_id = parseInt(selectedMedRep);
            if (selectedPM && selectedPM !== 'all') params.product_manager_id = parseInt(selectedPM);

            const res = await api.get('/domain/analytics/stats/comprehensive', { params });
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

    const deleteExpenseMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/finance/expenses/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            queryClient.invalidateQueries({ queryKey: ['finance-stats'] });
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
            cell: ({ row }) => {
                const d = row.original.date;
                if (!d) return <span className="text-slate-400">—</span>;
                try {
                    return <span className="font-medium text-slate-600">{format(new Date(d), 'dd MMMM yyyy', { locale: ru })}</span>
                } catch (e) {
                    return <span className="text-slate-400">{d}</span>;
                }
            }
        },
        {
            accessorKey: 'category.name',
            header: 'Категория',
            cell: ({ row }) => <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">{row.original.category?.name || 'Без категории'}</Badge>
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
        },
        {
            id: 'actions',
            header: '',
            cell: ({ row }) => (
                <button
                    onClick={() => {
                        if (window.confirm("Haqiqatan ham ushbu xarajatni o'chirmoqchimisiz?")) {
                            deleteExpenseMutation.mutate(row.original.id);
                        }
                    }}
                    className="p-2 text-slate-400 hover:text-rose-600 transition-colors rounded-lg hover:bg-rose-50"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            )
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

            {/* Comprehensive Filter Bar */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm mb-8 flex flex-wrap gap-4 items-center">
                <div className="flex flex-col space-y-1 flex-1 min-w-[140px]">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Регион</p>
                    <select 
                        value={selectedRegion} 
                        onChange={(e) => setSelectedRegion(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-black text-slate-700 outline-none focus:ring-4 focus:ring-violet-100 transition-all cursor-pointer"
                    >
                        <option value="all">Все регионы</option>
                        {regions.map((r: any) => (<option key={r.id} value={r.id.toString()}>{r.name}</option>))}
                    </select>
                </div>
                
                <div className="flex flex-col space-y-1 flex-1 min-w-[140px]">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Продукт</p>
                    <select 
                        value={selectedProduct} 
                        onChange={(e) => setSelectedProduct(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-black text-slate-700 outline-none focus:ring-4 focus:ring-violet-100 transition-all cursor-pointer"
                    >
                        <option value="all">Все продукты</option>
                        {products.map((p: any) => (<option key={p.id} value={p.id.toString()}>{p.name}</option>))}
                    </select>
                </div>

                <div className="flex flex-col space-y-1 flex-1 min-w-[140px]">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Квартал</p>
                    <select 
                        value={selectedQuarter || ""}
                        onChange={(e) => {
                            setSelectedQuarter(e.target.value ? parseInt(e.target.value) : undefined);
                            if (e.target.value) setSelectedMonth(undefined);
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-black text-slate-700 outline-none focus:ring-4 focus:ring-violet-100 transition-all cursor-pointer"
                    >
                        <option value="">Все кварталы</option>
                        <option value="1">1 Квартал</option>
                        <option value="2">2 Квартал</option>
                        <option value="3">3 Квартал</option>
                        <option value="4">4 Квартал</option>
                    </select>
                </div>

                <div className="flex flex-col space-y-1 flex-1 min-w-[140px]">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Месяц</p>
                    <select 
                        value={selectedMonth || ""} 
                        onChange={(e) => {
                            setSelectedMonth(e.target.value ? parseInt(e.target.value) : undefined);
                            if (e.target.value) setSelectedQuarter(undefined);
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-black text-slate-700 outline-none focus:ring-4 focus:ring-violet-100 transition-all cursor-pointer"
                    >
                        <option value="">Все месяцы</option>
                        {['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'].map((m, i) => (
                            <option key={i+1} value={i+1}>{m}</option>
                        ))}
                    </select>
                </div>



                <div className="flex flex-col space-y-1 flex-1 min-w-[140px]">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Год</p>
                    <select 
                        value={selectedYear || ""} 
                        onChange={(e) => setSelectedYear(e.target.value ? parseInt(e.target.value) : undefined)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-black text-slate-700 outline-none focus:ring-4 focus:ring-violet-100 transition-all cursor-pointer"
                    >
                        <option value="">Все годы</option>
                        {[2024, 2025, 2026, 2027].map(y => (<option key={y} value={y}>{y}</option>))}
                    </select>
                </div>

                <div className="flex flex-col space-y-1 flex-1 min-w-[140px]">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">PM (Менеджер)</p>
                    <select 
                        value={selectedPM} 
                        onChange={(e) => setSelectedPM(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-black text-slate-700 outline-none focus:ring-4 focus:ring-violet-100 transition-all cursor-pointer"
                    >
                        <option value="all">Все PM</option>
                        {productManagers.map((u: any) => (<option key={u.id} value={u.id.toString()}>{u.full_name || u.username}</option>))}
                    </select>
                </div>

                <div className="flex flex-col space-y-1 flex-1 min-w-[140px]">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Мед. Представитель</p>
                    <select 
                        value={selectedMedRep} 
                        onChange={(e) => setSelectedMedRep(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-black text-slate-700 outline-none focus:ring-4 focus:ring-violet-100 transition-all cursor-pointer"
                    >
                        <option value="all">Все представители</option>
                        {medReps.map((u: any) => (<option key={u.id} value={u.id.toString()}>{u.full_name || u.username}</option>))}
                    </select>
                </div>
                
                <div className="flex flex-col space-y-1">
                     <p className="text-[10px] font-black text-slate-400 opacity-0 uppercase tracking-widest">Action</p>
                     <button
                        onClick={() => {
                            setSelectedMonth(undefined);
                            setSelectedYear(new Date().getFullYear());
                            setSelectedQuarter(undefined);
                            setSelectedRegion("all");
                            setSelectedProduct("all");
                            setSelectedMedRep("all");
                            setSelectedPM("all");
                        }}
                        className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black rounded-xl transition-all"
                     >
                        Сбросить
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
                            <form onSubmit={handleAddExpense} className="space-y-4">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label htmlFor="exp_amount" className="text-[10px] font-black text-slate-400 uppercase ml-2">Сумма (UZS)</label>
                                            <MoneyInput
                                                id="exp_amount"
                                                required
                                                value={amount}
                                                onChange={(val) => setAmount(val)}
                                                placeholder="0"
                                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-black outline-none focus:ring-4 focus:ring-violet-100 transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label htmlFor="exp_category" className="text-[10px] font-black text-slate-400 uppercase ml-2">Категория</label>
                                            <select id="exp_category" required value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-black outline-none focus:ring-4 focus:ring-violet-100 transition-all">
                                                <option value="">Выберите...</option>
                                                {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <label htmlFor="exp_comment" className="text-[10px] font-black text-slate-400 uppercase ml-2">Комментарий</label>
                                        <input id="exp_comment" type="text" placeholder="Tafsilotlarni kiriting..." value={comment} onChange={(e) => setComment(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-black outline-none focus:ring-4 focus:ring-violet-100 transition-all" />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end pt-2">
                                        <div className="space-y-2">
                                            <label htmlFor="exp_date" className="text-[10px] font-black text-slate-400 uppercase ml-2">Sana</label>
                                            <div className="relative group">
                                                <input 
                                                    id="exp_date" 
                                                    type="text" 
                                                    placeholder="YYYY-MM-DD"
                                                    onFocus={(e) => { e.target.type = 'date'; e.target.showPicker?.(); }}
                                                    onBlur={(e) => { e.target.type = 'text'; }}
                                                    value={expenseDate} 
                                                    onChange={(e) => setExpenseDate(e.target.value)} 
                                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-black outline-none focus:ring-4 focus:ring-violet-100 transition-all cursor-pointer" 
                                                />
                                            </div>
                                        </div>
                                        <button id="exp_submit" disabled={addExpenseMutation.isPending} className="w-full h-[52px] bg-violet-600 text-white rounded-2xl font-black shadow-lg shadow-violet-100 hover:bg-violet-700 transition-all active:scale-[0.98]">
                                            {addExpenseMutation.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
                                        </button>
                                    </div>
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
                                    <label htmlFor="cat_name" className="text-[10px] font-black text-slate-400 uppercase ml-2">Название категории</label>
                                    <input id="cat_name" required type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-black outline-none focus:ring-4 focus:ring-indigo-100 transition-all" />
                                </div>
                                <button disabled={addCategoryMutation.isPending} className="w-full h-14 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
                                    {addCategoryMutation.isPending ? 'Создание...' : 'Создать категорию'}
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            )}

            {/* KPI Section - Staggered Entrance */}
            <motion.div 
                initial="hidden"
                animate="show"
                variants={{
                    hidden: { opacity: 0 },
                    show: {
                        opacity: 1,
                        transition: { staggerChildren: 0.1 }
                    }
                }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
            >
                <PremiumKpiCard 
                    label="Поступления (Cash In)" 
                    value={stats?.sales_fact_received_amount || 0} 
                    icon={TrendingUp} 
                    color="blue"
                    badge="Реализовано"
                    onClick={() => {}}
                />
                <PremiumKpiCard 
                    label="Продажи (Факт)" 
                    value={stats?.total_amount || 0} 
                    icon={DollarSign} 
                    color="emerald"
                    badge="Всего"
                />
                <PremiumKpiCard 
                    label="Чистая Прибыль" 
                    value={stats?.net_profit} 
                    icon={PieChart} 
                    color="violet" 
                    subtitle="Итоговый результат"
                    badge="NET PROFIT"
                />
            </motion.div>

            {/* Financial Management Quick Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div 
                    onClick={() => window.location.href = '/counterparty-balance'}
                    className="group bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 flex items-center justify-between cursor-pointer hover:border-indigo-500/30 transition-all hover:-translate-y-1"
                >
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                            <Landmark className="w-7 h-7" />
                        </div>
                        <div>
                            <h4 className="text-xl font-black text-slate-800">Баланс контрагентов</h4>
                            <p className="text-sm font-medium text-slate-500">Управление авансами и долгами организаций</p>
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600">
                        <Plus className="w-5 h-5" />
                    </div>
                </div>

                <div 
                    onClick={() => window.location.href = '/kreditorka'}
                    className="group bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 flex items-center justify-between cursor-pointer hover:border-rose-500/30 transition-all hover:-translate-y-1"
                >
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 transition-colors group-hover:bg-rose-600 group-hover:text-white">
                            <Plus className="w-7 h-7" />
                        </div>
                        <div>
                            <h4 className="text-xl font-black text-slate-800">Кредиторка</h4>
                            <p className="text-sm font-medium text-slate-500">Реестр переплат по счетам-фактурам</p>
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-rose-50 group-hover:text-rose-600">
                        <Plus className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {drilldownMetric && (
                <DrilldownModal 
                    isOpen={!!drilldownMetric}
                    onClose={() => setDrilldownMetric(null)}
                    metric={drilldownMetric.id}
                    metricLabel={drilldownMetric.label}
                    filters={{
                        month: selectedMonth,
                        year: selectedYear,
                        quarter: selectedQuarter,
                        region_id: selectedRegion !== 'all' ? parseInt(selectedRegion) : undefined,
                        product_id: selectedProduct !== 'all' ? parseInt(selectedProduct) : undefined,
                        med_rep_id: selectedMedRep !== 'all' ? parseInt(selectedMedRep) : undefined,
                        product_manager_id: selectedPM !== 'all' ? parseInt(selectedPM) : undefined
                    }}
                />
            )}

            {/* Expenses Table */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-black text-slate-900 px-2">История расходов</h2>
                    <Badge variant="outline" className="px-4 py-1.5 rounded-xl border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                        Oxirgi o'zgarishlar
                    </Badge>
                </div>
                <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
                    {expensesLoading ? (
                        <div className="py-20 flex flex-col items-center gap-4">
                            <div className="w-12 h-12 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
                            <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Yuklanmoqda...</p>
                        </div>
                    ) : (
                        <DataTable columns={columns} data={expenses || []} />
                    )}
                </div>
            </div>
        </PageContainer>
    );
}

// Old KpiCard removed
