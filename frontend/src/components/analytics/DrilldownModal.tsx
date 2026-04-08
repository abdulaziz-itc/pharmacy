import React, { useState } from 'react';
import { 
    X, 
    Download, 
    ChevronLeft, 
    ChevronRight,
    Search,
    Loader2
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { formatMoney } from '../ui/MoneyInput';

interface DrilldownModalProps {
    isOpen: boolean;
    onClose: () => void;
    metric: string;
    metricLabel: string;
    filters: any;
}

const formatCurrency = (val: number) => {
    return formatMoney(val) + ' UZS';
};

export const DrilldownModal: React.FC<DrilldownModalProps> = ({ 
    isOpen, 
    onClose, 
    metric, 
    metricLabel, 
    filters 
}) => {
    const [page, setPage] = useState(0);
    const limit = 50;

    const { data: rows, isLoading, isError } = useQuery({
        queryKey: ['drilldown', metric, filters, page],
        queryFn: async () => {
            const res = await api.get('/domain/analytics/stats/comprehensive/drilldown', {
                params: {
                    metric,
                    ...filters,
                    skip: page * limit,
                    limit: limit
                }
            });
            return res.data;
        },
        enabled: isOpen && !!metric
    });

    if (!isOpen) return null;

    const isBonusMetric = ['bonus_accrued', 'bonus_paid', 'preinvest'].includes(metric);

    const renderTable = () => {
        if (isLoading) return (
            <div className="p-8 space-y-6">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex gap-4 animate-pulse">
                        <div className="h-12 bg-slate-200 rounded-2xl flex-1" />
                        <div className="h-12 bg-slate-100 rounded-2xl flex-1" />
                        <div className="h-12 bg-slate-50 rounded-2xl flex-1" />
                    </div>
                ))}
            </div>
        );

        if (isError) return (
            <div className="flex items-center justify-center h-64 text-rose-500 font-bold uppercase tracking-widest text-xs">
                Ошибка при загрузке данных
            </div>
        );

        if (!rows || rows.length === 0) return (
            <div className="flex items-center justify-center h-64 text-slate-400 font-bold uppercase tracking-widest text-xs">
                Нет данных для отображения
            </div>
        );

        // ── Bonus metrics: special layout showing payment source ──
        if (isBonusMetric) {
            return (
                <div className="overflow-x-auto sleek-scrollbar">
                    <table className="w-full text-left border-separate border-spacing-0">
                        <thead>
                            <tr>
                                {['Дата', 'Регион', 'Сумма бонуса', 'Поступление (оплата)', 'Фактура', 'Контрагент', 'Мед. Представитель', 'Врач', 'Продукт', 'Описание'].map(h => (
                                    <th key={h} className="sticky top-0 bg-slate-50/90 backdrop-blur-md p-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 z-20 whitespace-nowrap">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {rows.map((row: any, idx: number) => (
                                <motion.tr
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.015 }}
                                    key={row.id || idx}
                                    className="hover:bg-indigo-50/50 transition-colors group cursor-default"
                                >
                                    <td className="p-5 text-sm font-bold text-slate-500 whitespace-nowrap">
                                        {format(new Date(row.date), 'dd.MM.yyyy HH:mm')}
                                    </td>
                                    <td className="p-5 text-sm font-bold text-slate-700 whitespace-nowrap">
                                        {row.region || '—'}
                                    </td>
                                    <td className="p-5">
                                        <span className="inline-flex items-center px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 font-black text-sm">
                                            {formatCurrency(Number(row.amount))}
                                        </span>
                                    </td>
                                    {/* Payment source — the key column */}
                                    <td className="p-5">
                                        {row.payment ? (
                                            <div className="space-y-0.5">
                                                <p className="text-sm font-black text-indigo-700">
                                                    {formatCurrency(Number(row.payment.payment_amount))}
                                                </p>
                                                <p className="text-[10px] text-slate-400 font-bold">
                                                    {row.payment.payment_date ? format(new Date(row.payment.payment_date), 'dd.MM.yyyy') : '—'}
                                                </p>
                                            </div>
                                        ) : (
                                            <span className="text-slate-300 text-xs font-bold">—</span>
                                        )}
                                    </td>
                                    <td className="p-5 text-sm font-bold text-slate-700 whitespace-nowrap">
                                        {row.invoice?.factura_number || '—'}
                                    </td>
                                    <td className="p-5 text-sm font-bold text-slate-700">
                                        {row.invoice?.customer || '—'}
                                    </td>
                                    <td className="p-5 text-sm text-slate-600 font-semibold">
                                        {row.med_rep !== '-' ? row.med_rep : '—'}
                                    </td>
                                    <td className="p-5 text-sm text-slate-600 font-semibold">
                                        {row.doctor !== '-' ? row.doctor : '—'}
                                    </td>
                                    <td className="p-5 text-sm text-slate-600 font-semibold">
                                        {row.product !== '-' ? row.product : '—'}
                                    </td>
                                    <td className="p-5 text-xs text-slate-400 font-medium max-w-[200px] truncate" title={row.description}>
                                        {row.description !== '-' ? row.description : '—'}
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
        }

        // ── Generic metrics: auto-render all columns ──
        const columnLabels: Record<string, string> = {
            date: 'Дата',
            amount: 'Сумма',
            invoice_num: '№ Фактуры',
            customer: 'Контрагент',
            type: 'Тип',
            med_rep: 'Мед. Представитель',
            product: 'Продукт',
            month: 'Месяц',
            year: 'Год',
            qty: 'Кол-во',
            total_amount: 'Общая сумма',
            paid_amount: 'Оплачено',
            debt_amount: 'Задолженность',
            category: 'Категория',
            description: 'Описание',
            author: 'Автор',
            doctor: 'Врач',
            paid_ratio: 'Оплата %',
            profit: 'Прибыль',
            region: 'Регион',
            realization_date: 'Дата реализации',
            delay_days: 'Просрочка (дни)'
        };

        // Determine columns from first row + potential delay_days
        const baseColumns = Object.keys(rows[0]).filter(k => k !== 'id' && typeof rows[0][k] !== 'object' && k !== 'realization_date');
        const displayColumns = metric === 'receivables' ? [...baseColumns, 'delay_days'] : baseColumns;

        return (
            <div className="overflow-x-auto sleek-scrollbar">
                <table className="w-full text-left border-separate border-spacing-0">
                    <thead>
                        <tr>
                            {displayColumns.map(col => (
                                <th key={col} className="sticky top-0 bg-slate-50/90 backdrop-blur-md p-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 z-20 whitespace-nowrap">
                                    {columnLabels[col] || col}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {rows.map((row: any, idx: number) => {
                            const effectiveDate = new Date(row.realization_date || row.date);
                            const delayDays = Math.max(0, Math.floor((new Date().getTime() - effectiveDate.getTime()) / (1000 * 60 * 60 * 24)));
                            const isOverdueLine = metric === 'receivables' && delayDays > 30;
                            
                            const rowWithDelay = { ...row };
                            if (metric === 'receivables') rowWithDelay.delay_days = delayDays;

                            return (
                                <motion.tr
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.015 }}
                                    key={row.id || idx}
                                    className={`${isOverdueLine 
                                        ? 'bg-rose-50 hover:bg-rose-100 ring-1 ring-inset ring-rose-200' 
                                        : 'hover:bg-indigo-50/50'} transition-colors group cursor-default`}
                                >
                                    {displayColumns.map(col => {
                                        let val = rowWithDelay[col];
                                        if (col === 'date' || col === 'realization_date') val = format(new Date(val), 'dd.MM.yyyy');
                                        if (['amount', 'total_amount', 'paid_amount', 'debt_amount', 'profit'].includes(col)) {
                                            val = formatCurrency(Number(val));
                                        }
                                        if (col === 'paid_ratio') val = val + '%';
                                        
                                        if (col === 'delay_days') {
                                            return (
                                                <td key={col} className="p-5">
                                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${val > 30 ? 'bg-rose-500 text-white shadow-md shadow-rose-200 animate-pulse' : 'bg-emerald-100 text-emerald-700'}`}>
                                                        {val} kun
                                                    </span>
                                                </td>
                                            );
                                        }
                                        
                                        return (
                                            <td key={col} className={`p-5 text-sm font-black transition-colors ${isOverdueLine ? 'text-rose-900' : 'text-slate-700 group-hover:text-indigo-900'}`}>
                                                {val}
                                            </td>
                                        );
                                    })}
                                </motion.tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl" 
                        onClick={onClose} 
                    />
                    
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="bg-white/95 w-full max-w-6xl h-[85vh] rounded-[4rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] relative z-10 flex flex-col overflow-hidden border border-white/40"
                    >
                        {/* Header */}
                        <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-white/50 backdrop-blur-sm">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-200">
                                    <Search className="w-8 h-8 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">{metricLabel}</h2>
                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] italic">Детализация данных из базы • Real-time stats</p>
                                </div>
                            </div>
                            
                            <button 
                                onClick={onClose}
                                className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all duration-300 group shadow-inner"
                            >
                                <X className="w-8 h-8 group-hover:rotate-90 transition-transform duration-300" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-hidden flex flex-col p-8">
                            <div className="flex-1 bg-white rounded-[3rem] border border-slate-100 shadow-inner overflow-hidden flex flex-col">
                                <div className="flex-1 overflow-y-auto sleek-scrollbar">
                                    {renderTable()}
                                </div>
                            </div>
                        </div>

                        {/* Footer / Pagination */}
                        <div className="p-10 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 backdrop-blur-sm">
                            <div className="flex items-center gap-4">
                                <div className="px-5 py-2.5 bg-white rounded-2xl border border-slate-100 text-slate-500 text-xs font-black uppercase tracking-widest shadow-sm">
                                    {(rows?.length || 0)} записей
                                </div>
                                <div className="hidden md:block w-px h-8 bg-slate-200" />
                                <p className="hidden md:block text-slate-400 text-[10px] font-bold uppercase tracking-wider italic">Лимит: {limit} на страницу</p>
                            </div>
                            
                            <div className="flex items-center gap-4">
                                <button 
                                    disabled={page === 0}
                                    onClick={() => setPage(p => p - 1)}
                                    className="w-14 h-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-indigo-50 hover:border-indigo-100 hover:text-indigo-600 transition-all shadow-sm active:scale-90"
                                >
                                    <ChevronLeft className="w-6 h-6" />
                                </button>
                                <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex flex-col items-center justify-center text-white shadow-2xl shadow-indigo-200">
                                    <span className="text-xs font-black leading-none">{page + 1}</span>
                                    <span className="text-[8px] font-black uppercase tracking-tighter opacity-60">Str</span>
                                </div>
                                <button 
                                    disabled={!rows || rows.length < limit}
                                    onClick={() => setPage(p => p + 1)}
                                    className="w-14 h-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-indigo-50 hover:border-indigo-100 hover:text-indigo-600 transition-all shadow-sm active:scale-90"
                                >
                                    <ChevronRight className="w-6 h-6" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
