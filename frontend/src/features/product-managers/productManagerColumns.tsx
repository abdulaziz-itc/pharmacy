import { type ColumnDef } from "@tanstack/react-table"
import { Link } from "react-router-dom"
import type { ProductManager } from "../../store/productManagerStore"

import { MoreHorizontal, ArrowRightLeft } from "lucide-react"
import { Button } from "../../components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu"

export const getManagerColumns = (
    onTransfer?: (user: ProductManager) => void,
    onToggleActive?: (user: ProductManager) => void
): ColumnDef<ProductManager>[] => [
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
                <Link
                    to={`/product-managers/${row.original.id}`}
                    className="font-bold text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                >
                    {row.getValue("username")}
                </Link>
            ),
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
                    РОЛЬ
                </span>
            ),
            cell: ({ row }) => {
                const isActive = row.original.is_active !== false; // handle undefined as active
                return (
                    <span className={`font-bold ${isActive ? 'text-slate-700' : 'text-slate-400'}`}>
                        {row.getValue("role")} {!isActive && "(Faol emas)"}
                    </span>
                )
            },
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const user = row.original

                if (!onTransfer) return null;

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

                            {onTransfer && user.is_active !== false && (
                                <DropdownMenuItem
                                    onClick={() => onTransfer(user)}
                                    className="rounded-xl focus:bg-purple-50 focus:text-purple-600 cursor-pointer transition-colors px-3 py-2.5"
                                >
                                    <ArrowRightLeft className="mr-2 h-4 w-4 text-purple-500" />
                                    <span className="font-medium text-purple-600">Передать полномочия</span>
                                </DropdownMenuItem>
                            )}

                            {onToggleActive && (
                                <DropdownMenuItem
                                    onClick={() => onToggleActive(user)}
                                    className={`rounded-xl cursor-pointer transition-colors px-3 py-2.5 ${user.is_active !== false
                                            ? "focus:bg-red-50 focus:text-red-600 text-red-500"
                                            : "focus:bg-emerald-50 focus:text-emerald-600 text-emerald-500"
                                        }`}
                                >
                                    <span className="font-medium">
                                        {user.is_active !== false ? "Деактивировать" : "Активировать"}
                                    </span>
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            },
        },
    ]
