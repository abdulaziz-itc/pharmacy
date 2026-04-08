import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'sonner';

interface EditManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    manager: any;
    onSuccess: () => void;
}

export function EditManagerModal({ isOpen, onClose, manager, onSuccess }: EditManagerModalProps) {
    const [formData, setFormData] = useState({
        username: '',
        full_name: '',
        password: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (manager && isOpen) {
            setFormData({
                username: manager.username || '',
                full_name: manager.full_name || '',
                password: '', // Kept empty, only filled if changing
            });
        }
    }, [manager, isOpen]);

    if (!isOpen || !manager) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            const api = (await import('../../api/axios')).default;

            const payload: any = {
                username: formData.username,
                full_name: formData.full_name,
            };

            if (formData.password.trim()) {
                payload.password = formData.password;
            }

            await api.put(`/users/${manager.id}`, payload);
            toast.success('Данные успешно сохранены!');
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Failed to update manager:', error);
            if (error.response?.data?.detail) {
                toast.error(error.response.data.detail);
            } else {
                toast.error('Произошла ошибка при сохранении данных');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h2 className="text-xl font-bold tracking-tight text-slate-800">
                        Редактировать профиль
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5 uppercase tracking-wider text-[11px]">
                                Полное имя
                            </label>
                            <input
                                type="text"
                                value={formData.full_name}
                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                                placeholder="Введите полное имя"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5 uppercase tracking-wider text-[11px]">
                                Имя пользователя (Логин)
                            </label>
                            <input
                                type="text"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                                placeholder="Логин для входа"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5 uppercase tracking-wider text-[11px]">
                                Новый пароль
                            </label>
                            <input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium placeholder:text-slate-400"
                                placeholder="Оставьте пустым, если не хотите менять"
                            />
                            <p className="text-xs text-slate-400 mt-2 ml-1">
                                Только если хотите изменить текущий пароль
                            </p>
                        </div>
                    </div>

                    <div className="pt-2 flex gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="flex-1 h-12 rounded-2xl border-slate-200 hover:bg-slate-50 font-bold"
                            disabled={isSubmitting}
                        >
                            Отмена
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1 h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    Сохранить
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
