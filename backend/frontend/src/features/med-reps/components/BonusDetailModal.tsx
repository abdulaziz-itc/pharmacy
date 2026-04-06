import React, { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getReservationById } from '@/api/orders-management';
import { Loader2, User, Calendar, Building2, Package, CreditCard, History } from 'lucide-react';

interface BonusDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    reservationId: number | null;
}

export const BonusDetailModal: React.FC<BonusDetailModalProps> = ({ isOpen, onClose, reservationId }) => {
    const [reservation, setReservation] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && reservationId) {
            loadReservation();
        }
    }, [isOpen, reservationId]);

    const loadReservation = async () => {
        try {
            setLoading(true);
            const data = await getReservationById(reservationId!);
            setReservation(data);
        } catch (error) {
            console.error("Error loading reservation details:", error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold flex items-center">
                        <Package className="w-6 h-6 mr-2 text-blue-600" />
                        Детализация брони / Счёт-фактуры
                    </DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                ) : reservation ? (
                    <div className="space-y-6 py-4">
                        {/* Summary Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-slate-50 p-4 rounded-xl space-y-3">
                                <div className="flex items-center text-sm">
                                    <User className="w-4 h-4 mr-2 text-slate-400" />
                                    <span className="font-medium text-slate-500 mr-2">Создал:</span>
                                    <span className="text-slate-900">{reservation.created_by?.full_name || "N/A"}</span>
                                </div>
                                <div className="flex items-center text-sm">
                                    <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                                    <span className="font-medium text-slate-500 mr-2">Дата отгрузки:</span>
                                    <span className="text-slate-900">
                                        {reservation.invoice?.realization_date
                                            ? new Date(reservation.invoice.realization_date).toLocaleDateString('ru-RU')
                                            : new Date(reservation.date).toLocaleDateString('ru-RU')}
                                    </span>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-4 rounded-xl space-y-3">
                                <div className="flex items-center text-sm">
                                    <Building2 className="w-4 h-4 mr-2 text-slate-400" />
                                    <span className="font-medium text-slate-500 mr-2">Организация:</span>
                                    <span className="text-slate-900">{reservation.med_org?.name || reservation.customer_name}</span>
                                </div>
                                <div className="flex items-center text-sm">
                                    <span className="font-medium text-slate-500 mr-2 ml-6">ИНН:</span>
                                    <span className="text-slate-900">{reservation.med_org?.inn || "N/A"}</span>
                                </div>
                            </div>
                        </div>

                        {/* Products Table */}
                        <div className="space-y-3">
                            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center">
                                <Package className="w-4 h-4 mr-2" /> Товары в фактуре
                            </h4>
                            <div className="border rounded-xl overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-slate-50">
                                        <TableRow>
                                            <TableHead>Наименование</TableHead>
                                            <TableHead className="text-center">Кол-во</TableHead>
                                            <TableHead className="text-right">Цена</TableHead>
                                            <TableHead className="text-right">Сумма</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {reservation.items?.map((item: any) => (
                                            <TableRow key={item.id}>
                                                <TableCell className="font-medium">{item.product?.name}</TableCell>
                                                <TableCell className="text-center">{item.quantity} шт.</TableCell>
                                                <TableCell className="text-right">{item.price.toLocaleString('ru-RU')} UZS</TableCell>
                                                <TableCell className="text-right font-bold">{item.total_price.toLocaleString('ru-RU')} UZS</TableCell>
                                            </TableRow>
                                        ))}
                                        <TableRow className="bg-slate-50 font-bold border-t">
                                            <TableCell colSpan={3} className="text-right uppercase text-[10px] tracking-widest text-slate-500">Итого по товарам:</TableCell>
                                            <TableCell className="text-right text-slate-900">
                                                {reservation.total_amount.toLocaleString('ru-RU')} UZS
                                            </TableCell>
                                        </TableRow>
                                        {reservation.nds_percent > 0 && (
                                            <TableRow className="bg-white border-t">
                                                <TableCell colSpan={3} className="text-right uppercase text-[10px] tracking-widest text-slate-400">НДС {reservation.nds_percent}%:</TableCell>
                                                <TableCell className="text-right text-slate-600 text-[11px]">
                                                    {Math.round(reservation.total_amount * (reservation.nds_percent / 100)).toLocaleString('ru-RU')} UZS
                                                </TableCell>
                                            </TableRow>
                                        )}
                                        <TableRow className="bg-slate-900 text-white font-black">
                                            <TableCell colSpan={3} className="text-right uppercase text-[10px] tracking-widest">Итого к оплате:</TableCell>
                                            <TableCell className="text-right text-blue-400 text-lg">
                                                {Math.round(reservation.total_amount * (1 + (reservation.nds_percent / 100))).toLocaleString('ru-RU')} UZS
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        {/* Financial Info & Payments */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center">
                                    <CreditCard className="w-4 h-4 mr-2" /> Финансовое состояние
                                </h4>
                                <div className="bg-white border rounded-xl p-4 space-y-4 shadow-sm">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-500">Общая сумма (с НДС {reservation.nds_percent}%):</span>
                                        <span className="font-bold text-slate-900 text-lg">
                                            {reservation.total_amount.toLocaleString('ru-RU')} UZS
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-500">Оплачено:</span>
                                        <span className="font-bold text-emerald-600">
                                            {(reservation.invoice?.paid_amount || 0).toLocaleString('ru-RU')} UZS
                                        </span>
                                    </div>
                                    <div className="pt-2 border-t flex justify-between items-center text-sm">
                                        <span className="text-slate-900 font-bold">Остаток долга:</span>
                                        <span className="font-bold text-red-600 text-lg">
                                            {(reservation.total_amount - (reservation.invoice?.paid_amount || 0)).toLocaleString('ru-RU')} UZS
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center">
                                    <History className="w-4 h-4 mr-2" /> История поступлений
                                </h4>
                                <div className="border rounded-xl overflow-hidden max-h-[200px] overflow-y-auto">
                                    <Table>
                                        <TableHeader className="bg-slate-50 sticky top-0">
                                            <TableRow>
                                                <TableHead className="py-2">Дата</TableHead>
                                                <TableHead className="py-2 text-right">Сумма</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {reservation.invoice?.payments?.length > 0 ? (
                                                reservation.invoice.payments.map((p: any) => (
                                                    <TableRow key={p.id}>
                                                        <TableCell className="py-2 text-xs text-slate-600">
                                                            {new Date(p.date).toLocaleDateString('ru-RU')}
                                                        </TableCell>
                                                        <TableCell className="py-2 text-right font-semibold text-emerald-600 text-xs">
                                                            +{p.amount.toLocaleString('ru-RU')}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={2} className="text-center py-4 text-slate-400 italic text-xs">
                                                        Поступлений пока нет
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-12 text-slate-400">
                        Данные не найдены
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};
