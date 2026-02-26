import { useEffect } from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../components/ui/select";
import { useCategoryStore } from '../../store/categoryStore';
import { useManufacturerStore } from '../../store/manufacturerStore';

interface ProductFiltersProps {
    selectedCategory: string;
    onCategoryChange: (val: string) => void;
    selectedManufacturer: string;
    onManufacturerChange: (val: string) => void;
}

export default function ProductFilters({
    selectedCategory,
    onCategoryChange,
    selectedManufacturer,
    onManufacturerChange
}: ProductFiltersProps) {
    const { categories, fetchCategories } = useCategoryStore();
    const { manufacturers, fetchManufacturers } = useManufacturerStore();

    useEffect(() => {
        fetchCategories();
        fetchManufacturers();
    }, [fetchCategories, fetchManufacturers]);

    return (
        <>
            <div className="space-y-1.5 min-w-[200px]">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Производитель</label>
                <Select value={selectedManufacturer} onValueChange={onManufacturerChange}>
                    <SelectTrigger className="h-11 bg-white border-slate-200 rounded-xl focus:ring-blue-500/10 focus:border-blue-500/50 shadow-sm transition-all text-slate-700">
                        <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-slate-100 shadow-2xl">
                        <SelectItem value="all">All</SelectItem>
                        {manufacturers.map((m) => (
                            <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-1.5 min-w-[200px]">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Категория</label>
                <Select value={selectedCategory} onValueChange={onCategoryChange}>
                    <SelectTrigger className="h-11 bg-white border-slate-200 rounded-xl focus:ring-blue-500/10 focus:border-blue-500/50 shadow-sm transition-all text-slate-700">
                        <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-slate-100 shadow-2xl">
                        <SelectItem value="all">All</SelectItem>
                        {categories.map((c) => (
                            <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </>
    );
}
