import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogHeader,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Banknote, CreditCard, Landmark } from "lucide-react";
import { cn } from "../../lib/utils";
import api from "../../api/axios";

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    availableInvoices: any[];
    onSuccess: () => void;
}

export function PaymentModal({ isOpen, onClose, availableInvoices, onSuccess }: PaymentModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form, setForm] = useState({
        invoice_id: 0,
        amount: "",
        payment_type: "cash"
    });

    const selectedInvoice = availableInvoices.find(i => i.id === form.invoice_id);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            await api.post('/domain/payments/postupleniya/', {
                invoice_id: form.invoice_id,
                amount: parseFloat(form.amount || "0"),
                payment_type: form.payment_type
            });
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Failed to process payment:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[420px] p-0 border-0 shadow-3xl rounded-[32px] overflow-hidden bg-white/95 backdrop-blur-xl">
                <DialogHeader className="relative p-0 h-36 flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500">
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse" />
                    </div>
                    <div className="relative z-10 flex flex-col items-center gap-3 mt-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-2xl">
                            <Banknote className="w-6 h-6 text-white" />
                        </div>
                        <DialogTitle className="text-xl font-bold text-white text-center leading-tight">
                            Проводка платежа
                        </DialogTitle>
                    </div>
                </DialogHeader>

                <div className="p-6 space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Выбор Инвойса</label>
                        <select
                            value={form.invoice_id}
                            onChange={(e) => {
                                const id = Number(e.target.value);
                                const inv = availableInvoices.find(i => i.id === id);
                                setForm({ ...form, invoice_id: id, amount: inv ? inv.total_amount_due.toString() : "" });
                            }}
                            className="w-full h-12 px-4 rounded-xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/5 transition-all font-bold text-slate-700 outline-none truncate"
                        >
                            <option value={0}>Выберите ожидающий инвойс...</option>
                            {availableInvoices.map((inv) => (
                                <option key={inv.id} value={inv.id}>
                                    ID {inv.id} - {inv.med_org?.name || "Свободная продажа"} - {inv.total_amount_due.toLocaleString()} сум
                                </option>
                            ))}
                        </select>
                        {selectedInvoice && (
                            <p className="text-xs text-green-600 mt-2 font-bold px-1 bg-green-50 p-2 rounded-lg inline-block">
                                К оплате: {selectedInvoice.total_amount_due.toLocaleString()} сум
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Сумма поступления (Сум)</label>
                        <Input
                            type="number"
                            min={1}
                            max={selectedInvoice?.total_amount_due || 999999999}
                            value={form.amount}
                            onChange={(e) => setForm({ ...form, amount: e.target.value })}
                            className="h-12 text-lg font-black border-slate-200 focus-visible:ring-green-500"
                            placeholder="Например, 500000"
                            disabled={!selectedInvoice}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Способ оплаты</label>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                type="button"
                                onClick={() => setForm({ ...form, payment_type: 'cash' })}
                                className={cn(
                                    "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all",
                                    form.payment_type === 'cash' ? "border-green-500 bg-green-50 text-green-700" : "border-slate-100 bg-white text-slate-500 hover:border-green-200"
                                )}
                            >
                                <Banknote className="w-5 h-5 mb-1" />
                                <span className="text-[10px] font-bold uppercase">Наличные</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setForm({ ...form, payment_type: 'card' })}
                                className={cn(
                                    "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all",
                                    form.payment_type === 'card' ? "border-green-500 bg-green-50 text-green-700" : "border-slate-100 bg-white text-slate-500 hover:border-green-200"
                                )}
                            >
                                <CreditCard className="w-5 h-5 mb-1" />
                                <span className="text-[10px] font-bold uppercase">Карта</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setForm({ ...form, payment_type: 'transfer' })}
                                className={cn(
                                    "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all",
                                    form.payment_type === 'transfer' ? "border-green-500 bg-green-50 text-green-700" : "border-slate-100 bg-white text-slate-500 hover:border-green-200"
                                )}
                            >
                                <Landmark className="w-5 h-5 mb-1" />
                                <span className="text-[10px] font-bold uppercase">Перевод</span>
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="flex-1 h-12 rounded-2xl border-slate-100 font-bold text-slate-500 hover:bg-slate-50 transition-all"
                        >
                            ОТМЕНА
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitting || !form.invoice_id || !form.amount}
                            className={cn(
                                "flex-[2] h-12 bg-gradient-to-r from-emerald-500 to-teal-500",
                                "hover:opacity-90 text-white font-bold rounded-2xl",
                                "text-sm tracking-widest uppercase shadow-xl shadow-green-500/25",
                                "transition-all disabled:opacity-50",
                            )}
                        >
                            {isSubmitting ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                "ОПЛАТИТЬ"
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
