import React from 'react';
import { Dialog, DialogContent } from "../../../components/ui/dialog";
import { Building2, TrendingUp, Phone, Edit2, X, Check, MapPin, Tag } from "lucide-react";
import { Input } from "../../../components/ui/input";

interface DoctorDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    doctor: any;
    salesPlans: any[];
    salesFacts: any[];
    defaultEditMode?: boolean;
}

export function DoctorDetailModal({ isOpen, onClose, doctor, salesPlans, salesFacts, defaultEditMode = false }: DoctorDetailModalProps) {
    const [isEditing, setIsEditing] = React.useState(false);
    const [editData, setEditData] = React.useState<any>({});
    const [isSaving, setIsSaving] = React.useState(false);

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

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Update logic here
            // await updateDoctor(doctor.id, editData);
            setIsEditing(false);
        } catch (error) {
            console.error("Failed to update doctor", error);
        } finally {
            setIsSaving(false);
        }
    };

    if (!doctor || !isOpen) return null;

    // Filter plans and facts for this specific doctor
    const doctorPlans = salesPlans.filter(p => p.doctor?.id === doctor.id);
    const doctorFacts = salesFacts?.filter(f => f.doctor_id === doctor.id) || [];

    // Group matching facts for this doctor
    const productStats = new Map<number, {
        productName: string;
        planQty: number;
        planAmount: number;
        factQty: number;
        factAmount: number;
    }>();

    doctorPlans.forEach(plan => {
        const pid = plan.product?.id;
        if (!pid) return;

        const current = productStats.get(pid) || {
            productName: plan.product.name,
            planQty: 0,
            planAmount: 0,
            factQty: 0,
            factAmount: 0
        };

        current.planQty += plan.target_quantity;
        current.planAmount += plan.target_amount || 0;
        productStats.set(pid, current);
    });

    doctorFacts.forEach(fact => {
        const pid = fact.product_id;
        const current = productStats.get(pid);
        // We only show facts if there's a corresponding plan, or we could show facts without plans too.
        // Let's create an entry if facts exist without plans, though usually they are tied.
        if (current) {
            current.factQty += fact.quantity;
            current.factAmount += fact.amount || 0;
            productStats.set(pid, current);
        } else {
            // Need product name. If we don't have product object in fact, we might just say "Неизвестный продукт"
            // or we could find it from plans. For now, since usually facts follow plans:
            productStats.set(pid, {
                productName: `Продукт #${pid}`, // Fallback
                planQty: 0,
                planAmount: 0,
                factQty: fact.quantity,
                factAmount: fact.amount || 0
            });
        }
    });

    const statsArray = Array.from(productStats.values());

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[900px] p-0 border-0 shadow-3xl rounded-[40px] overflow-hidden bg-slate-50 max-h-[90vh] overflow-y-auto">
                {/* Header Section */}
                <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 p-10 pb-20 shrink-0">
                    <div className="absolute top-6 right-6 flex gap-2">
                        {!isEditing ? (
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
                                    onClick={() => setIsEditing(false)}
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
                                    />
                                ) : (
                                    <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest border border-blue-500/30">
                                        {doctor.specialty?.name || "Специальность не указана"}
                                    </span>
                                )}
                                <span className="flex items-center gap-1.5 text-slate-400 text-xs font-bold uppercase tracking-widest">
                                    <MapPin className="w-4 h-4 text-emerald-500" />
                                    Категория: {doctor.category?.name || "Нет"}
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
                                    <Input
                                        value={editData[item.field] || ''}
                                        onChange={(e) => setEditData({ ...editData, [item.field]: e.target.value })}
                                        className="h-8 text-xs font-bold text-slate-800"
                                        placeholder={`Введите ${item.label.toLowerCase()}`}
                                    />
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
                                            <div className="bg-slate-50/50 backdrop-blur-sm p-4 rounded-2xl border border-slate-100/50 flex items-start gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold flex-shrink-0 text-lg">
                                                    {doctor.med_org.name.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900 leading-relaxed mb-1">{doctor.med_org.name}</p>
                                                    <p className="text-xs font-medium text-slate-500">{doctor.med_org.address || "Адрес не указан"}</p>
                                                </div>
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
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                                Выполнение планов
                            </div>
                            <div className="overflow-y-auto pr-2 space-y-3 flex-1 custom-scrollbar">
                                {statsArray.length === 0 ? (
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
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
