import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, ChevronRight, ChevronLeft, ShoppingCart, Building2, User, Warehouse, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getWarehouses } from '@/api/orders-management';
import { useProductStore } from '@/store/productStore';
import axiosInstance from '@/api/axios';

interface CreateReservationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialOrgId?: number;
    initialOrgType?: string;
    initialMedRepId?: number;
}

const ORG_TYPES = [
    { value: 'pharmacy', label: 'Аптека', icon: '💊' },
    { value: 'clinic', label: 'Клиника', icon: '🏥' },
    { value: 'hospital', label: 'Больница', icon: '🏨' },
];

const STEPS = [
    { id: 1, label: 'Тип' },
    { id: 2, label: 'Представитель' },
    { id: 3, label: 'Организация' },
    { id: 4, label: 'Товары' },
];

export const CreateReservationModal: React.FC<CreateReservationModalProps> = ({
    isOpen, onClose, onSuccess, initialOrgId, initialOrgType, initialMedRepId
}) => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [orgsLoading, setOrgsLoading] = useState(false);

    const [medReps, setMedReps] = useState<any[]>([]);
    const [orgs, setOrgs] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const { products, fetchProducts } = useProductStore();

    const [orgType, setOrgType] = useState<string>(initialOrgType || 'pharmacy');
    const [selectedMedRep, setSelectedMedRep] = useState<string>(initialMedRepId?.toString() || '');
    const [selectedOrg, setSelectedOrg] = useState<string>(initialOrgId?.toString() || '');
    const [selectedWh, setSelectedWh] = useState<string>('');
    const [isBonusEligible, setIsBonusEligible] = useState(true);
    const [isTovarSkidka, setIsTovarSkidka] = useState(false);
    const [eligibleInvoices, setEligibleInvoices] = useState<any[]>([]);
    const [selectedSourceInvoice, setSelectedSourceInvoice] = useState<string>('');
    const [ndsPercent, setNdsPercent] = useState<number>(12);
    const [items, setItems] = useState<any[]>([{ product_id: '', quantity: 1, price: 0, marketing_amount: 0 }]);
    const [showBonusConfirm, setShowBonusConfirm] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setSelectedMedRep('');
            setSelectedOrg('');
            setSelectedWh('');
            setIsBonusEligible(true);
            setIsTovarSkidka(false);
            setEligibleInvoices([]);
            setSelectedSourceInvoice('');
            setItems([{ product_id: '', quantity: 1, price: 0, marketing_amount: 0 }]);
            setShowBonusConfirm(false);
            fetchInitialData();
            fetchProducts();
        }
    }, [isOpen]);

    const fetchInitialData = async () => {
        try {
            const [usersResp, wh] = await Promise.all([
                axiosInstance.get('/users/?limit=200'),
                getWarehouses(),
            ]);
            const users = usersResp.data?.items || usersResp.data || [];
            setMedReps(users.filter((u: any) => u.role === 'med_rep'));
            setWarehouses(wh);
        } catch {
            toast.error('Ошибка загрузки данных');
        }
    };

    const fetchOrgs = async (repId: string, type: string) => {
        if (!repId || !type) return;
        setOrgsLoading(true);
        try {
            const resp = await axiosInstance.get('/crm/med-orgs/', {
                params: { rep_id: repId, limit: 200 }
            });
            const data = resp.data?.items || resp.data || [];
            // Filter by org_type on client side since backend doesn't support this param
            const filtered = type ? data.filter((o: any) => !o.org_type || o.org_type === type) : data;
            setOrgs(filtered);
        } catch {
            toast.error('Ошибка загрузки организаций');
        } finally {
            setOrgsLoading(false);
        }
    };

    const fetchEligibleInvoices = async (orgId: string) => {
        if (!orgId) return;
        try {
            const resp = await axiosInstance.get('/sales/invoices/eligible-for-tovar-skidka', {
                params: { med_org_id: orgId }
            });
            setEligibleInvoices(resp.data || []);
        } catch {
            toast.error('Ошибка загрузки счетов для товарной скидки');
        }
    };

    // Compute stock map from all warehouses: product_id → total quantity
    const stockMap = warehouses.reduce((acc: Record<number, number>, wh: any) => {
        (wh.stocks || []).forEach((s: any) => {
            acc[s.product_id] = (acc[s.product_id] || 0) + s.quantity;
        });
        return acc;
    }, {} as Record<number, number>);

    const handleNext = () => {
        if (step === 2) fetchOrgs(selectedMedRep, orgType);
        if (step === 3 && isTovarSkidka && eligibleInvoices.length === 0) {
            fetchEligibleInvoices(selectedOrg);
        }
        setStep(s => s + 1);
    };

    const addItem = () => setItems([...items, { product_id: '', quantity: 1, price: 0, marketing_amount: 0 }]);
    const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
    const updateItem = (i: number, field: string, value: any) => {
        const next = [...items];
        next[i][field] = value;
        if (field === 'product_id') {
            const p = products.find((pr: any) => pr.id.toString() === value);
            if (p) {
                next[i].price = p.price;
                next[i].marketing_amount = p.marketing_expense || 0;
            }
        }
        setItems(next);
    };

    const handleSubmit = async (forceConfirm = false) => {
        if (items.some(it => !it.product_id)) {
            toast.error('Выберите все товары');
            return;
        }

        // Check if any bonus was modified from default
        const isBonusModified = items.some(it => {
            if (!it.product_id || !isBonusEligible) return false;
            const p = products.find((pr: any) => pr.id.toString() === it.product_id);
            if (!p) return false;
            return parseFloat(it.marketing_amount) !== (p.marketing_expense || 0);
        });

        if (isBonusModified && !forceConfirm && !showBonusConfirm) {
            setShowBonusConfirm(true);
            return;
        }

        setLoading(true);
        try {
            const org = orgs.find(o => o.id.toString() === selectedOrg);
            await axiosInstance.post('/sales/reservations/', {
                customer_name: org?.name || 'Неизвестно',
                med_org_id: parseInt(selectedOrg),
                warehouse_id: parseInt(selectedWh),
                is_bonus_eligible: isBonusEligible,
                is_tovar_skidka: isTovarSkidka,
                source_invoice_id: isTovarSkidka ? parseInt(selectedSourceInvoice) : null,
                nds_percent: ndsPercent,
                items: items.map(it => ({
                    product_id: parseInt(it.product_id),
                    quantity: parseInt(it.quantity),
                    price: parseFloat(it.price),
                    marketing_amount: parseFloat(it.marketing_amount || 0),
                })),
            });
            toast.success('Бронь успешно создана!');
            onSuccess();
            onClose();
        } catch (e: any) {
            toast.error(e.response?.data?.detail || 'Произошла ошибка');
        } finally {
            setLoading(false);
        }
    };

    const selectedMedRepObj = medReps.find(r => r.id.toString() === selectedMedRep);
    const selectedOrgObj = orgs.find(o => o.id.toString() === selectedOrg);
    const selectedOrgTypeObj = ORG_TYPES.find(t => t.value === orgType);
    const subtotal = items.reduce((s, it) => s + (parseFloat(it.price) || 0) * (parseInt(it.quantity) || 0), 0);
    const totalAmount = subtotal * (1 + ndsPercent / 100);

    const canNext = step === 1 ? !!orgType
        : step === 2 ? !!selectedMedRep
            : step === 3 ? (!!selectedOrg && !!selectedWh && (!isTovarSkidka || !!selectedSourceInvoice))
                : false;

    const repName = (r: any) => [r.first_name, r.last_name].filter(Boolean).join(' ') || r.full_name || r.username || `#${r.id}`;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="p-0 overflow-hidden max-w-lg border-0 shadow-2xl rounded-2xl">

                {/* Header */}
                <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 px-6 pt-6 pb-8 text-white relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.15),_transparent_60%)]" />
                    <div className="relative">
                        <ShoppingCart className="w-6 h-6 mb-2 opacity-80" />
                        <h2 className="text-xl font-bold">Новый брон</h2>
                        <p className="text-white/70 text-sm mt-0.5">Шаг {step} / {STEPS.length}</p>
                    </div>

                    {/* Step progress */}
                    <div className="relative flex items-center mt-5 gap-0">
                        {STEPS.map((s, idx) => (
                            <React.Fragment key={s.id}>
                                <div className="flex flex-col items-center">
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all
                                        ${step > s.id ? 'bg-white text-indigo-600 border-white' :
                                            step === s.id ? 'bg-white/20 text-white border-white' :
                                                'bg-white/10 text-white/50 border-white/30'}`}>
                                        {step > s.id ? <Check className="w-3.5 h-3.5" /> : s.id}
                                    </div>
                                    <span className={`text-[10px] mt-1 font-medium text-center ${step >= s.id ? 'text-white' : 'text-white/40'}`}>
                                        {s.label}
                                    </span>
                                </div>
                                {idx < STEPS.length - 1 && (
                                    <div className={`flex-1 h-0.5 mb-4 mx-1 rounded transition-all ${step > s.id ? 'bg-white' : 'bg-white/20'}`} />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-4 min-h-[220px]">

                    {/* Step 1: Тип организации */}
                    {step === 1 && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                            <p className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Выберите тип организации</p>
                            <div className="grid grid-cols-3 gap-3">
                                {ORG_TYPES.map(t => (
                                    <button
                                        key={t.value}
                                        onClick={() => setOrgType(t.value)}
                                        className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all font-medium text-sm
                                            ${orgType === t.value
                                                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md shadow-indigo-100'
                                                : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-slate-50'}`}
                                    >
                                        <span className="text-2xl">{t.icon}</span>
                                        <span>{t.label}</span>
                                        {orgType === t.value && (
                                            <span className="absolute top-2 right-2 w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center">
                                                <Check className="w-2.5 h-2.5 text-white" />
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Мед. представитель */}
                    {step === 2 && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                                    <User className="w-4 h-4 text-indigo-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-slate-800">Выберите мед. представителя</p>
                                    <p className="text-xs text-slate-400">Отобразятся организации типа «{selectedOrgTypeObj?.label}»</p>
                                </div>
                            </div>
                            <div className="grid gap-2 max-h-56 overflow-y-auto pr-1">
                                {medReps.length === 0 ? (
                                    <p className="text-center py-8 text-slate-400 text-sm">Мед. представители не найдены</p>
                                ) : medReps.map(rep => (
                                    <button
                                        key={rep.id}
                                        onClick={() => setSelectedMedRep(rep.id.toString())}
                                        className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all
                                            ${selectedMedRep === rep.id.toString()
                                                ? 'border-indigo-500 bg-indigo-50'
                                                : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'}`}
                                    >
                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                                            {repName(rep)[0]?.toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-slate-800 text-sm truncate">{repName(rep)}</p>
                                            <p className="text-xs text-slate-400">{rep.phone || 'Мед. представитель'}</p>
                                        </div>
                                        {selectedMedRep === rep.id.toString() && (
                                            <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Организация + Склад */}
                    {step === 3 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
                                    <Building2 className="w-4 h-4 text-violet-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-slate-800">Выберите организацию</p>
                                    <p className="text-xs text-slate-400">{repName(selectedMedRepObj || {})} — {selectedOrgTypeObj?.label}</p>
                                </div>
                            </div>

                            {orgsLoading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                                </div>
                            ) : orgs.length === 0 ? (
                                <div className="text-center py-6 text-slate-400">
                                    <Building2 className="w-10 h-10 mx-auto mb-2 opacity-20" />
                                    <p className="text-sm">Организации не найдены</p>
                                </div>
                            ) : (
                                <div className="grid gap-2 max-h-36 overflow-y-auto pr-1">
                                    {orgs.map(org => (
                                        <button
                                            key={org.id}
                                            onClick={() => setSelectedOrg(org.id.toString())}
                                            className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all
                                                ${selectedOrg === org.id.toString()
                                                    ? 'border-violet-500 bg-violet-50'
                                                    : 'border-slate-200 hover:border-violet-300 hover:bg-slate-50'}`}
                                        >
                                            <span className="text-xl">{selectedOrgTypeObj?.icon}</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-slate-800 text-sm truncate">{org.name}</p>
                                                <p className="text-xs text-slate-400">
                                                    {org.inn ? `ИНН: ${org.inn} ` : ''}
                                                    {org.inn && org.address ? '• ' : ''}
                                                    {org.address || (!org.inn ? '—' : '')}
                                                </p>
                                            </div>
                                            {selectedOrg === org.id.toString() && (
                                                <Check className="w-4 h-4 text-violet-600 shrink-0" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Склад */}
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-1.5">
                                    <Warehouse className="w-3.5 h-3.5 text-slate-500" />
                                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Склад</label>
                                </div>
                                <Select value={selectedWh} onValueChange={setSelectedWh}>
                                    <SelectTrigger className="border-slate-200 rounded-xl h-10">
                                        <SelectValue placeholder="Выберите склад..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {warehouses.map(wh => (
                                            <SelectItem key={wh.id} value={wh.id.toString()}>{wh.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Товарная скидка Toggle */}
                            <div className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                                <div>
                                    <p className="text-sm font-semibold text-indigo-900 font-bold">Товарная скидка</p>
                                    <p className="text-xs text-indigo-600">Оплата за счет промо-суммы другого счета</p>
                                </div>
                                <Switch
                                    checked={isTovarSkidka}
                                    onCheckedChange={(v) => {
                                        setIsTovarSkidka(v);
                                        if (v) {
                                            setIsBonusEligible(false);
                                            fetchEligibleInvoices(selectedOrg);
                                        }
                                    }}
                                />
                            </div>

                            {/* Source Invoice Selection */}
                            {isTovarSkidka && (
                                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1">
                                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Выберите счет-фактуру для списания</label>
                                    <Select value={selectedSourceInvoice} onValueChange={setSelectedSourceInvoice}>
                                        <SelectTrigger className="border-indigo-200 rounded-xl h-10 bg-white">
                                            <SelectValue placeholder="Выберите оплаченный счет..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {eligibleInvoices.length === 0 ? (
                                                <div className="p-4 text-center text-slate-400 text-sm italic">
                                                    Нет счетов с доступной промо-суммой
                                                </div>
                                            ) : eligibleInvoices.map((inv: any) => (
                                                <SelectItem key={inv.id} value={inv.id.toString()}>
                                                    Счет №{inv.id} (Доступно: {inv.promo_balance?.toLocaleString()} UZS)
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* Бонус */}
                            <div className={`flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-xl transition-opacity ${isTovarSkidka ? 'opacity-50 pointer-events-none' : ''}`}>
                                <div>
                                    <p className="text-sm font-semibold text-amber-900">Начислять бонус?</p>
                                    <p className="text-xs text-amber-600">Маркетинговая сумма запишется как бонус представителю</p>
                                </div>
                                <Switch checked={isBonusEligible} onCheckedChange={setIsBonusEligible} />
                            </div>
                        </div>
                    )}

                    {/* Step 4: Товары */}
                    {step === 4 && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                                        <ShoppingCart className="w-4 h-4 text-emerald-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">Список товаров</p>
                                        <p className="text-xs text-slate-400">{selectedOrgObj?.name}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={addItem}
                                    className="flex items-center gap-1 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Добавить
                                </button>
                            </div>

                            {isTovarSkidka && selectedSourceInvoice && (
                                <div className={`p-3 rounded-xl border flex items-center justify-between transition-all ${totalAmount > (eligibleInvoices.find(inv => inv.id.toString() === selectedSourceInvoice)?.promo_balance || 0)
                                    ? 'bg-red-50 border-red-200 animate-pulse'
                                    : 'bg-indigo-50 border-indigo-200'
                                    }`}>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-600 uppercase">Доступная промо-сумма:</p>
                                        <p className={`text-sm font-bold ${totalAmount > (eligibleInvoices.find(inv => inv.id.toString() === selectedSourceInvoice)?.promo_balance || 0)
                                            ? 'text-red-600'
                                            : 'text-indigo-700'
                                            }`}>
                                            {(eligibleInvoices.find(inv => inv.id.toString() === selectedSourceInvoice)?.promo_balance || 0).toLocaleString()} UZS
                                        </p>
                                    </div>
                                    {totalAmount > (eligibleInvoices.find(inv => inv.id.toString() === selectedSourceInvoice)?.promo_balance || 0) && (
                                        <p className="text-[10px] text-red-500 font-bold max-w-[150px] text-right leading-tight">
                                            Сумма брони превышает доступный лимит!
                                        </p>
                                    )}
                                </div>
                            )}

                            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                                {items.map((it, idx) => (
                                    <div key={idx} className="flex gap-2 items-start bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                                        <div className="flex-1">
                                            <Select value={it.product_id} onValueChange={v => updateItem(idx, 'product_id', v)}>
                                                <SelectTrigger className="h-8 text-xs border-slate-200 bg-white">
                                                    <SelectValue placeholder="Выберите препарат..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {products.map((p: any) => (
                                                        <SelectItem key={p.id} value={p.id.toString()}>
                                                            <span className="flex items-center gap-2">
                                                                {p.name}
                                                                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${(stockMap[p.id] || 0) > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-500'}`}>
                                                                    {stockMap[p.id] || 0} шт
                                                                </span>
                                                            </span>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {it.product_id && (
                                                <p className={`text-xs mt-1 pl-1 font-medium ${(stockMap[parseInt(it.product_id)] || 0) > 0
                                                    ? 'text-emerald-600'
                                                    : 'text-red-500'
                                                    }`}>
                                                    На складе: {(stockMap[parseInt(it.product_id)] || 0).toLocaleString()} шт
                                                </p>
                                            )}
                                        </div>
                                        <Input
                                            type="number" min={1}
                                            className="h-8 w-16 text-xs border-slate-200 text-center"
                                            value={it.quantity}
                                            onChange={e => updateItem(idx, 'quantity', e.target.value)}
                                            placeholder="Кол."
                                        />
                                        <div className="flex flex-col gap-1 items-end">
                                            <div className="flex items-center gap-1">
                                                <span className="text-[10px] text-slate-400 font-medium">Цена:</span>
                                                <Input
                                                    type="number" min={0}
                                                    className={`h-8 w-24 text-xs border-slate-200 ${isBonusEligible && it.product_id && (parseFloat(it.price) > (products.find(p => p.id.toString() === it.product_id)?.price || 0) * 1.3 || parseFloat(it.price) < (products.find(p => p.id.toString() === it.product_id)?.price || 0) * 0.7) ? 'border-red-500 text-red-600 bg-red-50' : ''}`}
                                                    value={it.price}
                                                    onChange={e => updateItem(idx, 'price', e.target.value)}
                                                    placeholder="Цена"
                                                />
                                            </div>
                                            {isBonusEligible && it.product_id && (
                                                <div className="flex items-center gap-1">
                                                    <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">Промо (Бонус):</span>
                                                    <Input
                                                        type="number" min={0}
                                                        className={`h-8 w-24 text-xs border-slate-200 ${it.product_id && (parseFloat(it.marketing_amount) > parseFloat(it.price) * 0.3) ? 'border-red-500 text-red-600 bg-red-50' : ''}`}
                                                        value={it.marketing_amount}
                                                        onChange={e => updateItem(idx, 'marketing_amount', e.target.value)}
                                                        placeholder="Промо"
                                                    />
                                                </div>
                                            )}
                                            {isBonusEligible && it.product_id && (
                                                <div className="flex flex-col items-end gap-0.5 mt-0.5">
                                                    {(parseFloat(it.price) > (products.find(p => p.id.toString() === it.product_id)?.price || 0) * 1.3 || parseFloat(it.price) < (products.find(p => p.id.toString() === it.product_id)?.price || 0) * 0.7) && (
                                                        <span className="text-[9px] text-red-500 font-bold leading-none">Недопустимая цена! (max ±30%)</span>
                                                    )}
                                                    {(parseFloat(it.marketing_amount) > parseFloat(it.price) * 0.3) && (
                                                        <span className="text-[9px] text-red-500 font-bold leading-none">Max Промо: {(parseFloat(it.price) * 0.3).toLocaleString()} (30% от цены)</span>
                                                    )}
                                                    {(() => {
                                                        const price = parseFloat(it.price);
                                                        const mkt = parseFloat(it.marketing_amount);
                                                        if (!price || isNaN(mkt)) return null;
                                                        const pct = (mkt / price) * 100;
                                                        return (
                                                            <span className={`text-[9px] font-medium leading-none ${pct > 0 ? 'text-emerald-500' : 'text-orange-500'}`}>
                                                                От продукта: {pct.toFixed(1)}%
                                                            </span>
                                                        );
                                                    })()}
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => removeItem(idx)}
                                            className="p-1.5 mt-0.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                                {items.length === 0 && (
                                    <p className="text-center py-6 text-slate-400 text-sm">Товары не добавлены</p>
                                )}
                            </div>

                            {totalAmount > 0 && (
                                <div className="space-y-2 mt-4">
                                    <div className="flex items-center justify-between p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                                        <span className="text-sm font-medium text-slate-600">НДС (VAT) %:</span>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="number" min={0} max={100}
                                                className="w-20 h-8 text-right font-bold text-indigo-700 bg-white border-indigo-200"
                                                value={ndsPercent}
                                                onChange={e => setNdsPercent(parseFloat(e.target.value) || 0)}
                                            />
                                            <span className="text-indigo-600 font-bold">%</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center bg-indigo-50 border border-indigo-200 rounded-xl p-3">
                                        <span className="text-sm text-indigo-700 font-medium">Итоговая сумма (с НДС):</span>
                                        <span className="text-base font-bold text-indigo-800">{totalAmount.toLocaleString()} UZS</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    {step > 1 ? (
                        <button
                            onClick={() => setStep(s => s - 1)}
                            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors px-3 py-2 rounded-lg hover:bg-slate-100"
                        >
                            <ChevronLeft className="w-4 h-4" /> Назад
                        </button>
                    ) : <div />}

                    {step < 4 ? (
                        <button
                            onClick={handleNext}
                            disabled={!canNext}
                            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-200"
                        >
                            Далее <ChevronRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <button
                            onClick={() => handleSubmit()}
                            disabled={
                                loading ||
                                items.length === 0 ||
                                items.some(it => {
                                    if (!isBonusEligible || !it.product_id) return false;
                                    const p = products.find(pr => pr.id.toString() === it.product_id);
                                    if (!p) return false;
                                    const priceDev = Math.abs(parseFloat(it.price) - p.price) / p.price;
                                    const mktExceeds = parseFloat(it.marketing_amount) > parseFloat(it.price) * 0.3;
                                    return priceDev > 0.3 || mktExceeds;
                                }) ||
                                (isTovarSkidka && totalAmount > (eligibleInvoices.find(inv => inv.id.toString() === selectedSourceInvoice)?.promo_balance || 0))
                            }
                            className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-200"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            {loading ? 'Сохранение...' : 'Создать бронь'}
                        </button>
                    )}
                </div>
            </DialogContent>

            {/* Bonus modification confirmation */}
            <Dialog open={showBonusConfirm} onOpenChange={setShowBonusConfirm}>
                <DialogContent className="max-w-sm p-0 overflow-hidden border-0 shadow-2xl rounded-2xl">
                    <div className="bg-amber-500 p-6 text-white text-center">
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Plus className="rotate-45 w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold">Изменена промо-сумма</h3>
                        <p className="text-white/80 text-sm mt-1">
                            Вы изменили размер бонуса вручную. Вы уверены, что хотите продолжить?
                        </p>
                    </div>
                    <div className="p-4 flex gap-3 bg-white">
                        <button
                            onClick={() => setShowBonusConfirm(false)}
                            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
                        >
                            Отмена
                        </button>
                        <button
                            onClick={() => {
                                setShowBonusConfirm(false);
                                handleSubmit(true);
                            }}
                            className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white font-semibold text-sm hover:bg-amber-600 transition-all shadow-md shadow-amber-200"
                        >
                            Да, уверен
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </Dialog>
    );
};
