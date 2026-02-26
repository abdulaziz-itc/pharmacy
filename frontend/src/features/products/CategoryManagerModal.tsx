import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogHeader,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useCategoryStore, type Category } from "../../store/categoryStore";
import { Layers, Plus, Pencil, Check, X } from "lucide-react";
import { cn } from "../../lib/utils";

interface CategoryManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CategoryManagerModal({ isOpen, onClose }: CategoryManagerModalProps) {
    const { categories, fetchCategories, createCategory, updateCategory, isLoading } = useCategoryStore();
    const [newName, setNewName] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Edit state
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState("");

    useEffect(() => {
        if (isOpen) {
            fetchCategories();
            setNewName("");
            setEditingId(null);
            setEditName("");
        }
    }, [isOpen, fetchCategories]);

    const handleCreate = async () => {
        if (!newName.trim()) return;

        setIsSubmitting(true);
        try {
            await createCategory(newName);
            setNewName("");
        } catch (error) {
            console.error("Failed to create category:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const startEditing = (category: Category) => {
        setEditingId(category.id);
        setEditName(category.name);
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditName("");
    };

    const handleUpdate = async (id: number) => {
        if (!editName.trim()) return;

        try {
            await updateCategory(id, editName);
            setEditingId(null);
        } catch (error) {
            console.error("Failed to update category:", error);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[480px] p-0 border-0 shadow-3xl rounded-[32px] overflow-hidden bg-white/95 backdrop-blur-xl max-h-[90vh] flex flex-col">
                <DialogHeader className="relative p-0 h-48 flex items-center justify-center overflow-hidden shrink-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-teal-500 to-cyan-600">
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse" />
                        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-teal-400/20 rounded-full blur-3xl animate-pulse" />
                    </div>

                    <div className="relative z-10 flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-2xl">
                            <Layers className="w-8 h-8 text-white" />
                        </div>
                        <DialogTitle className="text-2xl font-bold text-white text-center px-6 leading-tight tracking-tight">
                            Категории продуктов
                        </DialogTitle>
                    </div>
                </DialogHeader>

                <div className="p-8 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
                    {/* Add New Category Section */}
                    <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                            Новая категория
                        </label>
                        <div className="flex gap-2">
                            <Input
                                placeholder="Например: Антибиотики"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                                className={cn(
                                    "h-12 flex-1 px-4 rounded-xl border-slate-200 bg-white",
                                    "focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20",
                                    "transition-all duration-300 text-sm font-semibold placeholder:text-slate-300"
                                )}
                            />
                            <Button
                                type="button"
                                onClick={handleCreate}
                                disabled={isSubmitting || !newName.trim()}
                                className="h-12 px-4 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white font-bold rounded-xl transition-all"
                            >
                                {isSubmitting ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <Plus className="w-5 h-5" />
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* List of Categories */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                            Существующие категории
                        </label>
                        <div className="space-y-2">
                            {isLoading && categories.length === 0 ? (
                                <div className="py-8 text-center text-sm font-medium text-slate-400 flex flex-col items-center gap-2">
                                    <div className="w-6 h-6 border-2 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
                                    Загрузка...
                                </div>
                            ) : categories.length === 0 ? (
                                <div className="py-8 text-center text-sm font-medium text-slate-400 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                                    Нет категорий
                                </div>
                            ) : (
                                categories.map((category) => (
                                    <div
                                        key={category.id}
                                        className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-white hover:border-emerald-100 hover:bg-emerald-50/30 transition-colors group"
                                    >
                                        {editingId === category.id ? (
                                            <div className="flex items-center gap-2 w-full">
                                                <Input
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleUpdate(category.id)}
                                                    className="h-9 px-3 flex-1 text-sm font-semibold rounded-lg border-emerald-200 focus-visible:ring-emerald-500 bg-white"
                                                    autoFocus
                                                />
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-9 w-9 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 rounded-lg"
                                                    onClick={() => handleUpdate(category.id)}
                                                >
                                                    <Check className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-9 w-9 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg"
                                                    onClick={cancelEditing}
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <>
                                                <span className="font-semibold text-slate-700 px-1">
                                                    {category.name}
                                                </span>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-emerald-100 hover:text-emerald-600 rounded-lg transition-all"
                                                    onClick={() => startEditing(category)}
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-8 pt-0 mt-auto shrink-0">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        className="w-full h-14 rounded-2xl border-slate-200 font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all active:scale-[0.98]"
                    >
                        ЗАКРЫТЬ
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
