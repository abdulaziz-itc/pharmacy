import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { getMedRepBonusBalance, allocateBonus } from '@/api/orders-management';
import { getPlans } from '@/api/sales';
import { toast } from 'sonner';
import { Wallet, ArrowUpRight, ArrowDownLeft, Clock, Eye, Banknote, CheckCircle2, AlertCircle, Users, Scale } from 'lucide-react';
import { BonusDetailModal } from './BonusDetailModal';
import { DoctorDetailModal } from './DoctorDetailModal';

interface MedRepBonusDashboardProps {
    doctors: any[];
    medRepId?: number;
}

const MONTHS_RU = [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
];

export const MedRepBonusDashboard: React.FC<MedRepBonusDashboardProps> = ({ doctors, medRepId }) => {
    const [balance, setBalance] = useState<number>(0);
    const [totalAccrued, setTotalAccrued] = useState<number>(0);
    const [totalPaid, setTotalPaid] = useState<number>(0);
    const [totalAllocated, setTotalAllocated] = useState<number>(0);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Calculate Predinvest
    const predinvestAmount = React.useMemo(() => {
        return history
            .filter(h => h.ledger_type === 'accrual' && h.notes === 'Аванс (Предынвест)')
            .reduce((sum, h) => sum + h.amount, 0);
    }, [history]);

    // Allocation State
    const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);
    const [doctorId, setDoctorId] = useState<string>("");
    const [productId, setProductId] = useState<string>("");
    const [availablePlans, setAvailablePlans] = useState<any[]>([]);
    const [loadingPlans, setLoadingPlans] = useState(false);
    const [quantity, setQuantity] = useState<string>("");
    const [targetMonth, setTargetMonth] = useState<string>(new Date().getMonth() + 1 + "");
    const [targetYear, setTargetYear] = useState<string>(new Date().getFullYear().toString());
    const [notes, setNotes] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedPlanMarketing, setSelectedPlanMarketing] = useState<number>(0);
    const [overrideMarketingAmount, setOverrideMarketingAmount] = useState<string>("");

    // History Filter State
    const [filterMonth, setFilterMonth] = useState<string>("");
    const [filterYear, setFilterYear] = useState<string>("");

    // Detail Modal State
    const [selectedReservationId, setSelectedReservationId] = useState<number | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    // Doctor Modal State
    const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
    const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);

    const loadData = async (m?: string, y?: string) => {
        try {
            setLoading(true);
            const data = await getMedRepBonusBalance(
                medRepId,
                m ? parseInt(m) : undefined,
                y ? parseInt(y) : undefined
            );
            setBalance(data.balance || 0);
            setTotalAccrued(data.total_accrued || 0);
            setTotalPaid(data.total_paid || 0);
            setTotalAllocated(data.total_allocated || 0);
            setHistory(data.history || []);
        } catch (error) {
            toast.error("Ошибка при загрузке баланса");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        const fetchPlans = async () => {
            if (doctorId && targetMonth && targetYear) {
                try {
                    setLoadingPlans(true);
                    const plans = await getPlans(
                        parseInt(targetMonth),
                        parseInt(targetYear),
                        medRepId,
                        parseInt(doctorId)
                    );
                    setAvailablePlans(plans);
                    setProductId(""); // Reset product selection when criteria change
                } catch (error) {
                    console.error("Error fetching plans:", error);
                    setAvailablePlans([]);
                } finally {
                    setLoadingPlans(false);
                }
            } else {
                setAvailablePlans([]);
                setProductId("");
            }
        };
        fetchPlans();
    }, [doctorId, targetMonth, targetYear, medRepId, isAllocateModalOpen]);

    const currentMarketing = overrideMarketingAmount ? parseFloat(overrideMarketingAmount) : selectedPlanMarketing;
    const computedAmount = quantity && currentMarketing
        ? parseInt(quantity) * currentMarketing
        : 0;

    const handleAllocate = async () => {
        if (!doctorId || !productId || !quantity || !targetMonth || !targetYear) {
            toast.error("Пожалуйста, заполните все поля");
            return;
        }
        const qty = parseInt(quantity);
        if (qty <= 0) {
            toast.error("Количество должно быть больше 0");
            return;
        }
        if (computedAmount > balance) {
            toast.error("Недостаточно средств на балансе");
            return;
        }
        try {
            setIsSubmitting(true);
            const result = await allocateBonus({
                med_rep_id: medRepId,
                doctor_id: parseInt(doctorId),
                product_id: parseInt(productId),
                quantity: qty,
                target_month: parseInt(targetMonth),
                target_year: parseInt(targetYear),
                amount_per_unit: overrideMarketingAmount ? parseFloat(overrideMarketingAmount) : undefined,
                notes: notes
            });
            toast.success(`Бонус ${result.amount?.toLocaleString('ru-RU')} UZS успешно выплачен!`);
            setIsAllocateModalOpen(false);
            setQuantity("");
            setProductId("");
            setOverrideMarketingAmount("");
            setNotes("");
            setSelectedPlanMarketing(0);
            loadData();
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Ошибка при прикреплении");
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ru-RU', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    // Stat card detail panel
    const [statPanelOpen, setStatPanelOpen] = useState(false);
    const [statPanelType, setStatPanelType] = useState<'accrued' | 'paid' | 'pending' | 'allocated' | 'balance'>('accrued');

    const STAT_LABELS: Record<string, string> = {
        accrued: 'Всего начислено',
        paid: 'Всего выплачено',
        pending: 'Остаток к выплате',
        allocated: 'Распределённые бонусы',
        balance: 'Остаток на балансе',
    };

    const panelRows = (type: typeof statPanelType) => {
        switch (type) {
            case 'accrued': return history.filter(h => h.ledger_type === 'accrual');
            case 'paid': return history.filter(h => h.ledger_type === 'accrual' && h.is_paid);
            case 'pending': return history.filter(h => h.ledger_type === 'accrual' && !h.is_paid);
            case 'allocated': return history.filter(h => h.ledger_type === 'offset');
            case 'balance': return history.filter(h => h.ledger_type === 'offset' || (h.ledger_type === 'accrual' && h.is_paid));
            default: return history;
        }
    };

    const openStat = (type: typeof statPanelType) => {
        setStatPanelType(type);
        setStatPanelOpen(true);
    };

    const MONTHS_SHORT = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

    return (
        <div className="space-y-6">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card
                    className="border-slate-200/60 shadow-sm bg-white overflow-hidden relative cursor-pointer hover:shadow-lg hover:border-slate-300 transition-all group"
                    onClick={() => openStat('accrued')}
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Banknote className="w-16 h-16 text-slate-900" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-wider">Всего начислено</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-slate-900">{totalAccrued.toLocaleString('ru-RU')} UZS</div>
                        <p className="text-xs text-slate-500 mt-1 font-medium">Общая заработанная сумма</p>
                        <p className="text-[10px] text-blue-500 mt-2 font-semibold flex items-center gap-1">👆 Нажмите для деталей</p>
                    </CardContent>
                </Card>

                <Card
                    className="border-slate-200/60 shadow-sm bg-gradient-to-br from-emerald-500 to-emerald-600 text-white overflow-hidden relative cursor-pointer hover:shadow-xl hover:scale-[1.01] transition-all group"
                    onClick={() => openStat('paid')}
                >
                    <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-30 transition-opacity">
                        <CheckCircle2 className="w-16 h-16" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold text-emerald-100 uppercase tracking-wider">Всего выплачено</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black">{totalPaid.toLocaleString('ru-RU')} UZS</div>
                        <p className="text-xs text-emerald-100/80 mt-1 font-medium">Сумма переведенная на ваш баланс</p>
                        <p className="text-[10px] text-emerald-100 mt-2 font-semibold">👆 Нажмите для деталей</p>
                    </CardContent>
                </Card>

                <Card
                    className="border-slate-200/60 shadow-sm bg-gradient-to-br from-indigo-500 to-indigo-600 text-white overflow-hidden relative cursor-pointer hover:shadow-xl hover:scale-[1.01] transition-all group"
                    onClick={() => openStat('pending')}
                >
                    <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-30 transition-opacity">
                        <AlertCircle className="w-16 h-16" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold text-indigo-100 uppercase tracking-wider">Остаток к выплате</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black">{(totalAccrued - totalPaid).toLocaleString('ru-RU')} UZS</div>
                        <p className="text-xs text-indigo-100/80 mt-1 font-medium">Ожидает утверждения директором</p>
                        <p className="text-[10px] text-indigo-100 mt-2 font-semibold">👆 Нажмите для деталей</p>
                    </CardContent>
                </Card>

                <Card
                    className="border-slate-200/60 shadow-sm bg-gradient-to-br from-amber-500 to-amber-600 text-white overflow-hidden relative cursor-pointer hover:shadow-xl hover:scale-[1.01] transition-all group"
                    onClick={() => openStat('allocated')}
                >
                    <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-30 transition-opacity">
                        <Users className="w-16 h-16" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold text-amber-100 uppercase tracking-wider">Распределенные бонусы</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black">{totalAllocated.toLocaleString('ru-RU')} UZS</div>
                        <p className="text-xs text-amber-100/80 mt-1 font-medium">Прикреплено к врачам</p>
                        <p className="text-[10px] text-amber-100 mt-2 font-semibold">👆 Нажмите для деталей</p>
                    </CardContent>
                </Card>

                <Card
                    className="border-slate-200/60 shadow-sm bg-gradient-to-br from-violet-500 to-violet-600 text-white overflow-hidden relative md:col-span-2 lg:col-span-1 cursor-pointer hover:shadow-xl hover:scale-[1.01] transition-all group"
                    onClick={() => openStat('balance')}
                >
                    <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-30 transition-opacity">
                        <Scale className="w-16 h-16" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold text-violet-100 uppercase tracking-wider">Остаток на балансе</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black">{(totalPaid - totalAllocated).toLocaleString('ru-RU')} UZS</div>
                        <p className="text-xs text-violet-100/80 mt-1 font-medium">Доступно для распределения</p>
                        <p className="text-[10px] text-violet-100 mt-2 font-semibold">👆 Нажмите для деталей</p>
                    </CardContent>
                </Card>
            </div>

            {/* Stat Detail Modal */}
            <Dialog open={statPanelOpen} onOpenChange={setStatPanelOpen}>
                <DialogContent className="sm:max-w-[680px] max-h-[85vh] flex flex-col p-0 rounded-3xl overflow-hidden border-0 shadow-2xl">
                    {/* Header */}
                    <div className={`px-8 py-6 shrink-0 ${statPanelType === 'accrued' ? 'bg-gradient-to-r from-slate-800 to-slate-700' :
                            statPanelType === 'paid' ? 'bg-gradient-to-r from-emerald-600 to-emerald-500' :
                                statPanelType === 'pending' ? 'bg-gradient-to-r from-indigo-600 to-indigo-500' :
                                    statPanelType === 'allocated' ? 'bg-gradient-to-r from-amber-600 to-amber-500' :
                                        'bg-gradient-to-r from-violet-600 to-violet-500'
                        } text-white`}>
                        <DialogHeader>
                            <DialogTitle className="text-white text-lg font-black">{STAT_LABELS[statPanelType]}</DialogTitle>
                        </DialogHeader>
                        <p className="text-sm opacity-80 mt-1">
                            {panelRows(statPanelType).length} ta tranzaktsiya
                            {' · '}
                            {panelRows(statPanelType).reduce((s, h) => s + Math.abs(h.amount), 0).toLocaleString('ru-RU')} UZS jami
                        </p>
                    </div>

                    {/* Rows */}
                    <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3 bg-slate-50">
                        {panelRows(statPanelType).length === 0 ? (
                            <div className="text-center py-16 text-slate-400">
                                <p className="text-4xl mb-3">📭</p>
                                <p className="font-semibold">Ma'lumot yo'q</p>
                            </div>
                        ) : panelRows(statPanelType).map((h, i) => (
                            <div
                                key={h.id ?? i}
                                className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all cursor-pointer"
                                onClick={() => {
                                    if (h.reservation_id) {
                                        setSelectedReservationId(h.reservation_id);
                                        setStatPanelOpen(false);
                                        setIsDetailModalOpen(true);
                                    } else if (h.doctor) {
                                        setSelectedDoctor(h.doctor);
                                        setStatPanelOpen(false);
                                        setIsDoctorModalOpen(true);
                                    }
                                }}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        {/* Top row: date + type badge */}
                                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                                            <span className="text-xs text-slate-400 font-medium">{formatDate(h.created_at)}</span>
                                            {h.ledger_type === 'accrual' ? (
                                                <span className="flex items-center text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                                                    <ArrowDownLeft className="w-2.5 h-2.5 mr-1" /> Приход
                                                </span>
                                            ) : (
                                                <span className="flex items-center text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                                                    <ArrowUpRight className="w-2.5 h-2.5 mr-1" /> Врачга
                                                </span>
                                            )}
                                            {h.is_paid === false && h.ledger_type === 'accrual' && (
                                                <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-bold">⏳ Kutmoqda</span>
                                            )}
                                            {h.is_paid === true && h.ledger_type === 'accrual' && (
                                                <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">✓ To'langan</span>
                                            )}
                                        </div>

                                        {/* Info grid */}
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                            {h.product && (
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Mahsulot</p>
                                                    <p className="font-semibold text-slate-700 truncate">{h.product.name}</p>
                                                </div>
                                            )}
                                            {h.doctor && (
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Vrach</p>
                                                    <p className="font-semibold text-slate-700 truncate">{h.doctor.full_name}</p>
                                                </div>
                                            )}
                                            {h.target_month && h.target_year && (
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Oylik davr</p>
                                                    <p className="font-semibold text-slate-700">{MONTHS_SHORT[(h.target_month ?? 1) - 1]} {h.target_year}</p>
                                                </div>
                                            )}
                                            {h.invoice_id && (
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Faktura</p>
                                                    <p className="font-semibold text-blue-600">#{h.invoice_id}</p>
                                                </div>
                                            )}
                                            {h.reservation_id && (
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Rezervatsiya</p>
                                                    <p className="font-semibold text-blue-600">#{h.reservation_id} 🔗</p>
                                                </div>
                                            )}
                                        </div>

                                        {h.notes && (
                                            <p className="text-xs text-slate-500 mt-2 bg-slate-50 rounded-xl px-3 py-1.5 leading-relaxed">{h.notes}</p>
                                        )}
                                    </div>

                                    {/* Amount */}
                                    <div className="shrink-0 text-right">
                                        <p className={`text-lg font-black ${h.ledger_type === 'accrual' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                            {h.ledger_type === 'accrual' ? '+' : '-'}{Math.abs(h.amount).toLocaleString('ru-RU')}
                                        </p>
                                        <p className="text-[10px] text-slate-400 font-medium">UZS</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>


            {/* Balance Card */}
            <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg">
                <CardContent className="p-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-blue-100 text-sm font-medium mb-1 flex items-center">
                                <Wallet className="w-4 h-4 mr-2" />
                                Мой бонусный баланс
                            </p>
                            <h2 className="text-4xl font-bold">
                                {balance.toLocaleString('ru-RU')} <span className="text-xl text-blue-200">UZS</span>
                            </h2>
                            {predinvestAmount > 0 && (
                                <p className="text-sm text-blue-200 mt-2 font-medium bg-blue-800/30 inline-block px-3 py-1 rounded-xl border border-blue-500/30 shadow-sm">
                                    в том числе аванс: <span className="font-bold text-white">{predinvestAmount.toLocaleString('ru-RU')} UZS</span>
                                </p>
                            )}
                        </div>
                        <Button
                            variant="secondary"
                            size="lg"
                            className="bg-white text-blue-700 hover:bg-blue-50 font-semibold"
                            onClick={() => setIsAllocateModalOpen(true)}
                            disabled={balance <= 0}
                        >
                            Прикрепить к врачу
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* History Table */}
            <Card className="shadow-sm">
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-lg flex items-center">
                                <Clock className="w-5 h-5 mr-2 text-slate-500" />
                                История транзакций
                            </CardTitle>
                            <CardDescription>Бонусы, поступившие на ваш счет и распределенные по врачам.</CardDescription>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <Select value={filterMonth} onValueChange={setFilterMonth}>
                                <SelectTrigger className="w-[130px] h-9">
                                    <SelectValue placeholder="Месяц" />
                                </SelectTrigger>
                                <SelectContent>
                                    {MONTHS_RU.map((m, i) => (
                                        <SelectItem key={i + 1} value={(i + 1).toString()}>{m}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={filterYear} onValueChange={setFilterYear}>
                                <SelectTrigger className="w-[100px] h-9">
                                    <SelectValue placeholder="Год" />
                                </SelectTrigger>
                                <SelectContent>
                                    {[2024, 2025, 2026].map(y => (
                                        <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Button
                                size="sm"
                                onClick={() => loadData(filterMonth, filterYear)}
                                disabled={!filterMonth || !filterYear || loading}
                            >
                                Фильтр
                            </Button>

                            {(filterMonth || filterYear) && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                        setFilterMonth("");
                                        setFilterYear("");
                                        loadData("", "");
                                    }}
                                    disabled={loading}
                                >
                                    Сброс
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Дата</TableHead>
                                <TableHead>Тип</TableHead>
                                <TableHead>Продукт</TableHead>
                                <TableHead>Комментарий</TableHead>
                                <TableHead className="text-right">Сумма</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-4 text-muted-foreground">Загрузка...</TableCell></TableRow>
                            ) : history.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-4 text-muted-foreground">История транзакций пуста</TableCell></TableRow>
                            ) : (
                                history.map((h, i) => (
                                    <TableRow
                                        key={i}
                                        className="cursor-pointer hover:bg-slate-50 transition-colors"
                                        onClick={() => {
                                            if (h.reservation_id) {
                                                setSelectedReservationId(h.reservation_id);
                                                setIsDetailModalOpen(true);
                                            } else if (h.doctor) {
                                                setSelectedDoctor(h.doctor);
                                                setIsDoctorModalOpen(true);
                                            }
                                        }}
                                    >
                                        <TableCell className="text-sm text-slate-600">
                                            {formatDate(h.created_at)}
                                        </TableCell>
                                        <TableCell>
                                            {h.ledger_type === 'accrual' ? (
                                                <span className="flex items-center text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs font-semibold w-max">
                                                    <ArrowDownLeft className="w-3 h-3 mr-1" /> Приход
                                                </span>
                                            ) : (
                                                <span className="flex items-center text-red-600 bg-red-50 px-2 py-1 rounded-full text-xs font-semibold w-max">
                                                    <ArrowUpRight className="w-3 h-3 mr-1" /> Расход
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm font-medium text-slate-700">
                                            {h.product?.name || "-"}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            <div className="flex items-center">
                                                {h.notes || "-"}
                                                {h.reservation_id && (
                                                    <Eye className="w-3.5 h-3.5 ml-2 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className={`text-right font-bold ${h.ledger_type === 'accrual' ? 'text-green-600' : 'text-slate-900'}`}>
                                            {h.ledger_type === 'accrual' ? '+' : '-'} {h.amount.toLocaleString('ru-RU')} UZS
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Allocation Modal */}
            <Dialog open={isAllocateModalOpen} onOpenChange={(open) => {
                setIsAllocateModalOpen(open);
                if (!open) { setQuantity(""); setProductId(""); setNotes(""); setSelectedPlanMarketing(0); }
            }}>
                <DialogContent className="sm:max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle>Выплата бонуса врачу</DialogTitle>
                        <DialogDescription>
                            Текущий баланс: <span className="font-bold text-blue-600">{balance.toLocaleString('ru-RU')} UZS</span>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* Step 1: Doctor */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">① Врач</label>
                            <Select value={doctorId} onValueChange={(v) => { setDoctorId(v); setProductId(""); setQuantity(""); setSelectedPlanMarketing(0); }}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Выберите врача..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {doctors.filter(d => d.is_active !== false).map(d => (
                                        <SelectItem key={d.id} value={d.id.toString()}>{d.full_name || d.fullName}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Step 2: Month & Year (before product - needed to filter plans) */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">② Месяц</label>
                                <Select value={targetMonth} onValueChange={(v) => { setTargetMonth(v); setProductId(""); setQuantity(""); setSelectedPlanMarketing(0); }}>
                                    <SelectTrigger><SelectValue placeholder="Месяц" /></SelectTrigger>
                                    <SelectContent>
                                        {MONTHS_RU.map((m, i) => (
                                            <SelectItem key={i + 1} value={(i + 1).toString()}>{m}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Год</label>
                                <Select value={targetYear} onValueChange={(v) => { setTargetYear(v); setProductId(""); setQuantity(""); setSelectedPlanMarketing(0); }}>
                                    <SelectTrigger><SelectValue placeholder="Год" /></SelectTrigger>
                                    <SelectContent>
                                        {[2024, 2025, 2026].map(y => (
                                            <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Step 3: Product (filtered by doctor+month+year) */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">③ Продукт из плана</label>
                            <Select
                                value={productId}
                                onValueChange={(v) => {
                                    setProductId(v);
                                    setQuantity("");
                                    const plan = availablePlans.find(p => p.product_id.toString() === v);
                                    setSelectedPlanMarketing(plan?.product?.marketing_expense || 0);
                                }}
                                disabled={!doctorId || !targetMonth || !targetYear || loadingPlans}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={loadingPlans ? "Загрузка..." : !doctorId ? "Сначала выберите врача" : "Выберите продукт..."} />
                                </SelectTrigger>
                                <SelectContent>
                                    {availablePlans.length === 0 ? (
                                        <p className="text-xs text-center py-2 text-muted-foreground">Планы для этого периода не найдены</p>
                                    ) : (
                                        availablePlans.map(p => (
                                            <SelectItem key={p.id} value={p.product_id.toString()}>
                                                {p.product?.name} — цель: {p.target_quantity ?? 0} шт. (факт: {p.fact_quantity ?? 0} шт.)
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                            {productId && selectedPlanMarketing > 0 && (
                                <div className="space-y-2 mt-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Бонус за ед. (UZS)</label>
                                        <span className="text-[10px] text-slate-400">По умолчанию: {selectedPlanMarketing.toLocaleString()}</span>
                                    </div>
                                    <Input
                                        type="number"
                                        placeholder={selectedPlanMarketing.toString()}
                                        value={overrideMarketingAmount}
                                        onChange={e => setOverrideMarketingAmount(e.target.value)}
                                        className="h-8 text-sm border-blue-100 focus:border-blue-400"
                                    />
                                    <p className="text-[10px] text-slate-400 font-medium italic">
                                        Вы можете изменить сумму бонуса для этого распределения.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Step 4: Quantity */}
                        {productId && (
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">④ Количество (штук)</label>
                                <Input
                                    type="number"
                                    min={1}
                                    placeholder="0"
                                    value={quantity}
                                    onChange={e => setQuantity(e.target.value)}
                                />
                            </div>
                        )}

                        {/* Auto-calculated amount display */}
                        {computedAmount > 0 && (
                            <div className={`rounded-xl p-4 border-2 ${computedAmount > balance
                                ? "bg-red-50 border-red-300"
                                : "bg-emerald-50 border-emerald-300"
                                }`}>
                                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Сумма к выплате</p>
                                <p className={`text-2xl font-bold ${computedAmount > balance ? "text-red-600" : "text-emerald-700"
                                    }`}>
                                    {computedAmount.toLocaleString('ru-RU')} <span className="text-sm font-normal">UZS</span>
                                </p>
                                <p className="text-[11px] text-slate-400 mt-1">
                                    {quantity} шт. × {currentMarketing.toLocaleString('ru-RU')} UZS
                                </p>
                                {computedAmount > balance && (
                                    <p className="text-xs font-bold text-red-600 mt-1">Недостаточно средств на балансе!</p>
                                )}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Комментарий (опционально)</label>
                            <Textarea
                                placeholder="Дополнительный комментарий..."
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                rows={2}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAllocateModalOpen(false)}>Отмена</Button>
                        <Button
                            onClick={handleAllocate}
                            disabled={
                                isSubmitting ||
                                !doctorId ||
                                !productId ||
                                !quantity ||
                                parseInt(quantity) <= 0 ||
                                computedAmount <= 0 ||
                                computedAmount > balance
                            }
                        >
                            {isSubmitting ? "Сохранение..." : "Подтвердить выплату"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <BonusDetailModal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                reservationId={selectedReservationId}
            />

            {isDoctorModalOpen && selectedDoctor && (
                <DoctorDetailModal
                    isOpen={isDoctorModalOpen}
                    onClose={() => {
                        setIsDoctorModalOpen(false);
                        setSelectedDoctor(null);
                    }}
                    doctor={doctors.find(d => d.id === selectedDoctor.id) || selectedDoctor}
                    salesPlans={[]} // Passing empty plans for now to avoid complexity, or use availablePlans if appropriate
                    salesFacts={[]}
                    bonusPayments={history}
                />
            )}
        </div >
    );
};
