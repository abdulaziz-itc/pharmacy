import React from 'react';
import { Dialog, DialogContent } from "../../../components/ui/dialog";
import { Building2, TrendingUp, Phone, Edit2, X, Check, MapPin, Tag, Globe, ChevronRight } from "lucide-react";
import { Input } from "../../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { updateDoctor } from "../../../api/crm";
import { getPlans, getDoctorFacts } from "../../../api/sales";
import { Calendar, Loader2 } from "lucide-react";

const MONTHS_RU = [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
];

interface DoctorDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    doctor: any;
    salesPlans: any[];
    salesFacts: any[];
    bonusPayments?: any[];
    products?: any[];
    defaultEditMode?: boolean;
    readOnly?: boolean;
}

export function DoctorDetailModal({ isOpen, onClose, onSuccess, doctor, salesPlans, salesFacts, bonusPayments = [], products = [], defaultEditMode = false, readOnly = false }: DoctorDetailModalProps) {
    const [isEditing, setIsEditing] = React.useState(false);
    const [editData, setEditData] = React.useState<any>({});
    const [isSaving, setIsSaving] = React.useState(false);
    const [orgModalOpen, setOrgModalOpen] = React.useState(false);
    const [selMonth, setSelMonth] = React.useState<string>((new Date().getMonth() + 1).toString());
    const [selYear, setSelYear] = React.useState<string>(new Date().getFullYear().toString());
    const [filteredPlans, setFilteredPlans] = React.useState<any[]>([]);
    const [fetchedFacts, setFetchedFacts] = React.useState<any[]>([]);
    const [isLoadingPlans, setIsLoadingPlans] = React.useState(false);

    React.useEffect(() => {
        if (doctor && isOpen) {
            setEditData({
                full_name: doctor.full_name || '',
                specialty: doctor.specialty?.name || '',
                category: doctor.category?.name || '',
                contact1: doctor.contact1 || '',
                med_org_id: doctor.med_org?.id || null, // Might need org selection later
            });
            setIsEditing(defaultEditMode);
        }
    }, [doctor, isOpen, defaultEditMode]);

    React.useEffect(() => {
        if (doctor && isOpen) {
            const fetchDoctorData = async () => {
                try {
                    setIsLoadingPlans(true);
                    const [plans, facts] = await Promise.all([
                        getPlans(parseInt(selMonth), parseInt(selYear), undefined, doctor.id),
                        getDoctorFacts(undefined, doctor.id)
                    ]);
                    setFilteredPlans(plans);
                    setFetchedFacts(facts);
                } catch (error) {
                    console.error("Failed to fetch doctor data", error);
                    setFilteredPlans([]);
                    setFetchedFacts([]);
                } finally {
                    setIsLoadingPlans(false);
                }
            };
            fetchDoctorData();
        }
    }, [doctor?.id, isOpen, selMonth, selYear]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateDoctor(doctor.id, {
                full_name: editData.full_name,
                contact1: editData.contact1,
                // Only sending category_name to avoid overwriting or breaking specialty if it isn't an ID
                category_name: editData.category || null,
            });
            setIsEditing(false);
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error("Failed to update doctor", error);
        } finally {
            setIsSaving(false);
        }
    };

    if (!doctor || !isOpen) return null;

    // We explicitly fetched plans and facts for the selected month/year. 
    // Do not falback to salesPlans (which contains all time plans) if filtered is empty.
    const activePlans = isLoadingPlans ? [] : filteredPlans;
    const doctorFacts = isLoadingPlans ? [] : fetchedFacts;

    const doctorBonuses = bonusPayments.filter(b => b.doctor_id === doctor.id);

    // Group matching facts for this doctor
    const productStats = new Map<number, {
        productName: string;
        planQty: number;
        planAmount: number;
        factQty: number;
        factAmount: number;
    }>();

    // Use LATEST plan per product to avoid double-counting if duplicates exist in the DB
    const sortedPlans = [...activePlans].sort((a: any, b: any) => (a.id || 0) - (b.id || 0));

    sortedPlans.forEach((plan: any) => {
        const pid = plan.product?.id || plan.product_id;
        if (!pid) return;

        const current = productStats.get(pid) || {
            productName: plan.product?.name || `Продукт #${pid}`,
            planQty: 0,
            planAmount: 0,
            factQty: 0,
            factAmount: 0
        };

        // Overwrite so the latest plan wins
        current.planQty = plan.target_quantity || 0;
        current.planAmount = plan.target_amount || 0;

        // If the backend has already aggregated facts for this plan, keep it
        if (plan.fact_quantity !== undefined && plan.fact_quantity !== null) {
            current.factQty = plan.fact_quantity; // Overwrite because we assume backend gave total
        }

        productStats.set(pid, current);
    });

    // Add facts to the stats map
    doctorFacts.forEach(fact => {
        // Handle both backend DoctorFactAssignment and frontend SaleFact formats
        const m = fact.month || (fact.created_at ? new Date(fact.created_at).getMonth() + 1 : (fact.date ? new Date(fact.date).getMonth() + 1 : 0));
        const y = fact.year || (fact.created_at ? new Date(fact.created_at).getFullYear() : (fact.date ? new Date(fact.date).getFullYear() : 0));

        if (m !== parseInt(selMonth) || y !== parseInt(selYear)) return;

        const pid = fact.product_id;
        const current = productStats.get(pid) || {
            productName: fact.product?.name || `Продукт #${pid}`,
            planQty: 0,
            planAmount: 0,
            factQty: 0,
            factAmount: 0
        };

        current.factQty += fact.quantity || 0;
        current.factAmount += fact.amount || 0;
        productStats.set(pid, current);
    });

    const statsArray = Array.from(productStats.values());

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="sm:max-w-[900px] p-0 border-0 shadow-3xl rounded-[40px] overflow-hidden bg-slate-50 max-h-[90vh] overflow-y-auto">
                    {/* Header Section */}
                    <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 p-10 pb-20 shrink-0">
                        <div className="absolute top-6 right-6 flex gap-2">
                            {!readOnly && (
                                !isEditing ? (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="p-2 rounded-full bg-blue-500/20 hover:bg-blue-500/40 text-blue-300 hover:text-white transition-all flex items-center gap-2 px-4 shadow-sm"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                        <span className="text-xs font-bold uppercase tracking-wider">Редактировать</span>
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => {
                                                setIsEditing(false);
                                                // Revert changes
                                                setEditData({
                                                    full_name: doctor.full_name || '',
                                                    specialty: doctor.specialty?.name || '',
                                                    category: doctor.category?.name || '',
                                                    contact1: doctor.contact1 || '',
                                                    med_org_id: doctor.med_org?.id || null,
                                                });
                                            }}
                                            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all shadow-sm"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={handleSave}
                                            disabled={isSaving}
                                            className="p-2 rounded-full bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 hover:text-emerald-100 transition-all flex items-center gap-2 px-4 shadow-sm"
                                        >
                                            <Check className="w-4 h-4" />
                                            <span className="text-xs font-bold uppercase tracking-wider">{isSaving ? 'Сохранение...' : 'Сохранить'}</span>
                                        </button>
                                    </>
                                )
                            )}
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all ml-2"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex items-center gap-8">
                            <div className="w-24 h-24 rounded-3xl bg-blue-500 flex items-center justify-center text-white shadow-2xl shadow-blue-500/40 transform rotate-3 flex-shrink-0">
                                <span className="text-4xl font-black">
                                    {(editData.full_name || doctor.full_name)?.substring(0, 2).toUpperCase()}
                                </span>
                            </div>
                            <div className="space-y-4 flex-1">
                                {isEditing ? (
                                    <Input
                                        value={editData.full_name}
                                        onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
                                        className="text-2xl font-black text-slate-800 bg-white border-0 h-12 w-full max-w-md rounded-xl"
                                        placeholder="Полное имя врача"
                                    />
                                ) : (
                                    <h2 className="text-3xl font-black text-white tracking-tight leading-tight">
                                        {doctor.full_name}
                                    </h2>
                                )}

                                <div className="flex items-center gap-3">
                                    {isEditing ? (
                                        <Input
                                            value={editData.specialty}
                                            onChange={(e) => setEditData({ ...editData, specialty: e.target.value })}
                                            className="h-8 px-3 rounded-full bg-white text-slate-800 text-xs w-[200px]"
                                            placeholder="Специальность"
                                            disabled // Need ID lookup for specialty, keep disabled for now to avoid errors
                                        />
                                    ) : (
                                        <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest border border-blue-500/30">
                                            {doctor.specialty?.name || "Специальность не указана"}
                                        </span>
                                    )}
                                    <span className="flex items-center gap-1.5 text-slate-400 text-xs font-bold uppercase tracking-widest">
                                        <MapPin className="w-4 h-4 text-emerald-500" />
                                        Категория: {isEditing ? editData.category : (doctor.category?.name || "Нет")}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content Section */}
                    <div className="px-10 -mt-10 pb-10 space-y-8 relative z-10">

                        {/* Info Grid */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { label: "Специальность", field: 'specialty', icon: Tag, color: "text-emerald-600", bg: "bg-emerald-50", value: doctor.specialty?.name || "—" },
                                { label: "Категория", field: 'category', icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50", value: doctor.category?.name || "—" },
                                { label: "Телефон", field: 'contact1', icon: Phone, color: "text-indigo-600", bg: "bg-indigo-50", value: doctor.contact1 || "—" },
                                { label: "Организация", field: 'med_org', icon: Building2, color: "text-amber-600", bg: "bg-amber-50", value: doctor.med_org?.name || "—" },
                            ].map((item, i) => (
                                <div key={i} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm transition-all duration-300 group">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className={`p-2 rounded-xl ${item.bg} ${item.color} group-hover:scale-110 transition-transform`}>
                                            <item.icon className="w-4 h-4" />
                                        </div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</span>
                                    </div>
                                    {isEditing && item.field !== 'med_org' ? (
                                        item.field === 'category' ? (
                                            <Select
                                                value={editData.category || ''}
                                                onValueChange={(val) => setEditData({ ...editData, category: val })}
                                            >
                                                <SelectTrigger className="h-8 text-xs font-bold text-slate-800 border-slate-200">
                                                    <SelectValue placeholder="Выберите категорию" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl shadow-xl">
                                                    {['VIP', 'A', 'B', 'C'].map(c => (
                                                        <SelectItem key={c} value={c} className="text-xs font-bold cursor-pointer rounded-lg mx-1 my-0.5 focus:bg-blue-50 focus:text-blue-600">{c}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <Input
                                                value={editData[item.field] || ''}
                                                onChange={(e) => setEditData({ ...editData, [item.field]: e.target.value })}
                                                className="h-8 text-xs font-bold text-slate-800"
                                                placeholder={`Введите ${item.label.toLowerCase()}`}
                                                disabled={item.field === 'specialty'} // Prevent string mutation for references
                                            />
                                        )
                                    ) : (
                                        <div className="text-xs font-bold text-slate-800 line-clamp-1">
                                            {item.value || "—"}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                            {/* Organization & Location Section */}
                            <div className="space-y-8">
                                <div className="bg-white p-8 rounded-[36px] border border-slate-100 shadow-sm relative overflow-hidden group">
                                    <div className="relative z-10">
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                            <Building2 className="w-3.5 h-3.5" />
                                            Привязанная организация
                                        </div>
                                        {doctor.med_org ? (
                                            <div className="space-y-6">
                                                <div
                                                    className="bg-slate-50/50 backdrop-blur-sm p-4 rounded-2xl border border-slate-100/50 flex items-start gap-4 cursor-pointer hover:bg-indigo-50/60 hover:border-indigo-100 transition-all group/org"
                                                    onClick={() => setOrgModalOpen(true)}
                                                >
                                                    <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold flex-shrink-0 text-lg group-hover/org:bg-indigo-200 transition-colors">
                                                        {doctor.med_org.name.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-sm font-bold text-slate-900 leading-relaxed mb-1">{doctor.med_org.name}</p>
                                                        <p className="text-xs font-medium text-slate-500">{doctor.med_org.address || "Адрес не указан"}</p>
                                                    </div>
                                                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover/org:text-indigo-400 mt-1 flex-shrink-0 transition-colors" />
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-sm font-bold text-slate-500 py-4 opacity-50 text-center">Нет привязанных организаций</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Plans Section */}
                            <div className="bg-white p-8 rounded-[36px] border border-slate-100 shadow-sm flex flex-col h-[400px]">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                                        Выполнение планов
                                    </div>
                                    <div className="flex gap-2">
                                        <Select value={selMonth} onValueChange={setSelMonth}>
                                            <SelectTrigger className="h-7 w-24 text-[10px] font-bold border-slate-200 bg-slate-50/50">
                                                <Calendar className="w-3 h-3 mr-1 text-blue-500" />
                                                <SelectValue placeholder="Месяц" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {MONTHS_RU.map((m, i) => (
                                                    <SelectItem key={i + 1} value={(i + 1).toString()} className="text-[10px] font-bold">{m}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Select value={selYear} onValueChange={setSelYear}>
                                            <SelectTrigger className="h-7 w-20 text-[10px] font-bold border-slate-200 bg-slate-50/50">
                                                <SelectValue placeholder="Год" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {[2024, 2025, 2026].map(y => (
                                                    <SelectItem key={y} value={y.toString()} className="text-[10px] font-bold">{y}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="overflow-y-auto pr-2 space-y-3 flex-1 custom-scrollbar">
                                    {isLoadingPlans ? (
                                        <div className="flex items-center justify-center py-20">
                                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                                        </div>
                                    ) : statsArray.length === 0 ? (
                                        <div className="text-center py-12">
                                            <TrendingUp className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                                            <p className="text-sm font-bold text-slate-400">У врача нет активных планов</p>
                                        </div>
                                    ) : (
                                        statsArray.map((stat, idx) => {
                                            const percent = stat.planQty > 0 ? Math.round((stat.factQty / stat.planQty) * 100) : 0;

                                            let colorClass = "bg-slate-500";
                                            let bgClass = "bg-slate-100";
                                            if (percent < 50) {
                                                colorClass = "bg-red-500";
                                                bgClass = "bg-red-50";
                                            } else if (percent < 75) {
                                                colorClass = "bg-amber-500";
                                                bgClass = "bg-amber-50";
                                            } else {
                                                colorClass = "bg-emerald-500";
                                                bgClass = "bg-emerald-50";
                                            }

                                            return (
                                                <div key={idx} className={`p-4 rounded-xl border border-slate-100 transition-all ${bgClass}`}>
                                                    <div className="flex justify-between items-center mb-3">
                                                        <h4 className="font-bold text-slate-900 text-sm">{stat.productName}</h4>
                                                        <span className={`text-xs font-black ${percent >= 75 ? 'text-emerald-700' : percent >= 50 ? 'text-amber-700' : 'text-red-700'}`}>
                                                            {percent}%
                                                        </span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-slate-200/60 rounded-full overflow-hidden mb-3">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-1000 ${colorClass}`}
                                                            style={{ width: `${Math.min(percent, 100)}%` }}
                                                        />
                                                    </div>
                                                    <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">
                                                        <div>План: <span className="ml-1 text-slate-800">{stat.planQty}</span></div>
                                                        <div>Факт: <span className="ml-1 text-slate-800">{stat.factQty}</span></div>
                                                    </div>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            </div>

                            {/* Bonuses Section */}
                            {doctorBonuses.length > 0 && (
                                <div className="bg-white rounded-[36px] overflow-hidden border border-slate-100 shadow-sm xl:col-span-2">
                                    <div className="p-8 pb-6 border-b border-slate-100/80">
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                                            Прединвестиции и Бонусы
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto p-4 pt-0">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="text-[10px] font-bold uppercase text-slate-400 border-b border-slate-100">
                                                    <th className="text-left py-4 px-4">Период</th>
                                                    <th className="text-left py-4 px-4">Продукт</th>
                                                    <th className="text-left py-4 px-4">Дата</th>
                                                    <th className="text-right py-4 px-4">Сумма</th>
                                                    <th className="text-right py-4 px-4">Факт</th>
                                                    <th className="text-right py-4 px-4">Предынвест</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {doctorBonuses.map((bp, idx) => {
                                                    const earnedBonus = doctorFacts.filter(f => {
                                                        // Handle both backend DoctorFactAssignment and frontend SaleFact formats
                                                        const m = f.month || (f.created_at ? new Date(f.created_at).getMonth() + 1 : (f.date ? new Date(f.date).getMonth() + 1 : 0));
                                                        const y = f.year || (f.created_at ? new Date(f.created_at).getFullYear() : (f.date ? new Date(f.date).getFullYear() : 0));

                                                        return m === bp.for_month &&
                                                            y === bp.for_year &&
                                                            (!bp.product_id || f.product_id === bp.product_id);
                                                    }).reduce((sum, f) => {
                                                        // If f has product.marketing_expense, use it. Otherwise, look up from `products` prop
                                                        const p = products.find(prod => prod.id === f.product_id);
                                                        const rate = f.product?.marketing_expense || p?.marketing_expense || 0;
                                                        return sum + (f.quantity * rate);
                                                    }, 0);

                                                    const predinvest = Math.max(0, bp.amount - earnedBonus);

                                                    return (
                                                        <tr key={idx} className="hover:bg-blue-50/30 transition-colors group">
                                                            <td className="py-4 px-4">
                                                                <span className="font-bold text-blue-700">
                                                                    {MONTHS_RU[bp.for_month - 1]} {bp.for_year}
                                                                </span>
                                                                {bp.notes && <p className="text-[9px] text-slate-400 italic mt-0.5">{bp.notes}</p>}
                                                            </td>
                                                            <td className="py-4 px-4">
                                                                {bp.product ? (
                                                                    <span className="bg-violet-50 text-violet-700 border border-violet-200 rounded-lg px-2 py-0.5 font-semibold text-[10px]">
                                                                        {bp.product.name}
                                                                    </span>
                                                                ) : <span className="text-slate-300">—</span>}
                                                            </td>
                                                            <td className="py-4 px-4 text-slate-500 font-medium whitespace-nowrap">
                                                                {bp.paid_date ? bp.paid_date : "—"}
                                                            </td>
                                                            <td className="py-4 px-4 text-right font-black text-blue-700 whitespace-nowrap">
                                                                {new Intl.NumberFormat('ru-RU').format(bp.amount)}
                                                            </td>
                                                            <td className="py-4 px-4 text-right text-slate-600 font-semibold whitespace-nowrap">
                                                                {new Intl.NumberFormat('ru-RU').format(earnedBonus)}
                                                            </td>
                                                            <td className="py-4 px-4 text-right whitespace-nowrap">
                                                                {predinvest > 0 ? (
                                                                    <span className="font-black text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
                                                                        {new Intl.NumberFormat('ru-RU').format(predinvest)}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-slate-300">—</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Read-only Organization Info Modal */}
            {
                doctor.med_org && (
                    <Dialog open={orgModalOpen} onOpenChange={setOrgModalOpen}>
                        <DialogContent className="sm:max-w-[480px] p-0 border-0 shadow-2xl rounded-[32px] overflow-hidden bg-white">
                            {/* Header */}
                            <div className="bg-gradient-to-br from-indigo-600 to-indigo-500 px-8 pt-8 pb-12 relative">
                                <button
                                    onClick={() => setOrgModalOpen(false)}
                                    className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-2xl bg-white/20 text-white flex items-center justify-center font-black text-2xl flex-shrink-0">
                                        {doctor.med_org.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-white font-black text-lg leading-snug">{doctor.med_org.name}</p>
                                        <p className="text-indigo-200 text-xs font-medium mt-0.5 capitalize">{doctor.med_org.org_type === 'clinic' ? 'Клиника' : doctor.med_org.org_type || 'Организация'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Body */}
                            <div className="px-8 -mt-6 pb-8 space-y-3 relative z-10">
                                {[
                                    { icon: MapPin, label: 'Адрес', value: doctor.med_org.address || '—' },
                                    { icon: Phone, label: 'Телефон', value: doctor.med_org.phone || '—' },
                                    { icon: Building2, label: 'Директор', value: doctor.med_org.director_name || '—' },
                                    { icon: Globe, label: 'ИНН', value: doctor.med_org.inn || '—' },
                                    { icon: Globe, label: 'Бренд', value: doctor.med_org.brand || '—' },
                                ].map(({ icon: Icon, label, value }) => (
                                    <div key={label} className="bg-slate-50 rounded-2xl px-5 py-4 flex items-start gap-4 border border-slate-100">
                                        <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                            <Icon className="w-4 h-4 text-indigo-400" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
                                            <p className="text-sm font-semibold text-slate-700">{value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
        </>);
}
