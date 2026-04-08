import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "../../components/ui/dialog";
import { 
    Calendar, 
    User, 
    Building2, 
    Warehouse, 
    Package, 
    Layers, 
    FileText,
    Receipt,
    ExternalLink
} from 'lucide-react';
import { cn } from "../../lib/utils";
import { MedOrgDetailModal } from "../med-orgs/MedOrgDetailModal";
import { DoctorDetailModal } from "../med-reps/components/DoctorDetailModal";

interface ReservationDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    reservation: any | null;
}

export const ReservationDetailsModal: React.FC<ReservationDetailsModalProps> = ({
    isOpen,
    onClose,
    reservation
}) => {
    const [isMedOrgModalOpen, setIsMedOrgModalOpen] = React.useState(false);
    const [isDoctorModalOpen, setIsDoctorModalOpen] = React.useState(false);

    if (!reservation) return null;

    const items = reservation.items || [];
    // Subtotal based on base price sent from frontend/stored in backend
    const subtotal = items.reduce((acc: number, item: any) => acc + ((item.price || 0) * item.quantity), 0);
    const ndsPercent = reservation.nds_percent || 12;
    const ndsAmount = subtotal * (ndsPercent / 100);
    const totalAmount = subtotal + ndsAmount;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[700px] p-0 border-0 shadow-3xl rounded-[32px] overflow-hidden bg-white">
                <DialogHeader className="relative p-0 h-40 flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-800">
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
                        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
                    </div>
                    <div className="relative z-10 flex flex-col items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-2xl">
                            <Receipt className="w-7 h-7 text-white" />
                        </div>
                        <DialogTitle className="text-2xl font-black text-white text-center tracking-tight px-4">
                            Детали бронирования #{reservation.id}
                        </DialogTitle>
                        <div className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/10 text-[10px] font-black text-white uppercase tracking-widest">
                            {reservation.status === 'pending' ? 'Ожидает одобрения' : 
                             reservation.status === 'approved' ? 'Подтверждено' : 
                             reservation.status === 'confirmed' ? 'Подтверждено' : 
                             reservation.status === 'cancelled' ? 'Отменено' : reservation.status}
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {/* Primary Info Grid */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-xl bg-slate-50 text-slate-400">
                                    <Calendar className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Дата создания</p>
                                    <p className="text-sm font-bold text-slate-700">
                                        {new Date(reservation.date || reservation.created_at).toLocaleDateString('ru-RU', {
                                            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                        })}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-xl bg-slate-50 text-slate-400">
                                    <User className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Создал</p>
                                    <p className="text-sm font-bold text-slate-700">
                                        {reservation.created_by?.full_name || reservation.created_by?.username || '—'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-xl bg-slate-50 text-slate-400">
                                    <Building2 className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Получатель</p>
                                    <button 
                                        onClick={() => {
                                            if (reservation.med_org) setIsMedOrgModalOpen(true);
                                            else if (reservation.doctor) setIsDoctorModalOpen(true);
                                        }}
                                        className={cn(
                                            "text-sm font-bold text-slate-700 flex items-center gap-2 transition-all group/link",
                                            (reservation.med_org || reservation.doctor) ? "hover:text-blue-600 cursor-pointer" : "cursor-default"
                                        )}
                                    >
                                        {reservation.med_org?.name || reservation.doctor?.full_name || reservation.customer_name || 'Не указан'}
                                        {(reservation.med_org || reservation.doctor) && (
                                            <ExternalLink className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-xl bg-slate-50 text-slate-400">
                                    <Warehouse className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Сklad отгрузки</p>
                                    <p className="text-sm font-bold text-slate-700">
                                        {reservation.warehouse?.name || 'Основной склад'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Products Table */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-slate-400" />
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Состав заказа</h3>
                        </div>
                        
                        <div className="rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50/50">
                                    <tr>
                                        <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Препарат</th>
                                        <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Кол-во</th>
                                        <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Цена</th>
                                        <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Промо</th>
                                        <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Сумма</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {items.map((item: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                                            <td className="px-4 py-3">
                                                <p className="text-sm font-bold text-slate-700 lowercase first-letter:uppercase">{item.product?.name || 'Неизвестный товар'}</p>
                                                <p className="text-[10px] text-slate-400 font-medium">#{item.product?.id}</p>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-black">
                                                    {item.quantity} шт.
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right text-sm font-semibold text-slate-600">
                                                {(item.price || 0).toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className="text-sm font-bold text-emerald-600">
                                                        {(item.marketing_amount || 0).toLocaleString()}
                                                    </span>
                                                    {item.default_marketing_amount > 0 && Math.abs(item.marketing_amount - item.default_marketing_amount) > 0.1 && (
                                                        <span className={cn(
                                                            "text-[9px] font-black",
                                                            item.marketing_amount > item.default_marketing_amount ? "text-emerald-500" : "text-orange-500"
                                                        )}>
                                                            ({item.marketing_amount > item.default_marketing_amount ? '+' : ''}
                                                            {(((item.marketing_amount - item.default_marketing_amount) / item.default_marketing_amount) * 100).toFixed(0)}%)
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right text-sm font-bold text-slate-900 font-mono">
                                                {((item.price || 0) * item.quantity).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Financial Summary */}
                    <div className="bg-slate-900 rounded-[28px] p-6 text-white shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:rotate-12 transition-transform duration-700">
                            <Receipt className="w-24 h-24" />
                        </div>
                        
                        <div className="relative z-10 space-y-3">
                            <div className="flex justify-between items-center text-slate-400">
                                <span className="text-xs font-black uppercase tracking-widest">Промежуточный итог</span>
                                <span className="font-bold">{subtotal.toLocaleString()} UZS</span>
                            </div>
                            <div className="flex justify-between items-center text-blue-400">
                                <span className="text-xs font-black uppercase tracking-widest">НДС ({ndsPercent}%)</span>
                                <span className="font-bold">{ndsAmount.toLocaleString()} UZS</span>
                            </div>
                            <div className="h-px bg-white/10 my-2" />
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-black uppercase tracking-[0.2em] text-white/60">К оплате</span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-black">{totalAmount.toLocaleString()}</span>
                                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">СУМ</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {reservation.description && (
                        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
                            <FileText className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Примечание</p>
                                <p className="text-sm text-amber-900 font-medium leading-relaxed mt-1">
                                    {reservation.description}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>

            {/* Recipient Detail Modals */}
            <MedOrgDetailModal 
                isOpen={isMedOrgModalOpen}
                onClose={() => setIsMedOrgModalOpen(false)}
                org={reservation.med_org}
                readOnly={true}
            />

            <DoctorDetailModal 
                isOpen={isDoctorModalOpen}
                onClose={() => setIsDoctorModalOpen(false)}
                doctor={reservation.doctor}
                salesPlans={[]}
                salesFacts={[]}
                readOnly={true}
            />
        </Dialog>
    );
};
