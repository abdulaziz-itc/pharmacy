import React, { useState, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Input } from './ui/input';
import { Search, Check, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

interface Product {
    id: number;
    name: string;
    price: number;
    marketing_expense?: number;
    salary_expense?: number;
    [key: string]: any;
}

interface SearchableProductSelectProps {
    products: Product[];
    selectedId: string;
    onSelect: (id: string) => void;
    stockMap: Record<number, number>;
    placeholder?: string;
    className?: string;
}

export const SearchableProductSelect: React.FC<SearchableProductSelectProps> = ({
    products,
    selectedId,
    onSelect,
    stockMap,
    placeholder = "Выберите препарат...",
    className
}) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");

    const selectedProduct = useMemo(() => 
        products.find(p => p.id.toString() === selectedId),
    [products, selectedId]);

    const filteredProducts = useMemo(() => {
        if (!search) return products;
        const lowSearch = search.toLowerCase();
        return products.filter(p => 
            p.name.toLowerCase().includes(lowSearch)
        );
    }, [products, search]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    className={cn(
                        "flex h-8 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-xs ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                        className
                    )}
                >
                    <span className="truncate">
                        {selectedProduct ? (
                            <span className="flex items-center gap-2">
                                {selectedProduct.name}
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${ (stockMap[selectedProduct.id] || 0) > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-500'}`}>
                                    {stockMap[selectedProduct.id] || 0} шт
                                </span>
                            </span>
                        ) : placeholder}
                    </span>
                    <ChevronDown className="h-3 w-3 opacity-50 shrink-0" />
                </button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)] min-w-[280px] shadow-2xl border-slate-200 rounded-xl overflow-hidden" align="start">
                <div className="flex items-center border-b px-3 bg-slate-50/50">
                    <Search className="mr-2 h-3.5 w-3.5 shrink-0 opacity-40" />
                    <Input
                        placeholder="Поиск препарата..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-9 border-0 focus-visible:ring-0 text-xs bg-transparent p-0"
                        autoFocus
                    />
                </div>
                <div className="max-h-[280px] overflow-y-auto overflow-x-hidden p-1 bg-white custom-scrollbar">
                    {filteredProducts.length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-400 italic">
                            Ничего не найдено
                        </div>
                    ) : (
                        filteredProducts.map((product) => {
                            const isSelected = product.id.toString() === selectedId;
                            const stock = stockMap[product.id] || 0;
                            return (
                                <button
                                    key={product.id}
                                    onClick={() => {
                                        onSelect(product.id.toString());
                                        setOpen(false);
                                        setSearch("");
                                    }}
                                    className={cn(
                                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs transition-colors hover:bg-indigo-50/80 group shrink-0",
                                        isSelected ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-slate-700"
                                    )}
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="truncate">{product.name}</span>
                                            {isSelected && <Check className="h-3 w-3 text-indigo-600 shrink-0" />}
                                        </div>
                                        <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-50">
                                            <span className="text-[10px] text-slate-400 font-normal">
                                                {(product.price || 0).toLocaleString()} UZS
                                            </span>
                                            <span className={cn(
                                                "text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0",
                                                stock > 0 ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-red-50 text-red-500 border border-red-100"
                                            )}>
                                                Остаток: {stock.toLocaleString()} шт
                                            </span>
                                        </div>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
};
