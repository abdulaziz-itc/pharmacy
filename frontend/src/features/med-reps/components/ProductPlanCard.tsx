import React, { useEffect, useMemo } from "react";
import { Button } from "../../../components/ui/button";
import { Pencil, Plus } from "lucide-react";
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
import { DatePicker } from "../../../components/ui/date-picker";
import { Popover, PopoverContent, PopoverTrigger } from "../../../components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { useProductStore } from "../../../store/productStore";


interface Plan {
    id: number;
    product?: {
        id: number;
        name: string;
    };
    doctor?: {
        id: number;
        full_name: string;
    };
    target_amount: number;
    target_quantity: number;
}

interface Fact {
    id: number;
    product_id: number;
    doctor_id?: number;
    amount: number;
    quantity: number;
}

interface ProductPlanCardProps {
    plans?: Plan[];
    facts?: Fact[];
    onAddPlan?: (planData: {
        product_id: number;
        doctor_id?: number;
        target_quantity: number;
        target_amount: number;
        month: number;
        year: number;
    }) => Promise<void>;
    onEditPlan?: (planId: number, planData: {
        product_id: number;
        target_quantity: number;
        target_amount: number;
        month: number;
        year: number;
    }) => Promise<void>;
    onAssignFact?: (factData: {
        product_id: number;
        doctor_id: number;
        quantity: number;
        month: number;
        year: number;
    }) => Promise<void>;
    doctors?: any[];
}

