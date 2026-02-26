import { type ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Pencil, Trash2, Bell, Briefcase, Syringe } from "lucide-react"
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

export const medRepColumns: ColumnDef<MedRep>[] = [
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
        cell: ({ row }) => <span className="font-bold text-slate-900">{row.getValue("username")}</span>,
    },
    {
        accessorKey: "full_name",
        header: () => (
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                ПОЛНОЕ ИМЯ
            </span>
        ),
        cell: ({ row }) => <span className="font-bold text-slate-900">{row.getValue("full_name")}</span>,
    },
    {
        accessorKey: "role",
        header: () => (
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                СТАТУС
            </span>
        ),
        cell: ({ row }) => <span className="font-medium text-slate-500">{row.getValue("role")}</span>,
    },
    {
        accessorKey: "manager_name",
        header: () => (
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                ПРОДУКТ МЕНЕДЖЕР
            </span>
        ),
        cell: ({ row }) => <span className="font-bold text-slate-900">{row.getValue("manager_name") || "—"}</span>,
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

            return (
                <div className="flex items-center gap-2">
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
                            <DropdownMenuItem
                                onClick={() => navigator.clipboard.writeText(medRep.username)}
                            >
                                Копировать имя
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                                <Pencil className="mr-2 h-4 w-4" />
                                Редактировать
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Удалить
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            )
        },
    },
]
