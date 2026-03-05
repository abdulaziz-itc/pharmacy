import type { ColumnDef } from '@tanstack/react-table';
import { type User, UserRole } from '../../store/authStore';
import { Badge } from '../../components/ui/badge';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '../../components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';

export const getDeputyDirectorColumns = (
    onEdit: (user: User) => void,
    onToggleActive: (user: User) => void
): ColumnDef<User>[] => [
        {
            accessorKey: 'full_name',
            header: 'Имя',
            cell: ({ row }) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                        {row.original.full_name?.charAt(0) || row.original.username?.charAt(0)}
                    </div>
                    <div>
                        <div className="font-medium text-slate-900">{row.original.full_name || 'Не указано'}</div>
                        <div className="text-xs text-slate-500">{row.original.username}</div>
                    </div>
                </div>
            )
        },
        {
            accessorKey: 'role',
            header: 'Должность',
            cell: () => (
                <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                    Зам. Директора
                </Badge>
            )
        },
        {
            accessorKey: 'is_active',
            header: 'Статус',
            cell: ({ row }) => {
                const isActive = row.original.is_active;
                return (
                    <Badge variant={isActive ? "default" : "secondary"} className={
                        isActive ? "bg-green-100 text-green-700 border-none" : "bg-slate-100 text-slate-600 border-none"
                    }>
                        {isActive ? 'Активен' : 'Неактивен'}
                    </Badge>
                );
            }
        },
        {
            id: 'actions',
            cell: ({ row }) => {
                const user = row.original;
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Меню</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[200px] rounded-2xl p-2 border-none shadow-xl">
                            <DropdownMenuLabel className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                Действия
                            </DropdownMenuLabel>
                            <DropdownMenuItem
                                onClick={() => onEdit(user)}
                                className="font-medium cursor-pointer rounded-xl hover:bg-slate-50 mt-1"
                            >
                                Редактировать
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-slate-100" />
                            <DropdownMenuItem
                                onClick={() => onToggleActive(user)}
                                className={`font-medium cursor-pointer rounded-xl mt-1 ${user.is_active
                                    ? 'text-red-600 hover:text-red-700 hover:bg-red-50'
                                    : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                                    }`}
                            >
                                {user.is_active ? 'Деактивировать' : 'Активировать'}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            }
        }
    ];
