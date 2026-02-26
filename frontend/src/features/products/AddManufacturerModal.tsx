import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogHeader,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useManufacturerStore } from "../../store/manufacturerStore";
import { Factory, Plus, Pencil, Check, X } from "lucide-react";
import { cn } from "../../lib/utils";

interface AddManufacturerModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AddManufacturerModal({ isOpen, onClose }: AddManufacturerModalProps) {
    const { manufacturers, createManufacturer, updateManufacturer, fetchManufacturers } = useManufacturerStore();
    const [name, setName] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Edit state
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editingName, setEditingName] = useState("");
    const [savingId, setSavingId] = useState<number | null>(null);

    useEffect(() => {
        if (isOpen) fetchManufacturers();
    }, [isOpen, fetchManufacturers]);

    const handleSubmit = async () => {
        if (!name.trim()) return;
        setIsSubmitting(true);
        try {
            await createManufacturer(name);
            setName("");
        } catch (error) {
            console.error("Failed to create manufacturer:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const startEdit = (m: { id: number; name: string }) => {
        setEditingId(m.id);
        setEditingName(m.name);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditingName("");
    };

    const saveEdit = async (id: number) => {
        if (!editingName.trim()) return;
        setSavingId(id);
        try {
            await updateManufacturer(id, editingName.trim());
            setEditingId(null);
        } catch (e) {
            console.error("Failed to update manufacturer:", e);
        } finally {
            setSavingId(null);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[520px] p-0 border-0 shadow-3xl rounded-[32px] overflow-hidden bg-white/95 backdrop-blur-xl">
                {/* Header */}
                <DialogHeader className="relative p-0 h-44 flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600">
                        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse" />
                        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl animate-pulse" />
                    </div>
                    <div className="relative z-10 flex flex-col items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-2xl">
                            <Factory className="w-7 h-7 text-white" />
                        </div>
                        <DialogTitle className="text-xl font-bold text-white text-center px-6 leading-tight tracking-tight">
                            Производители
                        </DialogTitle>
                    </div>
                </DialogHeader>

                {/* Add new */}
                <div className="px-6 pt-5 pb-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 block mb-2">
                        Новая компания
                    </label>
                    <div className="flex gap-2">
                        <Input
                            placeholder="Например: Pharma Group"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                            className={cn(
                                "h-11 px-4 rounded-xl border-slate-200 bg-slate-50/50 flex-1",
                                "focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10",
                                "transition-all text-sm font-semibold placeholder:text-slate-300"
                            )}
                        />
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting || !name.trim()}
                            className={cn(
                                "h-11 px-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white",
                                "rounded-xl font-bold text-xs shadow-lg shadow-blue-500/20",
                                "hover:from-blue-700 hover:to-blue-600 transition-all disabled:opacity-50",
                                "flex items-center gap-1.5"
                            )}
                        >
                            {isSubmitting ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <><Plus className="w-4 h-4" /><span>Добавить</span></>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Manufacturer list */}
                <div className="px-6 pb-5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                            Список ({manufacturers.length})
                        </span>
                    </div>
                    <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden max-h-64 overflow-y-auto">
                        {manufacturers.length === 0 ? (
                            <div className="py-6 text-center text-sm text-slate-400">Нет производителей</div>
                        ) : (
                            <ul className="divide-y divide-slate-100">
                                {manufacturers.map((m) => (
                                    <li key={m.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/80 transition-colors group">
                                        {editingId === m.id ? (
                                            <>
                                                <Input
                                                    value={editingName}
                                                    onChange={(e) => setEditingName(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') saveEdit(m.id);
                                                        if (e.key === 'Escape') cancelEdit();
                                                    }}
                                                    autoFocus
                                                    className="h-8 text-sm px-3 rounded-lg border-blue-300 bg-white flex-1 focus:ring-2 focus:ring-blue-400/20"
                                                />
                                                <button
                                                    onClick={() => saveEdit(m.id)}
                                                    disabled={savingId === m.id}
                                                    className="w-7 h-7 rounded-lg bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center text-white transition-colors"
                                                >
                                                    {savingId === m.id
                                                        ? <div className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
                                                        : <Check className="w-3.5 h-3.5" />
                                                    }
                                                </button>
                                                <button
                                                    onClick={cancelEdit}
                                                    className="w-7 h-7 rounded-lg bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-500 transition-colors"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <span className="flex-1 text-sm font-semibold text-slate-700 truncate">{m.name}</span>
                                                <button
                                                    onClick={() => startEdit(m)}
                                                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-center text-slate-400 transition-colors opacity-0 group-hover:opacity-100"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                            </>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 pb-6">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="w-full h-11 rounded-xl border-slate-100 font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all"
                    >
                        Закрыть
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
