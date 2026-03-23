import React, { useEffect, useState } from "react";
import { PageContainer } from "@/components/PageContainer";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Wallet, CheckCircle2, AlertCircle, Banknote, Search, ArrowRight } from "lucide-react";
import axiosInstance from "@/api/axios";

// TypeScript Interfaces
interface BonusSummary {
    med_rep_id: number;
    med_rep_name: string;
    accrued: number;
    paid: number;
    remainder: number;
    allocated: number;
    predinvest: number;
}

export default function AdminBonusApprovalPage() {
    const [summaries, setSummaries] = useState<BonusSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // Pay Modal State
    const [isPayModalOpen, setIsPayModalOpen] = useState(false);
    const [selectedRep, setSelectedRep] = useState<BonusSummary | null>(null);
    const [payAmount, setPayAmount] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Expanded Row State
    interface BonusHistoryEntry {
        id: number;
        amount: number;
        ledger_type: string;
        created_at: string;
        notes: string;
        invoice_id: number | null;
        reservation_id: number | null;
        factura_number: string | null;
        doctor: { full_name: string } | null;
        product: { name: string } | null;
    }

    const [expandedRepId, setExpandedRepId] = useState<number | null>(null);
    const [historyData, setHistoryData] = useState<BonusHistoryEntry[]>([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);

    // Detail Modal State
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedResDetails, setSelectedResDetails] = useState<any>(null);
    const [isDetailLoading, setIsDetailLoading] = useState(false);

    const handleInvoiceClick = async (reservationId: number) => {
        setIsDetailModalOpen(true);
        setIsDetailLoading(true);
        try {
            const response = await axiosInstance.get(`/sales/reservations/${reservationId}`);
            setSelectedResDetails(response.data);
        } catch (error) {
            console.error("Failed to fetch reservation details:", error);
            toast.error("Не удалось загрузить данные по брони");
            setIsDetailModalOpen(false);
        } finally {
            setIsDetailLoading(false);
        }
    };

    const handleRowClick = async (medRepId: number) => {
        if (expandedRepId === medRepId) {
            setExpandedRepId(null);
            return;
        }

        setExpandedRepId(medRepId);
        setIsHistoryLoading(true);
        try {
            const response = await axiosInstance.get(`/sales/bonuses/history/${medRepId}`);
            setHistoryData(response.data.history || []);
        } catch (error) {
            console.error("Failed to fetch history:", error);
            toast.error("Не удалось загрузить историю начислений");
            setExpandedRepId(null);
        } finally {
            setIsHistoryLoading(false);
        }
    };

    const fetchSummaries = async () => {
        setIsLoading(true);
        try {
            const response = await axiosInstance.get('/sales/admin/bonuses/summary');
            setSummaries(response.data);
        } catch (error) {
            console.error("Failed to fetch bonus summaries:", error);
            toast.error("Не удалось загрузить данные по бонусам");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSummaries();
    }, []);

    const handleOpenPayModal = (rep: BonusSummary) => {
        setSelectedRep(rep);
        setPayAmount(rep.remainder.toString()); // Default to paying full remainder
        setIsPayModalOpen(true);
    };

    const handlePayBonus = async () => {
        if (!selectedRep) return;

        const amount = parseFloat(payAmount);
        if (isNaN(amount) || amount <= 0) {
            toast.error("Введите корректную сумму");
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await axiosInstance.post('/sales/admin/bonuses/pay', {
                med_rep_id: selectedRep.med_rep_id,
                amount_to_pay: amount
            });

            toast.success(`Успешно выплачено: ${response.data.paid_amount.toLocaleString('ru-RU')} UZS`);
            setIsPayModalOpen(false);
            fetchSummaries(); // Refresh data
        } catch (error: any) {
            console.error("Failed to pay bonus:", error);
            toast.error(error.response?.data?.detail || "Ошибка при выплате бонуса");
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredSummaries = summaries.filter(s =>
        s.med_rep_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalAccrued = summaries.reduce((sum, s) => sum + s.accrued, 0);
    const totalPaid = summaries.reduce((sum, s) => sum + s.paid, 0);
    const totalRemainder = summaries.reduce((sum, s) => sum + s.remainder, 0);

    return (
        <PageContainer>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Wallet className="w-8 h-8 text-blue-600 p-1.5 bg-blue-100/50 rounded-xl" />
                        Бонусы МП (Утверждение)
                    </h1>
                    <p className="text-slate-500 mt-1.5 ml-11 text-sm font-medium">
                        Управление начисленными и выплаченными бонусами медпредставителей
                    </p>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="border-slate-200/60 shadow-sm bg-white overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Banknote className="w-16 h-16 text-slate-900" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-wider">Всего начислено</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-slate-900">{totalAccrued.toLocaleString('ru-RU')} UZS</div>
                        <p className="text-xs text-slate-500 mt-1 font-medium">Общая сумма заработанная МП</p>
                    </CardContent>
                </Card>

                <Card className="border-slate-200/60 shadow-sm bg-gradient-to-br from-emerald-500 to-emerald-600 text-white overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-4 opacity-20">
                        <CheckCircle2 className="w-16 h-16" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold text-emerald-100 uppercase tracking-wider">Всего выплачено</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black">{totalPaid.toLocaleString('ru-RU')} UZS</div>
                        <p className="text-xs text-emerald-100/80 mt-1 font-medium">Сумма переведенная на баланс МП</p>
                    </CardContent>
                </Card>

                <Card className="border-slate-200/60 shadow-sm bg-gradient-to-br from-indigo-500 to-indigo-600 text-white overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-4 opacity-20">
                        <AlertCircle className="w-16 h-16" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold text-indigo-100 uppercase tracking-wider">Остаток к выплате</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black">{totalRemainder.toLocaleString('ru-RU')} UZS</div>
                        <p className="text-xs text-indigo-100/80 mt-1 font-medium">Ожидает вашего утверждения</p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Table */}
            <Card className="border-slate-200/60 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="relative w-full sm:max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Поиск МП..."
                            value={searchTerm}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                            className="pl-9 bg-white border-slate-200 focus-visible:ring-blue-500"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-slate-50/80 border-b border-slate-100">
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="font-semibold text-slate-700 h-11">Медпредставитель</TableHead>
                                <TableHead className="font-semibold text-slate-700 text-right h-11">Начислено (Факт)</TableHead>
                                <TableHead className="font-semibold text-slate-700 text-right h-11">Аванс</TableHead>
                                <TableHead className="font-semibold text-slate-700 text-right h-11">Выплачено</TableHead>
                                <TableHead className="font-semibold text-slate-700 text-right h-11">Остаток</TableHead>
                                <TableHead className="font-semibold text-slate-700 text-right h-11">Распределено врачам</TableHead>
                                <TableHead className="w-[120px] text-center h-11"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                                        Загрузка данных...
                                    </TableCell>
                                </TableRow>
                            ) : filteredSummaries.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                                        Нет данных для отображения
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredSummaries.map((rep) => (
                                    <React.Fragment key={rep.med_rep_id}>
                                        <TableRow
                                            className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                                            onClick={() => handleRowClick(rep.med_rep_id)}
                                        >
                                            <TableCell className="font-bold text-slate-900">
                                                <div className="flex items-center gap-2">
                                                    <span className="transform transition-transform text-slate-400">
                                                        {expandedRepId === rep.med_rep_id ? '▼' : '▶'}
                                                    </span>
                                                    {rep.med_rep_name}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-medium text-slate-600">
                                                {rep.accrued.toLocaleString('ru-RU')} UZS
                                            </TableCell>
                                            <TableCell className="text-right font-medium text-amber-600">
                                                {rep.predinvest.toLocaleString('ru-RU')} UZS
                                            </TableCell>
                                            <TableCell className="text-right font-medium text-emerald-600">
                                                {rep.paid.toLocaleString('ru-RU')} UZS
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${rep.remainder > 0 ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-600'
                                                    }`}>
                                                    {rep.remainder.toLocaleString('ru-RU')} UZS
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right font-medium text-slate-500">
                                                {rep.allocated.toLocaleString('ru-RU')} UZS
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Button
                                                    size="sm"
                                                    className={`w-full group-hover:opacity-100 transition-opacity ${rep.remainder > 0
                                                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                                                        : 'bg-slate-100 text-slate-400 hover:bg-slate-200 opacity-50'
                                                        }`}
                                                    disabled={rep.remainder <= 0}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleOpenPayModal(rep);
                                                    }}
                                                >
                                                    Выплатить
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                        {expandedRepId === rep.med_rep_id && (
                                            <TableRow className="bg-slate-50">
                                                <TableCell colSpan={7} className="p-0">
                                                    <div className="p-4 border-b border-t border-slate-100">
                                                        <h4 className="font-bold text-slate-700 mb-3 ml-2 flex items-center gap-2">
                                                            <Banknote className="w-4 h-4 text-slate-400" />
                                                            История начислений
                                                        </h4>
                                                        {isHistoryLoading ? (
                                                            <div className="text-center text-sm text-slate-500 py-4">Загрузка истории...</div>
                                                        ) : historyData.length === 0 ? (
                                                            <div className="text-center text-sm text-slate-500 py-4">Нет начислений за последние 30 дней</div>
                                                        ) : (
                                                            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                                                                <Table>
                                                                    <TableHeader className="bg-slate-50/50">
                                                                        <TableRow>
                                                                            <TableHead className="text-xs h-9">Дата</TableHead>
                                                                            <TableHead className="text-xs h-9">Тип</TableHead>
                                                                            <TableHead className="text-xs h-9">Счет-фактура</TableHead>
                                                                            <TableHead className="text-xs h-9">Врач</TableHead>
                                                                            <TableHead className="text-xs h-9">Препарат</TableHead>
                                                                            <TableHead className="text-xs h-9 text-right">Сумма (UZS)</TableHead>
                                                                        </TableRow>
                                                                    </TableHeader>
                                                                    <TableBody>
                                                                        {historyData.map(h => (
                                                                            <TableRow key={h.id} className="hover:bg-slate-50/50">
                                                                                <TableCell className="text-xs py-2">{new Date(h.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</TableCell>
                                                                                <TableCell className="text-xs py-2">
                                                                                    <span className={`px-2 py-0.5 rounded-full font-medium ${h.ledger_type === 'ACCRUAL' ? 'bg-emerald-100 text-emerald-700' :
                                                                                        h.ledger_type === 'OFFSET' ? 'bg-rose-100 text-rose-700' :
                                                                                            'bg-slate-100 text-slate-700'
                                                                                        }`}>
                                                                                        {h.ledger_type === 'ACCRUAL' ? 'Начисление' : h.ledger_type === 'OFFSET' ? 'Списание' : h.ledger_type}
                                                                                    </span>
                                                                                </TableCell>
                                                                                <TableCell className="text-xs py-2 font-medium">
                                                                                    {h.reservation_id ? (
                                                                                        <button
                                                                                            onClick={() => handleInvoiceClick(h.reservation_id!)}
                                                                                            className="text-blue-600 hover:text-blue-800 hover:underline font-bold"
                                                                                        >
                                                                                            {h.factura_number || `СФ №${h.invoice_id || h.reservation_id}`}
                                                                                        </button>
                                                                                    ) : (
                                                                                        <span className="text-slate-400">
                                                                                            {h.invoice_id ? `СФ №${h.invoice_id}` : (h.notes?.includes('Счет-фактура') ? h.notes : '-')}
                                                                                        </span>
                                                                                    )}
                                                                                </TableCell>
                                                                                <TableCell className="text-xs py-2">{h.doctor?.full_name || '-'}</TableCell>
                                                                                <TableCell className="text-xs py-2">{h.product?.name || '-'}</TableCell>
                                                                                <TableCell className={`text-xs py-2 text-right font-bold ${h.ledger_type === 'ACCRUAL' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                                                    {h.ledger_type === 'ACCRUAL' ? '+' : '-'}{h.amount.toLocaleString('ru-RU')}
                                                                                </TableCell>
                                                                            </TableRow>
                                                                        ))}
                                                                    </TableBody>
                                                                </Table>
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </React.Fragment>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            {/* Payment Modal */}
            <Dialog open={isPayModalOpen} onOpenChange={setIsPayModalOpen}>
                <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden border-0 shadow-2xl">
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-3 text-white">
                                <Wallet className="w-6 h-6 opacity-80" />
                                Выплата бонуса
                            </DialogTitle>
                            <DialogDescription className="text-blue-100/90 text-[15px] mt-2 font-medium">
                                Разрешить МП использовать бонусные средства.
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="p-6 space-y-6 bg-white">
                        {selectedRep && (
                            <div className="flex bg-slate-50 p-4 rounded-xl border border-slate-100 items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Получатель</p>
                                    <p className="text-slate-900 font-bold">{selectedRep.med_rep_name}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Доступно к выплате</p>
                                    <p className="text-indigo-600 font-black text-lg">{selectedRep.remainder.toLocaleString('ru-RU')} UZS</p>
                                </div>
                            </div>
                        )}

                        <div className="space-y-3">
                            <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                                Сумма выплаты (UZS)
                            </Label>
                            <div className="relative">
                                <Input
                                    type="number"
                                    value={payAmount}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPayAmount(e.target.value)}
                                    className="pl-4 pr-12 h-14 bg-slate-50 border-slate-200 text-lg font-bold rounded-xl focus-visible:ring-blue-500"
                                    placeholder="0"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                                    UZS
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 pt-0 bg-white">
                        <DialogFooter className="gap-3 sm:gap-0">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsPayModalOpen(false)}
                                className="h-12 border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-xl"
                            >
                                Отмена
                            </Button>
                            <Button
                                type="button"
                                onClick={handlePayBonus}
                                disabled={isSubmitting || !payAmount || parseFloat(payAmount) <= 0}
                                className="h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md min-w-[140px] flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? "Обработка..." : "Подтвердить"}
                                {!isSubmitting && <ArrowRight className="w-4 h-4" />}
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Reservation Detail Modal */}
            <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
                <DialogContent className="max-w-3xl rounded-3xl p-0 overflow-hidden border-0 shadow-2xl">
                    <DialogTitle className="sr-only">Детали брони</DialogTitle>
                    <DialogDescription className="sr-only">Просмотр состава и деталей брони.</DialogDescription>

                    {isDetailLoading ? (
                        <div className="p-20 text-center text-slate-500 font-bold uppercase tracking-widest">
                            Загрузка...
                        </div>
                    ) : selectedResDetails ? (
                        <>
                            <div className="bg-slate-900 px-6 py-5 text-white flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                                        <Wallet className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold">Бронь №{selectedResDetails.id}</h2>
                                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">
                                            {selectedResDetails.med_org?.name || 'Прямой клиент'}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">Статус</p>
                                    <span className={`px-3 py-1 rounded-lg text-xs font-black ${selectedResDetails.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400' :
                                        selectedResDetails.status === 'CANCELLED' ? 'bg-rose-500/20 text-rose-400' :
                                            'bg-blue-500/20 text-blue-400'
                                        }`}>
                                        {selectedResDetails.status}
                                    </span>
                                </div>
                            </div>

                            <div className="p-6 space-y-6">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <p className="text-[10px] text-slate-400 uppercase font-black mb-1">Дата</p>
                                        <p className="text-sm font-bold text-slate-700">
                                            {selectedResDetails.date ? new Date(selectedResDetails.date).toLocaleDateString('ru-RU') : '-'}
                                        </p>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <p className="text-[10px] text-slate-400 uppercase font-black mb-1">Сумма</p>
                                        <p className="text-sm font-black text-blue-600">
                                            {selectedResDetails.total_amount?.toLocaleString()} UZS
                                        </p>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <p className="text-[10px] text-slate-400 uppercase font-black mb-1">Создал</p>
                                        <p className="text-sm font-bold text-slate-700 truncate">
                                            {selectedResDetails.created_by?.full_name || '-'}
                                        </p>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <p className="text-[10px] text-slate-400 uppercase font-black mb-1">ИНН</p>
                                        <p className="text-sm font-bold text-slate-700">
                                            {selectedResDetails.med_org?.inn || '-'}
                                        </p>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-slate-100 overflow-hidden">
                                    <table className="w-full text-xs">
                                        <thead className="bg-slate-50 border-b border-slate-100">
                                            <tr>
                                                <th className="px-4 py-3 text-left font-black text-slate-400 uppercase tracking-widest">Товар</th>
                                                <th className="px-4 py-3 text-center font-black text-slate-400 uppercase tracking-widest">Кол-во</th>
                                                <th className="px-4 py-3 text-right font-black text-slate-400 uppercase tracking-widest">Цена</th>
                                                <th className="px-4 py-3 text-right font-black text-slate-400 uppercase tracking-widest">Итого</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {(selectedResDetails.items || []).map((item: any, idx: number) => (
                                                <tr key={idx} className="hover:bg-slate-50/50">
                                                    <td className="px-4 py-3 font-bold text-slate-700">{item.product?.name}</td>
                                                    <td className="px-4 py-3 text-center font-bold text-slate-600">{item.quantity}</td>
                                                    <td className="px-4 py-3 text-right font-medium text-slate-500">{item.price?.toLocaleString()}</td>
                                                    <td className="px-4 py-3 text-right font-bold text-slate-900">{item.total_price?.toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-slate-50/50 border-t border-slate-100">
                                            {selectedResDetails.nds_percent > 0 && (() => {
                                                const totalWithNds = selectedResDetails.total_amount || 0;
                                                const subtotal = totalWithNds / (1 + selectedResDetails.nds_percent / 100);
                                                const ndsAmount = totalWithNds - subtotal;
                                                return (
                                                    <>
                                                        <tr>
                                                            <td colSpan={3} className="px-4 py-2 text-right font-bold text-slate-400 uppercase tracking-widest text-[10px]">Сумма без НДС</td>
                                                            <td className="px-4 py-2 text-right font-bold text-slate-700">
                                                                {Math.round(subtotal).toLocaleString()} UZS
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td colSpan={3} className="px-4 py-2 text-right font-bold text-slate-400 uppercase tracking-widest text-[10px]">НДС {selectedResDetails.nds_percent}%</td>
                                                            <td className="px-4 py-2 text-right font-bold text-slate-700">
                                                                {Math.round(ndsAmount).toLocaleString()} UZS
                                                            </td>
                                                        </tr>
                                                    </>
                                                );
                                            })()}
                                            <tr>
                                                <td colSpan={3} className="px-4 py-3 text-right font-black text-slate-500 uppercase tracking-widest">Итого к оплате</td>
                                                <td className="px-4 py-3 text-right font-black text-blue-600 text-sm">
                                                    {(selectedResDetails.total_amount || 0).toLocaleString()} UZS
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="p-20 text-center text-slate-500">Данные не найдены</div>
                    )}

                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                        <Button
                            onClick={() => setIsDetailModalOpen(false)}
                            className="bg-white border text-slate-600 hover:bg-slate-50 font-bold rounded-xl"
                        >
                            Закрыть
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </PageContainer>
    );
}
