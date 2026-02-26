import React from "react";
import { Button } from "../../../components/ui/button";
import { Plus, Pencil } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
    DialogFooter,
} from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { useAuthStore } from "../../../store/authStore";

interface BonusPayment {
    id: number;
    for_month: number;
    for_year: number;
    paid_date: string;
    amount: number;
    doctor_id?: number;
    product_id?: number;
    notes?: string;
}

interface Doctor {
    id: number;
    full_name: string;
}

interface Product {
    id: number;
    name: string;
}

interface Plan {
    doctor_id?: number;
    product_id?: number;
    product?: { id: number; name: string };
}

interface BonusPaymentsCardProps {
    bonusPayments?: BonusPayment[];
    earnedBonus?: number;
    doctors?: Doctor[];
    products?: Product[];
    salesPlans?: Plan[];
    onAddBonusPayment?: (data: {
        amount: number;
        for_month: number;
        for_year: number;
        paid_date: string;
        doctor_id?: number;
        product_id?: number;
        notes?: string;
    }) => Promise<void>;
    onEditBonusPayment?: (id: number, data: {
        amount?: number;
        for_month?: number;
        for_year?: number;
        paid_date?: string;
        doctor_id?: number;
        product_id?: number;
        notes?: string;
    }) => Promise<void>;
}

const MONTHS_RU = [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
];

