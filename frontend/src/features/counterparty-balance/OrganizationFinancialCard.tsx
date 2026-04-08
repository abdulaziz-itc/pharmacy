import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "../../components/ui/dialog";
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { formatMoney } from '../../components/ui/MoneyInput';
import { FileText, Banknote, Calendar, ChevronRight, Landmark } from 'lucide-react';

interface OrganizationFinancialCardProps {
    isOpen: boolean;
    onClose: () => void;
    organizationId: number;
    organizationName: string;
    currentBalance: number;
}

export function OrganizationFinancialCard({ isOpen, onClose, organizationId, organizationName, currentBalance }: OrganizationFinancialCardProps) {
    const { data: history = [], isLoading } = useQuery({
        queryKey: ['org-finance-history', organizationId],
        queryFn: async () => {
            const response = await api.get(`/sales/organizations/${organizationId}/finance-history`);
            return response.data;
        },
        enabled: isOpen
    });

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
                        {/* ... (rest of the content) ... */}
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
                                const isInvoice = item.type === 'invoice';
                                const isTopup = item.type === 'topup';
                                
                                return (
                                    <div 
                                        key={`${item.type}-${item.id}`}
                                        className="group relative flex items-start gap-5 p-5 rounded-[24px] border border-slate-100 bg-white hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 transform hover:-translate-y-0.5"
                                    >
                                        <div className={`p-4 rounded-2xl shrink-0 transition-all group-hover:scale-110 ${
                                            isInvoice ? "bg-rose-50 text-rose-500 border border-rose-100/50" : 
                                            isTopup ? "bg-indigo-50 text-indigo-500 border border-indigo-100/50" :
                                            "bg-emerald-50 text-emerald-500 border border-emerald-100/50"
                                        }`}>
                                            {isInvoice ? <FileText className="w-6 h-6" /> : 
                                             isTopup ? <Landmark className="w-6 h-6" /> :
                                             <Banknote className="w-6 h-6" />}
                                        </div>
                                        
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-4 mb-1.5">
                                                <h4 className="font-black text-slate-800 text-base">
                                                    {isInvoice ? "Реализация (Счет-фактура)" : 
                                                     isTopup ? "Пополнение баланса" :
                                                     "Поступление (Платеж)"}
                                                </h4>
                                                <span className={`text-xl font-black shrink-0 tabular-nums ${
                                                    isInvoice ? "text-rose-600" : "text-emerald-600"
                                                }`}>
                                                    {isInvoice ? "-" : "+"}{formatMoney(item.amount)}
                                                </span>
                                            </div>
                                            
                                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-bold uppercase tracking-wider">
                                                <div className="flex items-center text-slate-400">
                                                    <Calendar className="w-3.5 h-3.5 mr-2 opacity-50" />
                                                    {new Date(item.date).toLocaleDateString('ru-RU', {
                                                        day: 'numeric', month: 'long', year: 'numeric',
                                                        hour: '2-digit', minute: '2-digit'
                                                    })}
                                                </div>
                                                {item.reference && (
                                                    <div className="flex items-center text-indigo-500 font-mono">
                                                        <span className="opacity-50 mr-1.5">REF_ID:</span>
                                                        <span className="bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100/50">{item.reference}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {item.description && (
                                                <div className="mt-3 p-3 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                                                    <p className="text-sm text-slate-600 font-medium leading-relaxed italic">
                                                        "{item.description}"
                                                    </p>
                                                </div>
                                            )}
                                            
                                            {isInvoice && item.status === 'paid' && (
                                                <div className="mt-3 inline-flex items-center text-[9px] font-black text-white bg-emerald-500 px-3 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-emerald-500/20">
                                                    Оплачено
                                                </div>
                                            )}
                                        </div>

                                        <div className="self-center opacity-0 group-hover:opacity-100 transition-all translate-x-1 group-hover:translate-x-0">
                                            <ChevronRight className="w-6 h-6 text-slate-300" />
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
