import * as React from "react";
import { useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "./button";
import { Input } from "./input";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

export interface SearchableSelectProps {
    options: { value: string, label: string }[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({ 
    options, 
    value, 
    onChange, 
    placeholder, 
    disabled,
    className
}) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");

    const safeOptions = Array.isArray(options) ? options : [];

    const filteredOptions = safeOptions.filter(opt => 
        (opt.label || "").toLowerCase().includes(search.toLowerCase())
    );

    const selectedLabel = value === "all" 
        ? (placeholder || "Все") 
        : (safeOptions.find(opt => opt.value === value)?.label || placeholder || "Все");

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    disabled={disabled}
                    className={cn(
                        "w-full bg-slate-50/50 border-slate-100 rounded-xl font-bold text-slate-700 h-10 shadow-sm focus:ring-orange-500/10 justify-between px-3 hover:bg-slate-100/50 disabled:opacity-50",
                        className
                    )}
                >
                    <span className="truncate">{selectedLabel}</span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)] min-w-[200px] z-[100]" align="start">
                <div className="flex flex-col bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden">
                    <div className="p-2 border-b border-slate-50">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                            <Input
                                placeholder="Поиск..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="h-8 pl-8 text-xs bg-slate-50 border-none rounded-lg focus:ring-1 focus:ring-orange-500/20"
                                autoFocus
                            />
                        </div>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-slate-200">
                        <button
                            onClick={() => {
                                onChange("all");
                                setOpen(false);
                                setSearch("");
                            }}
                            className={cn(
                                "flex w-full items-center px-2 py-2 text-sm font-bold rounded-lg transition-colors text-left mb-0.5",
                                value === "all" ? "bg-orange-50 text-orange-600" : "text-slate-600 hover:bg-slate-50"
                            )}
                        >
                            <span className="flex-1 truncate">{placeholder || "Все"}</span>
                            {value === "all" && <Check className="w-3 h-3 ml-2" />}
                        </button>
                        {filteredOptions.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => {
                                    onChange(opt.value);
                                    setOpen(false);
                                    setSearch("");
                                }}
                                className={cn(
                                    "flex w-full items-center px-2 py-2 text-sm font-bold rounded-lg transition-colors text-left mb-0.5 last:mb-0",
                                    value === opt.value ? "bg-orange-50 text-orange-600" : "text-slate-600 hover:bg-slate-50"
                                )}
                            >
                                <span className="flex-1 truncate">{opt.label}</span>
                                {value === opt.value && <Check className="w-3 h-3 ml-2" />}
                            </button>
                        ))}
                        {filteredOptions.length === 0 && (
                            <div className="px-2 py-4 text-center text-xs text-slate-400 font-medium italic">
                                Ничего не найдено
                            </div>
                        )}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
};
