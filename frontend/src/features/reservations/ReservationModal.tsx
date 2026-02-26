import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogHeader,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { CalendarClock, Plus, Trash2 } from "lucide-react";
import { cn } from "../../lib/utils";
import api from "../../api/axios";

interface ReservationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function ReservationModal({ isOpen, onClose, onSuccess }: ReservationModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form, setForm] = useState({
        med_rep_id: 0,
        med_org_id: 0,
        doctor_id: 0,
        items: [{ product_id: 0, quantity: 1 }]
    });

    const [availableDoctors, setAvailableDoctors] = useState<any[]>([]);
    const [availableOrgs, setAvailableOrgs] = useState<any[]>([]);
    const [availableProducts, setAvailableProducts] = useState<any[]>([]);
    const [availableMedReps, setAvailableMedReps] = useState<any[]>([]);

    React.useEffect(() => {
        if (isOpen) {
            // Fetch necessary reference data
            const fetchData = async () => {
                try {
                    const [doctors, orgs, products, medReps] = await Promise.all([
                        api.get("/crm/doctors/"),
                        api.get("/crm/med-orgs/"),
                        api.get("/products/"),
                        api.get("/users/med-reps")
                    ]);
                    setAvailableDoctors(doctors.data);
                    setAvailableOrgs(orgs.data);
                    setAvailableProducts(products.data);
                    setAvailableMedReps(medReps.data);
                } catch (error) {
                    console.error("Failed to fetch reference data");
                }
            };
            fetchData();
        }
    }, [isOpen]);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            let customerName = "Не указан";
            if (form.doctor_id) {
                const doc = availableDoctors.find(d => d.id === form.doctor_id);
                if (doc) customerName = doc.full_name;
            } else if (form.med_org_id) {
                const org = availableOrgs.find(o => o.id === form.med_org_id);
                if (org) customerName = org.name;
            }

            const itemsToSend = form.items
                .filter(i => i.product_id > 0 && i.quantity > 0)
                .map(i => {
                    const product = availableProducts.find(p => p.id === i.product_id);
                    return {
                        product_id: i.product_id,
                        quantity: i.quantity,
                        price: product ? product.price : 0,
                        discount_percent: 0
                    };
                });

            await api.post('/domain/orders/reservations/', {
                customer_name: customerName,
                med_org_id: form.med_org_id || null,
                warehouse_id: 1, // Central Warehouse
                items: itemsToSend
            });
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Failed to create reservation:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const addItem = () => {
        setForm(prev => ({
            ...prev,
            items: [...prev.items, { product_id: 0, quantity: 1 }]
        }));
    };

    const removeItem = (index: number) => {
        setForm(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index)
        }));
    };

    const updateItem = (index: number, field: string, value: number) => {
        setForm(prev => ({
            ...prev,
            items: prev.items.map((item, i) => i === index ? { ...item, [field]: value } : item)
        }));
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[600px] p-0 border-0 shadow-3xl rounded-[32px] overflow-hidden bg-white">
                <DialogHeader className="relative p-0 h-36 flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-amber-500">
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse" />
                    </div>
                    <div className="relative z-10 flex flex-col items-center gap-3 mt-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-2xl">
                            <CalendarClock className="w-6 h-6 text-white" />
                        </div>
                        <DialogTitle className="text-xl font-bold text-white text-center leading-tight tracking-tight px-4">
                            Создание брони и формирование инвойса
                        </DialogTitle>
                    </div>
                </DialogHeader>

                <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">

                    {/* Routing */}
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Медицинский представитель</label>
                            <select
                                value={form.med_rep_id}
                                onChange={(e) => setForm({ ...form, med_rep_id: Number(e.target.value), med_org_id: 0, doctor_id: 0 })}
                                className="w-full h-12 px-4 rounded-xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 font-semibold text-sm outline-none"
                            >
                                <option value={0}>Выберите представителя...</option>
                                {availableMedReps.map(rep => <option key={rep.id} value={rep.id}>{rep.full_name || rep.username}</option>)}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Больница / Аптека</label>
                                <select
                                    value={form.med_org_id}
                                    onChange={(e) => setForm({ ...form, med_org_id: Number(e.target.value) })}
                                    disabled={!form.med_rep_id}
                                    className="w-full h-12 px-4 rounded-xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 font-semibold text-sm outline-none disabled:opacity-50"
                                >
                                    <option value={0}>Складской отпуск...</option>
                                    {availableOrgs
                                        .filter(o => o.assigned_reps?.some((r: any) => r.id === form.med_rep_id))
                                        .map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Врач (опционально)</label>
                                <select
                                    value={form.doctor_id}
                                    onChange={(e) => setForm({ ...form, doctor_id: Number(e.target.value) })}
                                    disabled={!form.med_rep_id}
                                    className="w-full h-12 px-4 rounded-xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 font-semibold text-sm outline-none disabled:opacity-50"
                                >
                                    <option value={0}>Свободная продажа...</option>
                                    {availableDoctors
                                        .filter(d => d.assigned_rep_id === form.med_rep_id)
                                        .map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Склад отгрузки</label>
                            <select
                                disabled
                                className="w-full h-12 px-4 rounded-xl border border-slate-100 bg-slate-50/50 font-semibold text-sm outline-none opacity-80"
                            >
                                <option value={1}>Центральный склад (Ташкент)</option>
                            </select>
                        </div>
                    </div>

                    {/* Items */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Номенклатура (FOR UPDATE Locks)</label>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={addItem}
                                className="h-8 px-2 text-xs font-bold text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                            >
                                <Plus className="w-3 h-3 mr-1" />
                                Добавить позицию
                            </Button>
                        </div>

                        <div className="space-y-2">
                            {form.items.map((item, index) => (
                                <div key={index} className="flex gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                                    <select
                                        value={item.product_id}
                                        onChange={(e) => updateItem(index, 'product_id', Number(e.target.value))}
                                        className="flex-1 h-10 px-3 rounded-lg border border-slate-200 bg-white font-medium text-sm outline-none"
                                    >
                                        <option value={0}>Выберите препарат...</option>
                                        {availableProducts.map(p => <option key={p.id} value={p.id}>{p.name} - В наличии</option>)}
                                    </select>
                                    <Input
                                        type="number"
                                        min={1}
                                        value={item.quantity}
                                        onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                                        className="w-24 h-10 rounded-lg border-slate-200 text-center font-bold"
                                        placeholder="Кол-во"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeItem(index)}
                                        className="h-10 w-10 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg shrink-0"
                                        disabled={form.items.length === 1}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        className="flex-1 h-12 rounded-2xl border-slate-200 font-bold text-slate-500 hover:bg-slate-100 transition-all"
                    >
                        ОТМЕНА
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting || form.items.some(i => i.product_id === 0) || !form.med_rep_id}
                        className={cn(
                            "flex-[2] h-12 bg-gradient-to-r from-orange-500 to-amber-500",
                            "hover:opacity-90 text-white font-bold rounded-2xl",
                            "text-sm tracking-widest uppercase shadow-xl shadow-orange-500/20",
                            "transition-all disabled:opacity-50",
                        )}
                    >
                        {isSubmitting ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            "ОФОРМИТЬ РЕЗЕРВ"
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
