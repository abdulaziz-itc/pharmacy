import { useState } from 'react';
import { LogOut, Pencil, Check, X } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import axiosInstance from '../api/axios';
import { toast } from 'sonner';

const ROLE_LABELS: Record<string, string> = {
    investor: 'Инвестор (Владелец)',
    admin: 'Администратор',
    director: 'Директор',
    deputy_director: 'Зам. директора',
    hrd: 'HRD',
    head_of_orders: 'Менеджер по закупкам',
    head_of_warehouse: 'Завсклад',
    wholesale_manager: 'Оптовый менеджер',
    product_manager: 'Продукт менеджер',
    field_force_manager: 'Field Force Manager',
    regional_manager: 'Региональный менеджер',
    med_rep: 'Мед представитель',
};

export function Header() {
    const { user, setAuth, token } = useAuthStore();
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const { logout } = useAuthStore();

    const startEdit = () => {
        setEditName(user?.full_name || '');
        setIsEditing(true);
    };

    const cancelEdit = () => {
        setIsEditing(false);
        setEditName('');
    };

    const saveEdit = async () => {
        if (!editName.trim()) return;
        setIsSaving(true);
        try {
            await axiosInstance.put(`/users/${user?.id}`, { full_name: editName.trim() });
            // Update local auth store with new full_name
            if (user && token) {
                setAuth({ ...user, full_name: editName.trim() }, token);
            }
            toast.success('Имя успешно обновлено');
            setIsEditing(false);
        } catch (err: any) {
            toast.error(err.response?.data?.detail || 'Ошибка при обновлении имени');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <header className="sticky top-0 z-10 h-16 glass border-b flex items-center justify-between px-8 shadow-sm">
            <div className="flex items-center gap-4">
                {isEditing ? (
                    <div className="flex items-center gap-2">
                        <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                            className="h-8 text-sm rounded-lg w-56 border-blue-300 focus:ring-blue-500"
                            placeholder="ФИО"
                            autoFocus
                        />
                        <Button size="sm" variant="ghost" onClick={saveEdit} disabled={isSaving}
                            className="h-8 w-8 p-0 text-emerald-600 hover:bg-emerald-50 rounded-lg">
                            <Check className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={cancelEdit}
                            className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 rounded-lg">
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 group cursor-pointer" onClick={startEdit}>
                        <h2 className="text-lg font-semibold text-slate-800 tracking-tight">
                            С возвращением, <span className="text-blue-600 font-bold">{user?.full_name || user?.username || 'Пользователь'}</span>
                        </h2>
                        <Pencil className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                )}
            </div>

            <div className="flex items-center gap-6">
                <div className="flex items-center gap-3 pr-6 border-r border-slate-200">
                    <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900 leading-none">
                            {user?.full_name || user?.username || 'Initial Admin'}
                        </p>
                        <p className="text-[10px] text-slate-500 font-medium uppercase mt-1 tracking-tighter">
                            {ROLE_LABELS[user?.role || ''] || user?.role || ''}
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
                        {user?.full_name?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || 'A'}
                    </div>
                </div>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={logout}
                    className="text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all rounded-xl gap-2 font-medium"
                >
                    <LogOut className="w-4 h-4" />
                    Выход
                </Button>
            </div>
        </header>
    );
}
