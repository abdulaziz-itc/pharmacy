import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import { Checkbox } from "../../components/ui/checkbox";
import { useProductStore, type Product } from "../../store/productStore";
import { useManufacturerStore } from "../../store/manufacturerStore";
import { useCategoryStore } from "../../store/categoryStore";
import { Pencil, X, Package, Tag, Building2, TrendingUp, HandCoins, DollarSign } from "lucide-react";
import { cn } from "../../lib/utils";

interface EditProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
}

export function EditProductModal({ isOpen, onClose, product }: EditProductModalProps) {
    const { updateProduct } = useProductStore();
    const { manufacturers, fetchManufacturers } = useManufacturerStore();
    const { categories, fetchCategories } = useCategoryStore();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [form, setForm] = useState<{
        name: string;
        price: number;
        production_price: number;
        marketing_expense: number;
        salary_expense: number;
        other_expenses: number;
        manufacturer_ids: number[];
        category_id: number;
        is_active: boolean;
    }>({
        name: "",
        price: 0,
        production_price: 0,
        marketing_expense: 0,
        salary_expense: 0,
        other_expenses: 0,
        manufacturer_ids: [],
        category_id: 0,
        is_active: true,
    });

    useEffect(() => {
        if (product) {
            setForm({
                name: product.name,
                price: product.price,
                production_price: product.production_price,
                marketing_expense: product.marketing_expense || 0,
                salary_expense: product.salary_expense || 0,
                other_expenses: product.other_expenses || 0,
                manufacturer_ids: product.manufacturers?.map(m => m.id) || [],
                category_id: product.category_id || product.category?.id || 0,
                is_active: product.is_active ?? true,
            });
        }
    }, [product]);

    useEffect(() => {
        if (isOpen) {
            fetchManufacturers();
            fetchCategories();
        }
    }, [isOpen, fetchManufacturers, fetchCategories]);

    const handleSubmit = async () => {
        if (!form.name.trim() || !form.category_id) {
            alert("Пожалуйста, заполните обязательные поля (Название и Категория)");
            return;
        }
        if (!product) return;

        setIsSubmitting(true);
        try {
            await updateProduct(product.id, form);
            onClose();
        } catch (error) {
            console.error("Failed to update product:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!product) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[700px] p-0 border-0 shadow-3xl rounded-[40px] overflow-hidden bg-slate-50 max-h-[90vh] overflow-y-auto custom-scrollbar">
                {/* Header Section */}
                <div className="relative bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 p-10 pb-20 shrink-0 overflow-hidden">
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-orange-400/20 rounded-full blur-3xl animate-pulse" />

                    <div className="absolute top-6 right-6 flex gap-2 z-20">
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all shadow-sm"
                        >
                            <span className="sr-only">Закрыть</span>
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="relative z-10 flex items-center gap-8">
                        <div className="w-24 h-24 rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 shadow-2xl transform rotate-3 flex-shrink-0">
                            <Pencil className="w-10 h-10" />
                        </div>
                        <div className="space-y-2 flex-1">
                            <h2 className="text-3xl font-black text-white tracking-tight leading-tight drop-shadow-sm">
                                Изменить продукт
                            </h2>
                            <p className="text-orange-100 text-sm font-medium">Редактирование информации о продукте {product.name}</p>
                        </div>
                    </div>
                </div>

                {/* Content Section */}
                <div className="px-10 -mt-10 pb-10 space-y-8 relative z-10">

                    {/* Main Info */}
                    <div className="bg-white p-8 rounded-[36px] border border-slate-100 shadow-sm space-y-6">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                            <Package className="w-3.5 h-3.5 text-orange-400" />
                            Основная информация
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="md:col-span-2 relative group">
                                <Label className="sr-only">Название продукта</Label>
                                <Input
                                    placeholder="Название продукта"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="pl-4 h-12 bg-slate-50 border-slate-200 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10 rounded-2xl transition-all shadow-none font-bold text-slate-800"
                                />
                            </div>

                            <div className="relative group">
                                <Label className="text-[10px] font-black text-slate-400 flex items-center gap-1.5 uppercase tracking-widest mb-2 ml-1">
                                    <Tag className="w-3 h-3 text-orange-400" /> Категория
                                </Label>
                                <Select value={form.category_id.toString()} onValueChange={(val) => setForm({ ...form, category_id: parseInt(val) })}>
                                    <SelectTrigger className="h-12 bg-slate-50 border-slate-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 rounded-2xl font-bold text-slate-600">
                                        <SelectValue placeholder="Выберите категорию" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-slate-100 shadow-xl overflow-hidden max-h-[250px]">
                                        {categories.map((c) => (
                                            <SelectItem key={c.id} value={c.id.toString()} className="font-bold cursor-pointer rounded-xl mx-1 my-0.5 focus:bg-orange-50 focus:text-orange-600">
                                                {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="relative group">
                                <Label className="text-[10px] font-black text-slate-400 flex items-center gap-1.5 uppercase tracking-widest mb-2 ml-1">
                                    <Building2 className="w-3 h-3 text-orange-400" /> Производители
                                </Label>
                                <div className="space-y-2">
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="w-full h-12 justify-start font-bold text-slate-600 bg-slate-50 border-slate-200 hover:bg-slate-100 hover:text-slate-900 rounded-2xl border shadow-none px-4 transition-all">
                                                {form.manufacturer_ids.length > 0
                                                    ? `Выбрано: ${form.manufacturer_ids.length}`
                                                    : "Выберите производителей"}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[300px] p-0 rounded-2xl border-slate-100 shadow-xl" align="start">
                                            <div className="max-h-[250px] overflow-y-auto p-2 custom-scrollbar">
                                                {manufacturers.map((m) => (
                                                    <div
                                                        key={m.id}
                                                        className="flex items-center space-x-3 p-2 rounded-xl hover:bg-slate-50 cursor-pointer py-2.5 transition-colors"
                                                        onClick={() => {
                                                            setForm(prev => {
                                                                const isSelected = prev.manufacturer_ids.includes(m.id);
                                                                return {
                                                                    ...prev,
                                                                    manufacturer_ids: isSelected
                                                                        ? prev.manufacturer_ids.filter(id => id !== m.id)
                                                                        : [...prev.manufacturer_ids, m.id]
                                                                };
                                                            });
                                                        }}
                                                    >
                                                        <Checkbox
                                                            checked={form.manufacturer_ids.includes(m.id)}
                                                            className="rounded-md data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                                                        />
                                                        <span className="font-bold text-slate-700 text-sm">{m.name}</span>
                                                    </div>
                                                ))}
                                                {manufacturers.length === 0 && (
                                                    <div className="p-4 text-center text-sm font-medium text-slate-500">
                                                        Нет доступных производителей
                                                    </div>
                                                )}
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Financials Box */}
                    <div className="bg-white p-8 rounded-[36px] border border-slate-100 shadow-sm space-y-6">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                            <DollarSign className="w-3.5 h-3.5 text-orange-400" />
                            Финансовые показатели
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="relative group">
                                <Label className="text-[10px] font-black text-slate-400 flex items-center gap-1.5 uppercase tracking-widest mb-2 ml-1">
                                    Цена продажи
                                </Label>
                                <div className="relative flex items-center">
                                    <Input
                                        type="number"
                                        placeholder="0"
                                        value={form.price || ''}
                                        onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                                        className="pl-4 h-12 bg-slate-50 border-slate-200 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10 rounded-2xl transition-all shadow-none font-bold text-slate-800"
                                    />
                                </div>
                            </div>

                            <div className="relative group">
                                <Label className="text-[10px] font-black text-slate-400 flex items-center gap-1.5 uppercase tracking-widest mb-2 ml-1">
                                    Себестоимость
                                </Label>
                                <div className="relative flex items-center">
                                    <Input
                                        type="number"
                                        placeholder="0"
                                        value={form.production_price || ''}
                                        onChange={(e) => setForm({ ...form, production_price: Number(e.target.value) })}
                                        className="pl-4 h-12 bg-slate-50 border-slate-200 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10 rounded-2xl transition-all shadow-none font-bold text-slate-800"
                                    />
                                </div>
                            </div>

                            <div className="relative group">
                                <Label className="text-[10px] font-black text-slate-400 flex items-center gap-1.5 uppercase tracking-widest mb-2 ml-1">
                                    <TrendingUp className="w-3 h-3 text-orange-400" /> Расходы на маркетинг
                                </Label>
                                <div className="relative flex items-center">
                                    <Input
                                        type="number"
                                        placeholder="0"
                                        value={form.marketing_expense || ''}
                                        onChange={(e) => setForm({ ...form, marketing_expense: Number(e.target.value) })}
                                        className="pl-4 h-12 bg-slate-50 border-slate-200 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10 rounded-2xl transition-all shadow-none font-bold text-slate-800"
                                    />
                                </div>
                            </div>

                            <div className="relative group">
                                <Label className="text-[10px] font-black text-slate-400 flex items-center gap-1.5 uppercase tracking-widest mb-2 ml-1">
                                    <HandCoins className="w-3 h-3 text-orange-400" /> Расходы на зарплату
                                </Label>
                                <div className="relative flex items-center">
                                    <Input
                                        type="number"
                                        placeholder="0"
                                        value={form.salary_expense || ''}
                                        onChange={(e) => setForm({ ...form, salary_expense: Number(e.target.value) })}
                                        className="pl-4 h-12 bg-slate-50 border-slate-200 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10 rounded-2xl transition-all shadow-none font-bold text-slate-800"
                                    />
                                </div>
                            </div>

                            <div className="relative group">
                                <Label className="text-[10px] font-black text-slate-400 flex items-center gap-1.5 uppercase tracking-widest mb-2 ml-1">
                                    Прочие расходы
                                </Label>
                                <div className="relative flex items-center">
                                    <Input
                                        type="number"
                                        placeholder="0"
                                        value={form.other_expenses || ''}
                                        onChange={(e) => setForm({ ...form, other_expenses: Number(e.target.value) })}
                                        className="pl-4 h-12 bg-slate-50 border-slate-200 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10 rounded-2xl transition-all shadow-none font-bold text-slate-800"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-4 pt-4">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="flex-1 rounded-2xl font-black uppercase text-xs tracking-widest h-14 border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all border-2"
                        >
                            Отмена
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting || !form.name.trim() || !form.category_id}
                            className={cn(
                                "flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black uppercase text-xs tracking-widest h-14 rounded-2xl shadow-xl shadow-orange-500/20 transition-all",
                                isSubmitting && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            {isSubmitting ? "Сохранение..." : "Сохранить"}
                        </Button>
                    </div>

                </div>
            </DialogContent>
        </Dialog>
    );
}
