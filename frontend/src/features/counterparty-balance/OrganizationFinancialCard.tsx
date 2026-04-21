import React from 'react'; // Synced version 
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "../../components/ui/dialog";
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { formatMoney } from '../../components/ui/MoneyInput';
import { FileText, Banknote, Calendar, ChevronRight, Landmark, Trash2, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { deleteBalanceTransaction } from '../../api/sales';
import { toast } from 'sonner';

interface OrganizationFinancialCardProps {
    isOpen: boolean;
    onClose: () => void;
    organizationId: number;
    organizationName: string;
    currentBalance: number;
    onRefresh?: () => void;
}

export function OrganizationFinancialCard({ isOpen, onClose, organizationId, organizationName, currentBalance, onRefresh }: OrganizationFinancialCardProps) {
    const user = useAuthStore(state => state.user);
    const [isDeleting, setIsDeleting] = React.useState<number | null>(null);
    const canDelete = user?.role === 'accountant' || user?.role === 'admin' || user?.role === 'director' || user?.role === 'investor' || user?.role === 'head_of_orders';

    const { data: history = [], isLoading, refetch } = useQuery({
        queryKey: ['org-finance-history', organizationId],
        queryFn: async () => {
            const response = await api.get(`/sales/organizations/${organizationId}/finance-history`);
            return response.data;
        },
        enabled: isOpen
    });

    const handleDelete = async (e: React.MouseEvent, transactionId: number) => {
        e.stopPropagation();
        if (!window.confirm('Haqiqatan ham ushbu amalni bekor qilmoqchimisiz? Bu moliyaviy hisobotlarga ta’sir qiladi.')) return;

        setIsDeleting(transactionId);
        try {
            await deleteBalanceTransaction(transactionId);
            toast.success("Amal muvaffaqiyatli bekor qilindi");
            refetch();
            if (onRefresh) onRefresh();
        } catch (error: any) {
            console.error("Failed to delete transaction", error);
            const detail = error.response?.data?.detail || "Xatolik yuz berdi";
            toast.error(detail);
        } finally {
            setIsDeleting(null);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-4xl p-0 overflow-hidden rounded-[32px] border-none shadow-3xl bg-white">
                <DialogHeader className="p-8 bg-gradient-to-br from-slate-800 to-slate-900 text-white border-none">
                    <DialogTitle className="text-2xl font-black flex items-center gap-3">
                        <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
                            <Landmark className="w-6 h-6 text-white" />
                        </div>
                        Финансовая история: {organizationName}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col h-[70vh]">
                    {/* Header Stats */}
                    <div className="p-8 grid grid-cols-2 gap-6 bg-slate-50/50 border-b border-slate-100">
                        <div className="bg-white p-6 rounded-[24px] border border-slate-200/60 shadow-sm transition-all hover:shadow-md">
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-[0.2em] mb-2">Текущее сальдо</p>
                            <p className={`text-3xl font-black ${
                                currentBalance > 0 ? "text-emerald-600" :
                                currentBalance < 0 ? "text-rose-600" :
                                "text-slate-800"
                            }`}>
                                {formatMoney(currentBalance)} UZS
                            </p>
                            <p className="text-xs text-slate-500 mt-2 font-medium opacity-70">
                                {currentBalance > 0 ? "Средства на балансе (Кредиторка)" : 
                                 currentBalance < 0 ? "Общая задолженность (Дебиторка)" : 
                                 "Баланс нулевой"}
                            </p>
                        </div>
                        <div className="bg-white p-6 rounded-[24px] border border-slate-200/60 shadow-sm transition-all hover:shadow-md">
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-[0.2em] mb-2">Всего операций</p>
                            <p className="text-3xl font-black text-slate-800">{history.length}</p>
                            <p className="text-xs text-slate-500 mt-2 font-medium opacity-70">Записей в финансовой истории</p>
                        </div>
                    </div>

                    {/* History List */}
                    <div className="flex-1 overflow-y-auto p-8 space-y-5 sleek-scrollbar bg-white">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center h-full space-y-4">
                                <div className="w-10 h-10 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin" />
                                <p className="text-sm font-bold text-slate-400 animate-pulse uppercase tracking-widest">Загрузка данных...</p>
                            </div>
                        ) : history.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-40">
                                <div className="p-6 bg-slate-50 rounded-full">
                                    <Calendar className="w-12 h-12 text-slate-300" />
                                </div>
                                <p className="text-lg font-bold text-slate-400">История операций пока пуста</p>
                            </div>
                        ) : (
                            history.map((item: any) => {
                                const isTopup = item.transaction_type === 'topup';
                                const isApplication = item.transaction_type === 'application';
                                const isOverpayment = item.transaction_type === 'overpayment';
                                const isAdjustment = item.transaction_type === 'adjustment';
                                
                                // Amount is positive for credit (topup, overpayment), negative for debit (application)
                                const isPositive = item.amount > 0;
                                
                                return (
                                    <div 
                                        key={item.id}
                                        className="group relative flex items-start gap-5 p-5 rounded-[24px] border border-slate-100 bg-white hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 transform hover:-translate-y-0.5"
                                    >
                                        <div className={`p-4 rounded-2xl shrink-0 transition-all group-hover:scale-110 ${
                                            isApplication ? "bg-rose-50 text-rose-500 border border-rose-100/50" : 
                                            isTopup ? "bg-indigo-50 text-indigo-500 border border-indigo-100/50" :
                                            "bg-emerald-50 text-emerald-500 border border-emerald-100/50"
                                        }`}>
                                            {isApplication ? <FileText className="w-6 h-6" /> : 
                                             isTopup ? <Landmark className="w-6 h-6" /> :
                                             <Banknote className="w-6 h-6" />}
                                        </div>
                                        
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-4 mb-1.5">
                                                <h4 className="font-black text-slate-800 text-base">
                                                    {isTopup ? "Пополнение баланса" : 
                                                     isApplication ? "Погашение долга (Списание)" :
                                                     isOverpayment ? "Переплата (Остаток)" :
                                                     "Корректировка"}
                                                </h4>
                                                <span className={`text-xl font-black shrink-0 tabular-nums ${
                                                    isPositive ? "text-emerald-600" : "text-rose-600"
                                                }`}>
                                                    {isPositive ? "+" : ""}{formatMoney(item.amount)}
                                                </span>
                                            </div>
                                            
                                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-bold uppercase tracking-wider">
                                                <div className="flex items-center text-slate-400">
                                                    <Calendar className="w-3.5 h-3.5 mr-2 opacity-50" />
                                                    {new Date(item.created_at).toLocaleDateString('ru-RU', {
                                                        day: 'numeric', month: 'long', year: 'numeric',
                                                        hour: '2-digit', minute: '2-digit'
                                                    })}
                                                </div>
                                                {item.factura_number && (
                                                    <a 
                                                        href={`/invoices?inv_num=${item.factura_number}`}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            window.location.href = `/invoices?inv_num=${item.factura_number}`;
                                                        }}
                                                        className="flex items-center text-indigo-600 hover:text-indigo-800 transition-colors bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-100"
                                                    >
                                                        <FileText className="w-3 h-3 mr-1.5 opacity-70" />
                                                        <span>Счёт: {item.factura_number}</span>
                                                    </a>
                                                )}
                                            </div>
                                            
                                            {item.comment && (
                                                <div className="mt-3 p-3 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                                                    <p className="text-sm text-slate-600 font-medium leading-relaxed italic">
                                                        "{item.comment}"
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 self-center">
                                            {canDelete && (
                                                <button 
                                                    onClick={(e) => handleDelete(e, item.id)}
                                                    disabled={isDeleting === item.id}
                                                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-rose-500 bg-rose-50 hover:bg-rose-100 border border-rose-100 transition-all shadow-sm hover:shadow-md active:scale-95"
                                                    title="Bekor qilish"
                                                >
                                                    {isDeleting === item.id ? (
                                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <>
                                                            <Trash2 className="w-4 h-4" />
                                                            <span className="text-[10px] font-black uppercase tracking-widest transition-all">Bekor qilish</span>
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                            <div className="text-slate-300">
                                                <ChevronRight className="w-6 h-6" />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
