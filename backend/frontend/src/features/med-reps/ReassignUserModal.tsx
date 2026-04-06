import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogHeader,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Users } from "lucide-react";
import { cn } from "../../lib/utils";
import api from "../../api/axios";
import { useMedRepStore } from "../../store/medRepStore";

interface ReassignUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    fromUserId: number;
    fromUserName: string;
    role: string;
}

export function ReassignUserModal({ isOpen, onClose, fromUserId, fromUserName, role }: ReassignUserModalProps) {
    const { medReps, fetchMedReps } = useMedRepStore();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toUserId, setToUserId] = useState<number>(0);

    useEffect(() => {
        if (isOpen) {
            fetchMedReps(role); // Use the passed role
            setToUserId(0);
        }
    }, [isOpen, fetchMedReps, role]);

    const handleSubmit = async () => {
        if (!toUserId || toUserId === fromUserId) return;

        setIsSubmitting(true);
        try {
            await api.post('/users/reassign', {
                from_user_id: fromUserId,
                to_user_id: toUserId
            });
            onClose();
        } catch (error) {
            console.error("Failed to reassign reps:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Filter out the current user from the target list
    const availableUsers = medReps.filter(r => r.id !== fromUserId);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[420px] p-0 border-0 shadow-3xl rounded-[32px] overflow-hidden bg-white/95 backdrop-blur-xl">
                <DialogHeader className="relative p-0 h-36 flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse" />
                    </div>
                    <div className="relative z-10 flex flex-col items-center gap-3 mt-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-2xl">
                            <Users className="w-6 h-6 text-white" />
                        </div>
                        <DialogTitle className="text-xl font-bold text-white text-center leading-tight">
                            Передача территории
                        </DialogTitle>
                    </div>
                </DialogHeader>

                <div className="p-6 space-y-6">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-1 items-center justify-center">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center">ОТ КОГО</p>
                        <p className="font-bold text-slate-800 text-center">{fromUserName}</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">КОМУ ПЕРЕДАТЬ</label>
                        <select
                            value={toUserId}
                            onChange={(e) => setToUserId(Number(e.target.value))}
                            className="w-full h-12 px-4 rounded-xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/5 transition-all font-bold text-slate-700 outline-none"
                        >
                            <option value={0}>Выберите сотрудника...</option>
                            {availableUsers.map((r) => (
                                <option key={r.id} value={r.id}>{r.full_name || r.username}</option>
                            ))}
                        </select>
                        <p className="text-xs text-slate-500 mt-2 font-medium px-1">
                            Все привязанные врачи, аптеки и больницы будут транзакционно переведены на выбранного сотрудника.
                        </p>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="flex-1 h-12 rounded-2xl border-slate-100 font-bold text-slate-500 hover:bg-slate-50 transition-all"
                        >
                            ОТМЕНА
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitting || !toUserId}
                            className={cn(
                                "flex-[2] h-12 bg-gradient-to-r from-indigo-500 to-purple-600",
                                "hover:opacity-90 text-white font-bold rounded-2xl",
                                "text-sm tracking-widest uppercase shadow-xl shadow-purple-500/25",
                                "transition-all disabled:opacity-50",
                            )}
                        >
                            {isSubmitting ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                "ПЕРЕДАТЬ"
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
