import { type ColumnDef } from "@tanstack/react-table"

export interface SubordinateUser {
    id: number;
    username: string;
    full_name: string;
    role: string;
}

export const subordinateColumns: ColumnDef<SubordinateUser>[] = [
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
]
