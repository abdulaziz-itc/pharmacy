import { LogOut } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/button';

export function Header() {
    const { user, logout } = useAuthStore();

    return (
        <header className="sticky top-0 z-10 h-16 glass border-b flex items-center justify-between px-8 shadow-sm">
            <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold text-slate-800 tracking-tight">
                    С возвращением, <span className="text-blue-600 font-bold">{user?.username || 'Пользователь'}</span>
                </h2>
            </div>

            <div className="flex items-center gap-6">
                <div className="flex items-center gap-3 pr-6 border-r border-slate-200">
                    <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900 leading-none">
                            {user?.username || 'Initial Admin'}
                        </p>
                        <p className="text-[10px] text-slate-500 font-medium uppercase mt-1 tracking-tighter">
                            {user?.role === 'admin' ? 'Администратор' : user?.role || 'Зам. директора'}
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
                        {user?.username?.charAt(0).toUpperCase() || 'A'}
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
