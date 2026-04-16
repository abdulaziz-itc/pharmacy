import { type ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Pencil, Trash2, Bell, Briefcase, Syringe, UserMinus, UserPlus, Users, ArrowUpDown } from "lucide-react"
import { Button } from "../../components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu"
import type { MedRep } from "../../store/medRepStore"

export const medRepColumns = (
    currentUser: any,
    onReassign: (id: number, name: string) => void,
    onEdit?: (medRep: MedRep) => void,
    onToggleActive?: (medRep: MedRep) => void
): ColumnDef<MedRep>[] => [
        {
            id: "index",
            header: "#",
            cell: ({ row }) => <span className="text-slate-400 font-medium">{row.index + 1}</span>,
        },
        {
            accessorKey: "username",
            header: () => (
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                    ИМЯ ПОЛЬЗОВАТЕЛЯ
                </span>
            ),
            cell: ({ row }) => (
                <span className="font-bold text-blue-600 hover:underline cursor-pointer">
                    {String(row.getValue("username") || "—")}
                </span>
            ),
        },
        {
            accessorKey: "full_name",
            header: () => (
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                    ПОЛНОЕ ИМЯ
                </span>
            ),
            cell: ({ row }) => (
                <span className="font-bold text-blue-600 hover:underline cursor-pointer">
                    {String(row.getValue("full_name") || row.getValue("username") || "—")}
                </span>
            ),
        },
        {
            accessorKey: "role",
            header: () => (
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                    СТАТУС
                </span>
            ),
            cell: ({ row }) => {
                const medRep = row.original;
                const isActive = medRep?.is_active !== false;
                const roleValue = String(row.getValue("role") || "—");
                return (
                    <span className={`font-medium ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {roleValue} {!isActive && "(Faol emas)"}
                    </span>
                );
            }
        },
        {
            accessorKey: "manager_name",
            header: () => (
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                    ПРОДУКТ МЕНЕДЖЕР
                </span>
            ),
            cell: ({ row }) => <span className="font-bold text-slate-900">{String(row.getValue("manager_name") || "—")}</span>,
        },
        {
            accessorKey: "region_names",
            header: () => (
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                    РЕГИОН
                </span>
            ),
            cell: ({ row }) => <span className="font-bold text-slate-900">{String(row.getValue("region_names") || "—")}</span>,
        },
        {
            id: "actions",
            header: () => (
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                    ДЕЙСТВИЯ
                </span>
            ),
            cell: ({ row }) => {
                const medRep = row.original
                const isActive = medRep.is_active !== false
                const user = currentUser
                const isManagement = ['admin', 'investor', 'director', 'deputy_director', 'product_manager', 'regional_manager'].includes(user?.role || '');

                if (!isManagement && user?.id !== medRep.id) return null;

                return (
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600">
                            <Bell className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600">
                            <Briefcase className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600">
                            <Syringe className="h-4 w-4" />
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Действия</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(medRep.username)}>
                                    Копировать имя
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />

                                {isActive && (
                                    <DropdownMenuItem onClick={() => onReassign(medRep.id, medRep.full_name || medRep.username)}>
                                        <Users className="mr-2 h-4 w-4" />
                                        Передать полномочия
                                    </DropdownMenuItem>
                                )}

                                <DropdownMenuItem onClick={() => onEdit && onEdit(medRep)}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Редактировать
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                    className={isActive ? "text-red-600" : "text-emerald-600"}
                                    onClick={() => onToggleActive && onToggleActive(medRep)}
                                >
                                    {isActive ? (
                                        <>
                                            <UserMinus className="mr-2 h-4 w-4" />
                                            Деактивировать
                                        </>
                                    ) : (
                                        <>
                                            <UserPlus className="mr-2 h-4 w-4" />
                                            Активировать
                                        </>
                                    )}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )
            },
        },
    ]
