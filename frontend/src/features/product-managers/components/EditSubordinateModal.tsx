import React, { useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { updateUser } from '../../../api/user';
import { type SubordinateUser } from '../subordinateColumns';

interface EditSubordinateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    user: SubordinateUser | null;
}

export function EditSubordinateModal({ isOpen, onClose, onSuccess, user }: EditSubordinateModalProps) {
    const [isLoading, setIsLoading] = React.useState(false);
    const [formData, setFormData] = React.useState({
        full_name: '',
        username: '',
        password: '',
    });

    useEffect(() => {
        if (user) {
            setFormData({
                full_name: user.full_name || '',
                username: user.username || '',
                password: '', // default empty, only send if user types something
            });
        }
    }, [user, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setIsLoading(true);
        try {
            const updatePayload: any = {
                full_name: formData.full_name,
                username: formData.username,
            };

            if (formData.password) {
                updatePayload.password = formData.password;
            }

            await updateUser(user.id, updatePayload);
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Failed to update user:', error);
            // Optionally could show an error toast here
        } finally {
            setIsLoading(false);
        }
    };

    if (!user) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden border-none shadow-2xl rounded-3xl">
                <DialogHeader className="bg-blue-600 p-8 text-white relative">
                    <DialogTitle className="text-2xl font-bold text-center tracking-tight">
                        Редактировать
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="p-8 space-y-6 bg-white">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="full_name" className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                Полное имя
                            </Label>
                            <Input
                                id="full_name"
                                placeholder="Полное имя"
                                className="h-12 rounded-xl border-slate-200 focus:border-blue-500 transition-all font-medium"
                                value={formData.full_name}
                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="username" className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                Имя пользователя
                            </Label>
                            <Input
                                id="username"
                                placeholder="Имя пользователя"
                                className="h-12 rounded-xl border-slate-200 focus:border-blue-500 transition-all font-medium"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                Новый пароль (оставьте пустым для сохранения старого)
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Новый пароль"
                                className="h-12 rounded-xl border-slate-200 focus:border-blue-500 transition-all font-medium"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>
                    </div>

                    <Button
                        type="submit"
                        className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest shadow-lg shadow-blue-200 transition-all active:scale-[0.98]"
                        disabled={isLoading}
                    >
                        {isLoading ? 'СОХРАНЕНИЕ...' : 'СОХРАНИТЬ'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