// Shared form fields component for both Add and Edit
function BonusForm({
    doctorId, setDoctorId,
    productId, setProductId,
    month, setMonth,
    year, setYear,
    amount, setAmount,
    paidDate, setPaidDate,
    notes, setNotes,
    doctors, filteredProducts,
}: {
    doctorId: string; setDoctorId: (v: string) => void;
    productId: string; setProductId: (v: string) => void;
    month: number; setMonth: (v: number) => void;
    year: number; setYear: (v: number) => void;
    amount: string; setAmount: (v: string) => void;
    paidDate: string; setPaidDate: (v: string) => void;
    notes: string; setNotes: (v: string) => void;
    doctors: Doctor[];
    filteredProducts: Product[];
}) {
    return (
        <div className="grid gap-4 py-4">
            {/* Doctor */}
            <div className="grid gap-2">
                <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Врач</Label>
                <Select value={doctorId} onValueChange={(v) => { setDoctorId(v); setProductId(""); }}>
                    <SelectTrigger className="h-11 rounded-xl border-slate-200 font-medium text-slate-900">
                        <SelectValue placeholder="Выберите врача..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 max-h-60">
                        {doctors.map(d => (
                            <SelectItem key={d.id} value={String(d.id)}>{d.full_name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Product */}
            <div className="grid gap-2">
                <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Продукт</Label>
                <Select value={productId} onValueChange={setProductId}>
                    <SelectTrigger className="h-11 rounded-xl border-slate-200 font-medium text-slate-900">
                        <SelectValue placeholder={doctorId ? "Выберите продукт..." : "Сначала выберите врача"} />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 max-h-60">
                        {filteredProducts.map(p => (
                            <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Month / Year */}
            <div className="grid gap-2">
                <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">За какой месяц</Label>
                <div className="flex gap-2">
                    <Select value={String(month)} onValueChange={(v) => setMonth(parseInt(v))}>
                        <SelectTrigger className="h-11 rounded-xl border-slate-200 font-medium text-slate-900 flex-1">
                            <SelectValue placeholder="Месяц" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200">
                            {MONTHS_RU.map((m, i) => (
                                <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Input
                        type="number"
                        placeholder="Год"
                        className="rounded-xl border-slate-200 h-11 w-24"
                        value={year}
                        onChange={(e) => setYear(parseInt(e.target.value))}
                    />
                </div>
            </div>

            {/* Amount */}
            <div className="grid gap-2">
                <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Сумма бонуса (UZS)</Label>
                <Input
                    type="number"
                    placeholder="0"
                    className="rounded-xl border-slate-200 h-11"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                />
            </div>

            {/* Date */}
            <div className="grid gap-2">
                <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Дата выплаты</Label>
                <Input
                    type="text"
                    placeholder="ГГГГ-ММ-ДД (напр. 2026-02-24)"
                    className="rounded-xl border-slate-200 h-11"
                    value={paidDate}
                    onChange={(e) => setPaidDate(e.target.value)}
                />
            </div>

            {/* Notes */}
            <div className="grid gap-2">
                <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Примечание (опционально)</Label>
                <Input
                    placeholder="Комментарий..."
                    className="rounded-xl border-slate-200 h-11"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                />
            </div>
        </div>
    );
}

export function BonusPaymentsCard({
    bonusPayments = [],
    earnedBonus = 0,
    doctors = [],
    products = [],
    salesPlans = [],
    onAddBonusPayment,
    onEditBonusPayment,
}: BonusPaymentsCardProps) {
    const { user } = useAuthStore();
    const canRecordBonus = ['deputy_director', 'director', 'admin'].includes(user?.role ?? '');

    // ── Add state ──────────────────────────────
    const [isAddOpen, setIsAddOpen] = React.useState(false);
    const [addAmount, setAddAmount] = React.useState("");
    const [addMonth, setAddMonth] = React.useState(new Date().getMonth() + 1);
    const [addYear, setAddYear] = React.useState(new Date().getFullYear());
    const [addPaidDate, setAddPaidDate] = React.useState(new Date().toISOString().split('T')[0]);
    const [addDoctorId, setAddDoctorId] = React.useState("");
    const [addProductId, setAddProductId] = React.useState("");
    const [addNotes, setAddNotes] = React.useState("");
    const [addSubmitting, setAddSubmitting] = React.useState(false);

    // ── Edit state ─────────────────────────────
    const [editingBp, setEditingBp] = React.useState<BonusPayment | null>(null);
    const [editAmount, setEditAmount] = React.useState("");
    const [editMonth, setEditMonth] = React.useState(1);
    const [editYear, setEditYear] = React.useState(new Date().getFullYear());
    const [editPaidDate, setEditPaidDate] = React.useState("");
    const [editDoctorId, setEditDoctorId] = React.useState("");
    const [editProductId, setEditProductId] = React.useState("");
    const [editNotes, setEditNotes] = React.useState("");
    const [editSubmitting, setEditSubmitting] = React.useState(false);

    const openEdit = (bp: BonusPayment) => {
        setEditingBp(bp);
        setEditAmount(String(bp.amount));
        setEditMonth(bp.for_month);
        setEditYear(bp.for_year);
        setEditPaidDate(String(bp.paid_date));
        setEditDoctorId(bp.doctor_id ? String(bp.doctor_id) : "");
        setEditProductId(bp.product_id ? String(bp.product_id) : "");
        setEditNotes(bp.notes ?? "");
    };

    // filtered products for add dialog
    const addFilteredProducts = React.useMemo(() => {
        if (!addDoctorId) return products;
        const docId = parseInt(addDoctorId);
        const ids = new Set(
            salesPlans.filter(p => p.doctor_id === docId && p.product_id != null).map(p => p.product_id as number)
        );
        return ids.size > 0 ? products.filter(p => ids.has(p.id)) : products;
    }, [addDoctorId, salesPlans, products]);

    // filtered products for edit dialog
    const editFilteredProducts = React.useMemo(() => {
        if (!editDoctorId) return products;
        const docId = parseInt(editDoctorId);
        const ids = new Set(
            salesPlans.filter(p => p.doctor_id === docId && p.product_id != null).map(p => p.product_id as number)
        );
        return ids.size > 0 ? products.filter(p => ids.has(p.id)) : products;
    }, [editDoctorId, salesPlans, products]);

    const totalPaid = bonusPayments.reduce((sum, bp) => sum + bp.amount, 0);
    const totalPredinvest = bonusPayments.reduce((sum, bp) => sum + Math.max(0, bp.amount - earnedBonus), 0);

    const getDoctor = (id?: number) => doctors.find(d => d.id === id);
    const getProduct = (id?: number) => products.find(p => p.id === id);

    const handleAdd = async () => {
        if (!onAddBonusPayment || !addAmount) return;
        try {
            setAddSubmitting(true);
            await onAddBonusPayment({
                amount: parseFloat(addAmount),
                for_month: addMonth,
                for_year: addYear,
                paid_date: addPaidDate,
                doctor_id: addDoctorId ? parseInt(addDoctorId) : undefined,
                product_id: addProductId ? parseInt(addProductId) : undefined,
                notes: addNotes || undefined,
            });
            setIsAddOpen(false);
            setAddAmount(""); setAddDoctorId(""); setAddProductId(""); setAddNotes("");
        } catch (err) { console.error(err); }
        finally { setAddSubmitting(false); }
    };

    const handleEdit = async () => {
        if (!onEditBonusPayment || !editingBp || !editAmount) return;
        try {
            setEditSubmitting(true);
            await onEditBonusPayment(editingBp.id, {
                amount: parseFloat(editAmount),
                for_month: editMonth,
                for_year: editYear,
                paid_date: editPaidDate,
                doctor_id: editDoctorId ? parseInt(editDoctorId) : undefined,
                product_id: editProductId ? parseInt(editProductId) : undefined,
                notes: editNotes || undefined,
            });
            setEditingBp(null);
        } catch (err) { console.error(err); }
        finally { setEditSubmitting(false); }
    };

    return (
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/60 overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-slate-100/80 flex flex-wrap justify-between items-center gap-3 bg-slate-50/30">
                <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Выплаченные бонусы</h3>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">История выплат корпоративных бонусов МП</p>
                </div>
                {canRecordBonus && (
                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="font-bold text-fuchsia-600 border-fuchsia-200 hover:bg-fuchsia-50 rounded-xl px-5 uppercase text-[10px] tracking-widest shadow-sm h-10">
                                <Plus className="w-3.5 h-3.5 mr-1.5" />
                                Записать выплату
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[460px] rounded-3xl">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-black text-slate-900">Выплата бонуса</DialogTitle>
                                <DialogDescription className="text-slate-500 text-xs">Укажите врача, продукт, сумму и дату выплаты.</DialogDescription>
                            </DialogHeader>
                            <BonusForm
                                doctorId={addDoctorId} setDoctorId={setAddDoctorId}
                                productId={addProductId} setProductId={setAddProductId}
                                month={addMonth} setMonth={setAddMonth}
                                year={addYear} setYear={setAddYear}
                                amount={addAmount} setAmount={setAddAmount}
                                paidDate={addPaidDate} setPaidDate={setAddPaidDate}
                                notes={addNotes} setNotes={setAddNotes}
                                doctors={doctors} filteredProducts={addFilteredProducts}
                            />
                            <DialogFooter>
                                <Button
                                    type="button"
                                    className="w-full bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest h-10 shadow-lg shadow-fuchsia-500/20 disabled:opacity-50"
                                    onClick={handleAdd}
                                    disabled={!addAmount || parseFloat(addAmount) <= 0 || addSubmitting}
                                >
                                    {addSubmitting ? "ЗАПИСЬ..." : "ЗАПИСАТЬ ВЫПЛАТУ"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            {/* Edit Dialog */}
            <Dialog open={!!editingBp} onOpenChange={(open) => { if (!open) setEditingBp(null); }}>
                <DialogContent className="sm:max-w-[460px] rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black text-slate-900">Редактировать выплату</DialogTitle>
                        <DialogDescription className="text-slate-500 text-xs">Измените данные выплаты бонуса.</DialogDescription>
                    </DialogHeader>
                    <BonusForm
                        doctorId={editDoctorId} setDoctorId={(v) => { setEditDoctorId(v); setEditProductId(""); }}
                        productId={editProductId} setProductId={setEditProductId}
                        month={editMonth} setMonth={setEditMonth}
                        year={editYear} setYear={setEditYear}
                        amount={editAmount} setAmount={setEditAmount}
                        paidDate={editPaidDate} setPaidDate={setEditPaidDate}
                        notes={editNotes} setNotes={setEditNotes}
                        doctors={doctors} filteredProducts={editFilteredProducts}
                    />
                    <DialogFooter>
                        <Button
                            type="button"
                            className="w-full bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest h-10 shadow-lg shadow-violet-500/20 disabled:opacity-50"
                            onClick={handleEdit}
                            disabled={!editAmount || parseFloat(editAmount) <= 0 || editSubmitting}
                        >
                            {editSubmitting ? "СОХРАНЕНИЕ..." : "СОХРАНИТЬ ИЗМЕНЕНИЯ"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Summary strip */}
            <div className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white grid grid-cols-3 gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-500/10 rounded-full blur-3xl -mr-20 -mt-20" />
                <div className="relative z-10">
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Всего выплачено</p>
                    <p className="text-2xl font-black text-fuchsia-400">{new Intl.NumberFormat('ru-RU').format(totalPaid)}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">UZS</p>
                </div>
                <div className="relative z-10">
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Бонус (факт)</p>
                    <p className="text-2xl font-black text-emerald-400">{new Intl.NumberFormat('ru-RU').format(earnedBonus)}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">UZS</p>
                </div>
                <div className="relative z-10">
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Предынвест</p>
                    <p className="text-2xl font-black text-amber-400">{new Intl.NumberFormat('ru-RU').format(totalPredinvest)}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">UZS</p>
                </div>
            </div>

            {/* Table */}
            <div className="p-6">
                {bonusPayments.length === 0 ? (
                    <div className="py-12 text-center">
                        <p className="text-slate-400 text-sm font-medium">Выплат ещё не было</p>
                        <p className="text-slate-300 text-xs mt-1">Нажмите «Записать выплату» чтобы добавить</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="text-[10px] font-bold uppercase text-slate-400 border-b border-slate-100">
                                    <th className="text-left py-2 pr-3">Период</th>
                                    <th className="text-left py-2 pr-3">Врач</th>
                                    <th className="text-left py-2 pr-3">Продукт</th>
                                    <th className="text-left py-2 pr-3">Дата</th>
                                    <th className="text-right py-2 pr-3">Сумма</th>
                                    <th className="text-right py-2 pr-3">Факт</th>
                                    <th className="text-right py-2 pr-3">Предынвест</th>
                                    {canRecordBonus && <th className="text-right py-2"></th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {bonusPayments.map(bp => {
                                    const predinvest = Math.max(0, bp.amount - earnedBonus);
                                    const doctor = getDoctor(bp.doctor_id);
                                    const product = getProduct(bp.product_id);
                                    return (
                                        <tr key={bp.id} className="hover:bg-fuchsia-50/30 transition-colors group">
                                            <td className="py-3 pr-3">
                                                <span className="font-bold text-fuchsia-700">
                                                    {MONTHS_RU[bp.for_month - 1]} {bp.for_year}
                                                </span>
                                                {bp.notes && <p className="text-[9px] text-slate-400 italic mt-0.5">{bp.notes}</p>}
                                            </td>
                                            <td className="py-3 pr-3 text-slate-700 font-medium">
                                                {doctor ? doctor.full_name : <span className="text-slate-300">—</span>}
                                            </td>
                                            <td className="py-3 pr-3">
                                                {product ? (
                                                    <span className="bg-violet-50 text-violet-700 border border-violet-200 rounded-lg px-2 py-0.5 font-semibold text-[10px]">
                                                        {product.name}
                                                    </span>
                                                ) : <span className="text-slate-300">—</span>}
                                            </td>
                                            <td className="py-3 pr-3 text-slate-500">{String(bp.paid_date)}</td>
                                            <td className="py-3 pr-3 text-right font-black text-fuchsia-700">
                                                {new Intl.NumberFormat('ru-RU').format(bp.amount)}
                                            </td>
                                            <td className="py-3 pr-3 text-right text-slate-600 font-semibold">
                                                {new Intl.NumberFormat('ru-RU').format(earnedBonus)}
                                            </td>
                                            <td className="py-3 pr-3 text-right">
                                                {predinvest > 0 ? (
                                                    <span className="font-black text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
                                                        {new Intl.NumberFormat('ru-RU').format(predinvest)}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-300">—</span>
                                                )}
                                            </td>
                                            {canRecordBonus && (
                                                <td className="py-3 text-right">
                                                    <button
                                                        onClick={() => openEdit(bp)}
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-violet-100 text-violet-500 hover:text-violet-700"
                                                        title="Редактировать"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
