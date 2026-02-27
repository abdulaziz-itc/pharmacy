import { type ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Edit, Trash2 } from "lucide-react"
import { Button } from "../../components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu"

export interface SubordinateUser {
    id: number;
    username: string;
    full_name: string;
    role: string;
}

export const getSubordinateColumns = (
    onEdit: (user: SubordinateUser) => void
): ColumnDef<SubordinateUser>[] => [
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
            cell: ({ row }) => <span className="font-bold text-blue-600">{row.getValue("username")}</span>,
        },
        {
            accessorKey: "full_name",
            header: () => (
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                    ПОЛНОЕ ИМЯ
                </span>
            ),
            cell: ({ row }) => <span className="font-bold text-slate-700">{row.getValue("full_name")}</span>,
        },
        {
            accessorKey: "role",
            header: () => (
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                    СТАТУС
                </span>
            ),
            cell: ({ row }) => <span className="font-medium text-slate-600">{row.getValue("role")}</span>,
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const user = row.original

                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-100 rounded-lg transition-colors">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4 text-slate-400" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-2xl border-none shadow-xl shadow-slate-200/50 p-2">
                            <DropdownMenuLabel className="text-xs font-bold uppercase tracking-wider text-slate-400 px-2 py-1.5">
                                Действия
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-slate-100 my-1" />
                            <DropdownMenuItem
                                onClick={() => onEdit(user)}
                                className="rounded-xl focus:bg-blue-50 focus:text-blue-600 cursor-pointer transition-colors px-3 py-2.5"
                            >
                                <Edit className="mr-2 h-4 w-4" />
                                <span className="font-medium">Редактировать</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            },
        },
    ]