export function ProductPlanCard({ plans = [], facts = [], onAddPlan, onEditPlan, onAssignFact, doctors = [] }: ProductPlanCardProps) {
    const [currentMonth, setCurrentMonth] = React.useState<number>(new Date().getMonth() + 1);
    const [currentYear, setCurrentYear] = React.useState<number>(new Date().getFullYear());
    const [isAddOpen, setIsAddOpen] = React.useState(false);

    // Plan Edit States
    const [isEditOpen, setIsEditOpen] = React.useState(false);
    const [editingPlanId, setEditingPlanId] = React.useState<number | null>(null);
    const [editingProductId, setEditingProductId] = React.useState<number | null>(null);
    const [editPlanQuantity, setEditPlanQuantity] = React.useState("");
    const [isEditSubmitting, setIsEditSubmitting] = React.useState(false);

    // Plan Assign States
    const [isAssignOpen, setIsAssignOpen] = React.useState(false);
    const [assigningProductId, setAssigningProductId] = React.useState<number | null>(null);
    const [assignDoctorId, setAssignDoctorId] = React.useState("");
    const [assignQuantity, setAssignQuantity] = React.useState("");
    const [isAssignSubmitting, setIsAssignSubmitting] = React.useState(false);
    const [assignMonth, setAssignMonth] = React.useState<number>(new Date().getMonth() + 1);
    const [assignYear, setAssignYear] = React.useState<number>(new Date().getFullYear());

    // Fact Assign States
    const [isAssignFactOpen, setIsAssignFactOpen] = React.useState(false);
    const [assigningFactProductId, setAssigningFactProductId] = React.useState<number | null>(null);
    const [assignFactDoctorId, setAssignFactDoctorId] = React.useState<number | null>(null);
    const [assignFactQuantity, setAssignFactQuantity] = React.useState("");
    const [isAssignFactSubmitting, setIsAssignFactSubmitting] = React.useState(false);


    // Plan Modal States
    const [selectedProductId, setSelectedProductId] = React.useState<number | null>(null);
    const [productSearchQuery, setProductSearchQuery] = React.useState("");
    const [planQuantity, setPlanQuantity] = React.useState("");
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const { products, fetchProducts } = useProductStore();

    useEffect(() => {
        if (isAddOpen && products.length === 0) {
            fetchProducts();
        }
    }, [isAddOpen, products.length, fetchProducts]);

    // Active products for combobox
    const activeProducts = useMemo(() => products.filter(p => p.is_active), [products]);

    // Filtered by search
    const filteredProducts = useMemo(() => {
        if (!productSearchQuery) return activeProducts;
        const q = productSearchQuery.toLowerCase();
        return activeProducts.filter(p => p.name.toLowerCase().includes(q));
    }, [activeProducts, productSearchQuery]);

    // Cleanup state on close
    useEffect(() => {
        if (!isAddOpen) {
            setSelectedProductId(null);
            setProductSearchQuery("");
            setPlanQuantity("");
        }
    }, [isAddOpen]);

    const handleAddPlan = async () => {
        if (!onAddPlan || !selectedProductId) return;

        try {
            setIsSubmitting(true);
            const qty = parseInt(planQuantity, 10);
            const product = products.find(p => p.id === selectedProductId);
            const targetAmount = product ? product.price * qty : 0;

            // Use selected month/year
            const month = currentMonth;
            const year = currentYear;

            await onAddPlan({
                product_id: selectedProductId,
                target_quantity: qty,
                target_amount: targetAmount,
                month,
                year
            });
            setIsAddOpen(false);
        } catch (error) {
            console.error("Failed to add plan", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditPlan = async () => {
        if (!onEditPlan || !editingPlanId || !editingProductId) return;

        try {
            setIsEditSubmitting(true);
            const qty = parseInt(editPlanQuantity, 10);
            const product = products.find(p => p.id === editingProductId);
            const targetAmount = product ? product.price * qty : 0;

            const month = currentMonth;
            const year = currentYear;

            await onEditPlan(editingPlanId, {
                product_id: editingProductId,
                target_quantity: qty,
                target_amount: targetAmount,
                month,
                year
            });
            setIsEditOpen(false);
        } catch (error) {
            console.error("Failed to edit plan", error);
        } finally {
            setIsEditSubmitting(false);
        }
    };

    const handleAssignPlan = async () => {
        if (!onAddPlan || !assigningProductId || !assignDoctorId) return;
        try {
            setIsAssignSubmitting(true);
            const qty = parseInt(assignQuantity, 10);
            const product = products.find(p => p.id === assigningProductId);
            const targetAmount = product ? product.price * qty : 0;

            await onAddPlan({
                product_id: assigningProductId,
                doctor_id: parseInt(assignDoctorId),
                target_quantity: qty,
                target_amount: targetAmount,
                month: assignMonth,
                year: assignYear
            });
            setIsAssignOpen(false);
            setAssignDoctorId("");
            setAssignQuantity("");
        } catch (error) {
            console.error("Failed to assign plan", error);
        } finally {
            setIsAssignSubmitting(false);
        }
    };

    const handleAssignFact = async () => {
        if (!onAssignFact || !assigningFactProductId || !assignFactDoctorId) return;
        try {
            setIsAssignFactSubmitting(true);
            const qty = parseInt(assignFactQuantity, 10);
            const month = currentMonth;
            const year = currentYear;

            await onAssignFact({
                product_id: assigningFactProductId,
                doctor_id: assignFactDoctorId,
                quantity: qty,
                month,
                year
            });
            setIsAssignFactOpen(false);
            setAssignFactDoctorId(null);
            setAssignFactQuantity("");
            setAssigningFactProductId(null);
        } catch (error) {
            console.error("Failed to assign fact", error);
        } finally {
            setIsAssignFactSubmitting(false);
        }
    };


    // Group by product first to get the unified stats
    const productStats = React.useMemo(() => {
        const stats = new Map<number, {
            productId: number,
            name: string,
            mainPlanId: number | null,
            mainPlanQty: number,
            mainPlanAmount: number,
            mainFactQty: number,
            mainFactAmount: number,
            doctorPlans: Array<{
                planId: number;
                doctorId: number;
                doctorName: string;
                planQty: number;
                planAmount: number;
                factQty: number;
                factAmount: number;
            }>
        }>();

        plans.forEach(p => {
            if (!p.product) return;
            const pid = p.product.id;
            const current = stats.get(pid) || {
                productId: pid,
                name: p.product.name,
                mainPlanId: null,
                mainPlanQty: 0,
                mainPlanAmount: 0,
                mainFactQty: 0,
                mainFactAmount: 0,
                doctorPlans: []
            };

            if (p.doctor) {
                current.doctorPlans.push({
                    planId: p.id,
                    doctorId: p.doctor.id,
                    doctorName: p.doctor.full_name,
                    planQty: p.target_quantity,
                    planAmount: p.target_amount || 0,
                    factQty: 0,
                    factAmount: 0
                });
            } else {
                current.mainPlanId = p.id;
                current.mainPlanQty += p.target_quantity;
                current.mainPlanAmount += p.target_amount || 0;
            }
            stats.set(pid, current);
        });

        // Add doctors who might only have facts, not plans
        facts.forEach(f => {
            if (f.doctor_id) {
                const doc = doctors.find(d => d.id === f.doctor_id);
                if (doc) {
                    const current = stats.get(f.product_id);
                    if (current) {
                        const existingDocPlan = current.doctorPlans.find(d => d.doctorId === f.doctor_id);
                        if (!existingDocPlan) {
                            current.doctorPlans.push({
                                planId: -1, // Dummy ID
                                doctorId: f.doctor_id,
                                doctorName: doc.full_name,
                                planQty: 0,
                                planAmount: 0,
                                factQty: 0,
                                factAmount: 0
                            });
                        }
                    }
                }
            }
        });

        facts.forEach(f => {
            if (stats.has(f.product_id)) {
                const current = stats.get(f.product_id)!;
                if (f.doctor_id) {
                    const docPlan = current.doctorPlans.find(d => d.doctorId === f.doctor_id);
                    if (docPlan) {
                        docPlan.factQty += f.quantity;
                        docPlan.factAmount += f.amount || 0;
                    }
                } else {
                    current.mainFactQty += f.quantity;
                    current.mainFactAmount += f.amount || 0;
                }
            }
        });

        return Array.from(stats.values());
    }, [plans, facts]);

    // Calculate totals based on the aggregated productStats
    const totalPlanQuantity = productStats.reduce((sum, p) => sum + Math.max(p.mainPlanQty, p.doctorPlans.reduce((acc, d) => acc + d.planQty, 0)), 0);
    const totalFactQuantity = productStats.reduce((sum, p) => sum + p.mainFactQty + p.doctorPlans.reduce((acc, d) => acc + d.factQty, 0), 0);
    const totalPlanAmount = productStats.reduce((sum, p) => sum + Math.max(p.mainPlanAmount, p.doctorPlans.reduce((acc, d) => acc + d.planAmount, 0)), 0);
    const totalFactAmount = productStats.reduce((sum, p) => sum + p.mainFactAmount + p.doctorPlans.reduce((acc, d) => acc + d.factAmount, 0), 0);

    const totalSalary = useMemo(() => {
        let sum = 0;
        facts.forEach(f => {
            if (!f.doctor_id) {
                const product = products.find(p => p.id === f.product_id);
                if (product) {
                    sum += f.quantity * (product.salary_expense || 0);
                }
            }
        });
        return sum;
    }, [facts, products]);

    const totalBonus = useMemo(() => {
        let totalMarketing = 0;
        let doctorMarketing = 0;

        facts.forEach(f => {
            const product = products.find(p => p.id === f.product_id);
            if (product) {
                if (!f.doctor_id) {
                    totalMarketing += f.quantity * (product.marketing_expense || 0);
                } else {
                    doctorMarketing += f.quantity * (product.marketing_expense || 0);
                }
            }
        });

        return Math.max(0, totalMarketing - doctorMarketing);
    }, [facts, products]);


    return (
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/60 overflow-hidden h-full">
            <div className="p-5 border-b border-slate-100/80 flex flex-wrap justify-between items-center gap-3 bg-slate-50/30">
                <h3 className="text-xl font-black text-slate-900 tracking-tight">План по продукту</h3>

                <div className="flex flex-wrap gap-2 items-center">
                    <div className="flex items-center gap-2 border border-slate-200 bg-white rounded-xl px-2 py-1 shadow-sm">
                        <Select value={currentMonth.toString()} onValueChange={(v) => setCurrentMonth(parseInt(v))}>
                            <SelectTrigger className="h-8 w-[100px] border-none bg-transparent shadow-none font-bold text-xs focus:ring-0">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200">
                                {[
                                    [1, 'Январь'], [2, 'Февраль'], [3, 'Март'], [4, 'Апрель'],
                                    [5, 'Май'], [6, 'Июнь'], [7, 'Июль'], [8, 'Август'],
                                    [9, 'Сентябрь'], [10, 'Октябрь'], [11, 'Ноябрь'], [12, 'Декабрь']
                                ].map(([num, name]) => (
                                    <SelectItem key={num} value={num.toString()} className="text-xs font-medium">{name as string}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center gap-2 border border-slate-200 bg-white rounded-xl px-2 py-1 shadow-sm">
                        <Input
                            type="number"
                            className="h-8 w-[80px] border-none bg-transparent shadow-none font-bold text-xs focus-visible:ring-0 text-center"
                            value={currentYear}
                            onChange={(e) => setCurrentYear(parseInt(e.target.value) || new Date().getFullYear())}
                        />
                    </div>

                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="font-bold text-blue-600 border-blue-200 hover:bg-blue-50 rounded-xl px-4 uppercase text-[10px] tracking-widest shadow-sm h-9">
                                <Plus className="w-3.5 h-3.5 mr-1" />
                                добавить
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px] rounded-3xl">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-black text-slate-900">Добавить продукт в план</DialogTitle>
                                <DialogDescription className="text-slate-500 text-xs">
                                    Выберите продукт и установите план продаж для представителя.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2 relative">
                                    <Label htmlFor="product" className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Продукт</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                className={`w-full justify-between h-11 rounded-xl border-slate-200 font-normal ${!selectedProductId ? "text-slate-500" : "text-slate-900 font-medium"}`}
                                            >
                                                {selectedProductId
                                                    ? products.find((product) => product.id === selectedProductId)?.name
                                                    : "Выберите продукт..."}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[375px] p-2 rounded-2xl border-slate-100 shadow-2xl backdrop-blur-xl bg-white/95" align="start">
                                            <div className="space-y-3">
                                                <div className="relative group/filter px-1 mt-1">
                                                    <Input
                                                        className="h-9 text-xs bg-slate-50 border-slate-100 rounded-xl focus:ring-blue-500/10 focus:border-blue-500/20"
                                                        placeholder="Поиск продукта..."
                                                        value={productSearchQuery}
                                                        onChange={(e) => setProductSearchQuery(e.target.value)}
                                                    />
                                                </div>
                                                <div className="max-h-[200px] overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent pr-1">
                                                    {filteredProducts.length === 0 ? (
                                                        <div className="p-3 text-center text-xs text-slate-400 font-medium">
                                                            Продукты не найдены
                                                        </div>
                                                    ) : (
                                                        filteredProducts.map((product) => (
                                                            <div
                                                                key={product.id}
                                                                className={`px-3 py-2 rounded-xl text-sm cursor-pointer transition-colors flex justify-between items-center ${selectedProductId === product.id ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-slate-50 text-slate-700'}`}
                                                                onClick={() => {
                                                                    setSelectedProductId(product.id === selectedProductId ? null : product.id);
                                                                }}
                                                            >
                                                                <span>{product.name}</span>
                                                                <span className="text-[10px] text-slate-400 font-medium">
                                                                    {new Intl.NumberFormat('ru-RU').format(product.price)} UZS
                                                                </span>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="plan" className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">План (количество)</Label>
                                    <Input
                                        id="plan"
                                        type="number"
                                        placeholder="0"
                                        className="rounded-xl border-slate-200 h-11"
                                        value={planQuantity}
                                        onChange={(e) => setPlanQuantity(e.target.value)}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button
                                    type="button"
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest h-10 shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={handleAddPlan}
                                    disabled={!selectedProductId || !planQuantity || parseInt(planQuantity) <= 0 || isSubmitting}
                                >
                                    {isSubmitting ? "Добавление..." : "Добавить в список"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                        <DialogContent className="sm:max-w-[425px] rounded-3xl">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-black text-slate-900">Изменить план продукта</DialogTitle>
                                <DialogDescription className="text-slate-500 text-xs">
                                    Изменить количество продаж продукта для представителя.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-plan" className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">План (количество)</Label>
                                    <Input
                                        id="edit-plan"
                                        type="number"
                                        placeholder="0"
                                        className="rounded-xl border-slate-200 h-11"
                                        value={editPlanQuantity}
                                        onChange={(e) => setEditPlanQuantity(e.target.value)}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button
                                    type="button"
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest h-10 shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={handleEditPlan}
                                    disabled={!editPlanQuantity || parseInt(editPlanQuantity) < 0 || isEditSubmitting}
                                >
                                    {isEditSubmitting ? "Сохранение..." : "Сохранить изменения"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={isAssignOpen} onOpenChange={(open) => {
                        setIsAssignOpen(open);
                        if (!open) { setAssignDoctorId(""); setAssignQuantity(""); }
                    }}>
                        <DialogContent className="sm:max-w-[460px] rounded-3xl p-0 overflow-hidden border-0 shadow-2xl">
                            {/* Header */}
                            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-6">
                                <DialogTitle className="text-xl font-black text-white tracking-tight">Распределить план врачу</DialogTitle>
                                <DialogDescription className="text-emerald-100 text-xs mt-1">
                                    {assigningProductId
                                        ? (() => {
                                            const stat = productStats.find(s => s.productId === assigningProductId);
                                            const assigned = stat?.doctorPlans.filter(d => {
                                                // find plans matching selected month/year from the plan list
                                                const p = plans.find(pl => pl.id === d.planId);
                                                return !p || ((p as any).month === assignMonth && (p as any).year === assignYear);
                                            }).reduce((acc, d) => acc + d.planQty, 0) ?? 0;
                                            const mainQty = stat?.mainPlanQty ?? 0;
                                            const vacant = Math.max(0, mainQty - assigned);
                                            return `${stat?.name ?? ''} · Вакант: ${vacant} уп.`;
                                        })()
                                        : 'Выберите параметры плана'}
                                </DialogDescription>
                            </div>

                            <div className="grid gap-5 p-7">
                                {/* Month + Year Row */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="grid gap-2">
                                        <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Месяц</Label>
                                        <Select value={assignMonth.toString()} onValueChange={(v) => setAssignMonth(parseInt(v))}>
                                            <SelectTrigger className="h-11 rounded-xl border-slate-200 font-bold text-slate-700">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-slate-200">
                                                {[
                                                    [1, 'Январь'], [2, 'Февраль'], [3, 'Март'], [4, 'Апрель'],
                                                    [5, 'Май'], [6, 'Июнь'], [7, 'Июль'], [8, 'Август'],
                                                    [9, 'Сентябрь'], [10, 'Октябрь'], [11, 'Ноябрь'], [12, 'Декабрь']
                                                ].map(([num, name]) => (
                                                    <SelectItem key={num} value={num.toString()} className="font-medium">{name as string}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Год</Label>
                                        <Input
                                            type="number"
                                            className="h-11 rounded-xl border-slate-200 font-bold text-slate-700"
                                            value={assignYear}
                                            onChange={(e) => setAssignYear(parseInt(e.target.value) || new Date().getFullYear())}
                                        />
                                    </div>
                                </div>

                                {/* Vacancy info */}
                                {assigningProductId && (() => {
                                    const stat = productStats.find(s => s.productId === assigningProductId);
                                    const totalAssigned = stat?.doctorPlans.reduce((acc, d) => acc + d.planQty, 0) ?? 0;
                                    const mainQty = stat?.mainPlanQty ?? 0;
                                    const vacant = Math.max(0, mainQty - totalAssigned);
                                    return (
                                        <div className={`flex items-center justify-between px-4 py-3 rounded-2xl border ${vacant > 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-700'
                                            }`}>
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Вакант на месяц</p>
                                                <p className="text-2xl font-black">{vacant} <span className="text-sm font-bold opacity-60">уп.</span></p>
                                            </div>
                                            <div className="text-right text-xs opacity-60">
                                                <p>Общ. план: {mainQty} уп.</p>
                                                <p>Выдано: {totalAssigned} уп.</p>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Doctor */}
                                <div className="grid gap-2">
                                    <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Врач</Label>
                                    <Select value={assignDoctorId} onValueChange={setAssignDoctorId}>
                                        <SelectTrigger className="h-11 rounded-xl border-slate-200 font-bold text-slate-700">
                                            <SelectValue placeholder="Выберите врача" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-slate-200 max-h-[200px]">
                                            {doctors.map(d => (
                                                <SelectItem key={d.id} value={d.id.toString()} className={`font-medium ${!d.is_active ? 'text-slate-400 opacity-70' : ''}`}>
                                                    {d.full_name} {!d.is_active && "(Faol emas)"}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Quantity */}
                                <div className="grid gap-2">
                                    <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">План (количество, уп.)</Label>
                                    <Input
                                        type="number"
                                        placeholder="0"
                                        className="rounded-xl border-slate-200 h-11 font-bold text-slate-800"
                                        value={assignQuantity}
                                        onChange={(e) => setAssignQuantity(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="px-7 pb-7">
                                <Button
                                    type="button"
                                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest h-11 shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={handleAssignPlan}
                                    disabled={!assignDoctorId || !assignQuantity || parseInt(assignQuantity) <= 0 || isAssignSubmitting}
                                >
                                    {isAssignSubmitting ? 'ДОБАВЛЕНИЕ...' : 'ДОБАВИТЬ ВРАЧУ'}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={isAssignFactOpen} onOpenChange={setIsAssignFactOpen}>
                        <DialogContent className="sm:max-w-[425px] rounded-3xl">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-black text-slate-900">Назначить факт врачу</DialogTitle>
                                <DialogDescription className="text-slate-500 text-xs">
                                    Передать часть фактических продаж выбранному врачу.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="assign-fact" className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Факт (количество)</Label>
                                    <Input
                                        id="assign-fact"
                                        type="number"
                                        placeholder="0"
                                        className="rounded-xl border-slate-200 h-11"
                                        value={assignFactQuantity}
                                        onChange={(e) => setAssignFactQuantity(e.target.value)}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button
                                    type="button"
                                    className="w-full bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest h-10 shadow-lg shadow-fuchsia-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={handleAssignFact}
                                    disabled={!assignFactDoctorId || !assignFactQuantity || parseInt(assignFactQuantity) <= 0 || isAssignFactSubmitting}
                                >
                                    {isAssignFactSubmitting ? "НАЗНАЧЕНИЕ..." : "ОТДАТЬ ФАКТ"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Summary Section with Modern Gradient */}
            <div className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white grid grid-cols-1 md:grid-cols-2 gap-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20" />
                <div className="relative z-10">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center max-w-xs border-b border-white/10 pb-2">
                            <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Общ план:</span>
                            <span className="text-xl font-black">{totalPlanAmount > 0 ? new Intl.NumberFormat('ru-RU').format(totalPlanAmount) : '0'} UZS</span>
                        </div>
                        <div className="flex justify-between items-center max-w-xs border-b border-white/10 pb-2">
                            <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Факт поступ:</span>
                            <span className="text-xl font-black text-indigo-400">{totalFactAmount > 0 ? new Intl.NumberFormat('ru-RU').format(totalFactAmount) : '0'} UZS</span>
                        </div>
                        <div className="flex justify-between items-center max-w-xs border-b border-white/10 pb-2">
                            <span className="text-emerald-400 text-xs font-bold uppercase tracking-widest">Зарплата:</span>
                            <span className="text-xl font-black text-emerald-400">{new Intl.NumberFormat('ru-RU').format(totalSalary)} UZS</span>
                        </div>
                        <div className="flex justify-between items-center max-w-xs">
                            <span className="text-fuchsia-400 text-xs font-bold uppercase tracking-widest">Бонус (Остаток):</span>
                            <span className="text-xl font-black text-fuchsia-400">{new Intl.NumberFormat('ru-RU').format(totalBonus)} UZS</span>
                        </div>
                    </div>
                </div>
                <div className="relative z-10 flex flex-col justify-center">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">План продажа</p>
                        <h4 className="text-2xl font-black text-white leading-none">{new Intl.NumberFormat('ru-RU').format(totalPlanAmount)} UZS</h4>
                        <p className="text-xs text-slate-400 mt-1">{new Intl.NumberFormat('ru-RU').format(totalPlanQuantity)} шт.</p>
                    </div>
                    <div className="mt-4">
                        <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                            <p className="text-slate-400 text-[10px] font-bold uppercase mb-1">Факт продажа</p>
                            <p className="font-black text-lg text-emerald-400">{new Intl.NumberFormat('ru-RU').format(totalFactAmount)} UZS</p>
                            <p className="text-xs text-slate-400 mt-1">{new Intl.NumberFormat('ru-RU').format(totalFactQuantity)} шт.</p>
                        </div>
                    </div>
                </div>
            </div>


            <div className="overflow-y-auto max-h-[500px] p-4 bg-slate-50/50 space-y-4">
                {productStats.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">Нет данных о планах</div>
                ) : (
                    productStats.map((stat, idx) => {
                        const totalAssignedDocQty = stat.doctorPlans.reduce((acc, d) => acc + d.planQty, 0);
                        const vacantQty = Math.max(0, stat.mainPlanQty - totalAssignedDocQty);

                        return (
                            <div key={idx} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                {/* Product Main Row (Dynamic styling based on percentage) */}
                                {(() => {
                                    const planQty = Math.max(stat.mainPlanQty, 1); // Avoid division by zero
                                    const percent = Math.round((stat.mainFactQty / planQty) * 100);
                                    let bgClass = "bg-slate-50 border-b border-slate-200"; // Default
                                    let textClass = "text-slate-900";
                                    let iconColor = "text-slate-500 hover:text-slate-700 hover:bg-slate-200";

                                    if (stat.mainPlanQty > 0) {
                                        if (percent < 50) {
                                            bgClass = "bg-red-100/60 border-b border-red-200";
                                            textClass = "text-red-900";
                                            iconColor = "text-red-700 hover:text-red-900 hover:bg-red-200/50";
                                        } else if (percent < 75) {
                                            bgClass = "bg-amber-100/60 border-b border-amber-200";
                                            textClass = "text-amber-900";
                                            iconColor = "text-amber-700 hover:text-amber-900 hover:bg-amber-200/50";
                                        } else {
                                            bgClass = "bg-emerald-300/40 border-b border-emerald-400/30";
                                            textClass = "text-emerald-900";
                                            iconColor = "text-emerald-700 hover:text-emerald-900 hover:bg-emerald-400/20";
                                        }
                                    }

                                    return (
                                        <div className={`p-4 flex items-center justify-between gap-4 transition-colors ${bgClass}`}>
                                            <div className={`flex-1 flex flex-col justify-center ${textClass}`}>
                                                <span className="font-extrabold text-base">{stat.name}</span>
                                                <div className="flex gap-2 mt-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className={`h-6 w-6 shadow-none transition-all ${iconColor}`}
                                                        onClick={() => {
                                                            setEditingPlanId(stat.mainPlanId);
                                                            setEditingProductId(stat.productId);
                                                            setEditPlanQuantity(stat.mainPlanQty.toString());
                                                            setIsEditOpen(true);
                                                            if (products.length === 0) fetchProducts();
                                                        }}
                                                        disabled={!stat.mainPlanId}
                                                        title="Редактировать общий план"
                                                    ><Pencil className="h-3.5 w-3.5" /></Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className={`h-6 w-6 shadow-none transition-all ${iconColor}`}
                                                        onClick={() => {
                                                            setAssigningProductId(stat.productId);
                                                            setIsAssignOpen(true);
                                                        }}
                                                        title="Распределить план врачам"
                                                    ><Plus className="h-4 w-4" /></Button>
                                                </div>
                                            </div>

                                            <div className={`flex items-center gap-6 shrink-0 text-sm ${textClass}`}>
                                                <div className="text-left min-w-[70px]">
                                                    <p className="text-[12px] font-medium tracking-tight opacity-80">План: {stat.mainPlanQty}</p>
                                                </div>
                                                <div className="text-left min-w-[70px]">
                                                    <p className="text-[12px] font-medium tracking-tight opacity-80">Факт: {stat.mainFactQty}</p>
                                                </div>
                                                <div className="text-left min-w-[80px]">
                                                    <p className="text-[12px] font-medium tracking-tight opacity-80">Вакант: {vacantQty}</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                                {/* Keep previous layout but removed as it was moved inside IIFE */}                                {/* Doctor rows */}
                                {stat.doctorPlans.length > 0 && (
                                    <div className="divide-y divide-emerald-100/50 bg-emerald-50/10">
                                        {stat.doctorPlans.map(docPlan => (
                                            <div key={docPlan.planId} className="px-4 py-3 flex items-center justify-between hover:bg-emerald-50/50 transition-colors">
                                                <div className="flex-1 text-[13px] font-medium text-emerald-900/80 flex items-center gap-2">
                                                    Имя доктора ({docPlan.doctorName})
                                                    {(() => {
                                                        const doc = doctors.find(d => d.id === docPlan.doctorId);
                                                        return doc && !doc.is_active ? <span className="opacity-70">(Faol emas)</span> : null;
                                                    })()}
                                                </div>
                                                <div className="flex items-center gap-6 shrink-0 text-[13px] text-emerald-900/80">
                                                    <div className="min-w-[70px] text-left">{docPlan.planQty}</div>
                                                    <div className="min-w-[70px] text-left">{docPlan.factQty}</div>
                                                    <div className="min-w-[100px] text-right flex items-center justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-6 px-2 text-[10px] uppercase font-bold text-slate-400 hover:text-fuchsia-600 hover:bg-fuchsia-50"
                                                            onClick={() => {
                                                                setAssigningFactProductId(stat.productId);
                                                                setAssignFactDoctorId(docPlan.doctorId);
                                                                setIsAssignFactOpen(true);
                                                            }}
                                                            title="Отдать факт врачу"
                                                        >Факт</Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 text-slate-400 hover:text-blue-600"
                                                            onClick={() => {
                                                                setEditingPlanId(docPlan.planId);
                                                                setEditingProductId(stat.productId);
                                                                setEditPlanQuantity(docPlan.planQty.toString());
                                                                setIsEditOpen(true);
                                                            }}
                                                            disabled={docPlan.planId === -1}
                                                        ><Pencil className="h-3 w-3" /></Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div >
    );
}
