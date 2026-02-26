import { type ColumnDef } from "@tanstack/react-table"
import { Link } from "react-router-dom"
import type { ProductManager } from "../../store/productManagerStore"

export const columns: ColumnDef<ProductManager>[] = [
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
        cell: ({ row }) => <span className="font-bold text-slate-700">{row.getValue("role")}</span>,
    },
]
