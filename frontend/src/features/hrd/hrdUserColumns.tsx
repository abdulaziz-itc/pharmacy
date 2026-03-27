import { type ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Pencil, UserMinus, UserPlus, Shield } from "lucide-react"
import { Button } from "../../components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu"
import { Badge } from "../../components/ui/badge"
import { cn } from "../../lib/utils"

export interface User {
    id: number;
    username: string;
    full_name: string;
    role: string;
    is_active: boolean;
    manager_name?: string | null;
}

export const hrdUserColumns = (
    onEdit: (user: User) => void,
    onToggleActive: (user: User) => void
): ColumnDef<User>[] => [
    {
        id: "index",
        header: "#",
        cell: ({ row }) => <span className="text-slate-400 font-medium">{row.index + 1}</span>,
    },
    {
        accessorKey: "full_name",
        header: "ФИО",
        cell: ({ row }) => (
            <div className="flex flex-col">
                <span className="font-bold text-slate-900">{row.getValue("full_name")}</span>
                <span className="text-xs text-slate-400">@{row.original.username}</span>
            </div>
        ),
    },
    {
        accessorKey: "role",
        header: "Роль",
        cell: ({ row }) => {
            const role = row.getValue("role") as string;
            return (
                <div className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-medium text-slate-700 capitalize">
                        {role.replace('_', ' ')}
                    </span>
                </div>
            );
        }
    },
    {
        accessorKey: "manager_name",
        header: "Руководитель",
        cell: ({ row }) => <span className="text-slate-600">{row.getValue("manager_name") || "—"}</span>,
    },
    {
        accessorKey: "is_active",
        header: "Статус",
        cell: ({ row }) => {
            const isActive = row.getValue("is_active") as boolean;
            return (
                <Badge 
                    variant="outline" 
                    className={cn(
                        "rounded-full px-3",
                        isActive 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                            : "bg-slate-50 text-slate-600 border-slate-200"
                    )}
                >
                    {isActive ? "Активен" : "Неактивен"}
                </Badge>
            );
        }
    },
    {
        id: "actions",
        header: "",
        cell: ({ row }) => {
            const user = row.original;
            const isActive = user.is_active;

            return (
                <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-100 rounded-full">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Действия</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            
                            <DropdownMenuItem onClick={() => onEdit(user)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Редактировать
                            </DropdownMenuItem>

                            <DropdownMenuItem
                                className={isActive ? "text-red-600" : "text-emerald-600"}
                                onClick={() => onToggleActive(user)}
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
            );
        },
    },
];
