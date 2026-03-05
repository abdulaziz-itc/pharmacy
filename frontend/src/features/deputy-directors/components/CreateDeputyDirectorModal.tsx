import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import api from '../../../api/axios';
import { UserRole } from '../../../store/authStore';
import { toast } from 'sonner';

interface CreateDeputyDirectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function CreateDeputyDirectorModal({ isOpen, onClose, onSuccess }: CreateDeputyDirectorModalProps) {
    const [isLoading, setIsLoading] = React.useState(false);
    const [formData, setFormData] = React.useState({
        full_name: '',
        username: '',
        password: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await api.post('/users/', {
                ...formData,
                role: UserRole.DEPUTY_DIRECTOR
            });
            onSuccess();
            onClose();
            setFormData({ full_name: '', username: '', password: '' });
            toast.success("Заместитель директора успешно добавлен!");
        } catch (error: any) {
            console.error('Failed to create deputy director:', error);
            if (error.response?.data?.detail) {
                toast.error(error.response.data.detail);
            } else {
                toast.error("Ошибка при создании.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden border-none shadow-2xl rounded-3xl">
                <DialogHeader className="bg-blue-600 p-8 text-white relative">
                    <DialogTitle className="text-2xl font-bold text-center tracking-tight">
                        Новый заместитель
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
                                placeholder="ФИО"
                                className="h-12 rounded-xl border-slate-200 focus:border-blue-500 transition-all font-medium"
                                value={formData.full_name}
                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="username" className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                Имя пользователя (Логин)
                            </Label>
                            <Input
                                id="username"
                                placeholder="Логин"
                                className="h-12 rounded-xl border-slate-200 focus:border-blue-500 transition-all font-medium"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                Пароль
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Пароль"
                                className="h-12 rounded-xl border-slate-200 focus:border-blue-500 transition-all font-medium"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <Button
                        type="submit"
                        className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest shadow-lg shadow-blue-200 transition-all active:scale-[0.98]"
                        disabled={isLoading}
                    >
                        {isLoading ? 'СОЗДАНИЕ...' : 'СОЗДАТЬ'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}

