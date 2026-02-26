import { type ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"

export interface Visit {
    id: number;
    visit_date: string;
    visit_type: string;
    result: string | null;
    notes: string | null;
    doctor: {
        id: number;
        full_name: string;
    };
    med_org: {
        id: number;
        name: string;
    } | null;
}

export const visitColumns: ColumnDef<Visit>[] = [
    {
        id: "index",
        header: "#",
        cell: ({ row }) => <span className="text-slate-400 font-medium">{row.index + 1}</span>,
    },
    {
        accessorKey: "doctor.full_name",
        header: () => (
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                Врач
            </span>
        ),
        cell: ({ row }) => <span className="font-bold text-slate-900">{row.original.doctor.full_name}</span>,
    },
    {
        accessorKey: "med_org.name",
        header: () => (
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                Мед. организация
            </span>
        ),
        cell: ({ row }) => <span className="text-slate-700">{row.original.med_org?.name || "—"}</span>,
    },
    {
        accessorKey: "visit_type",
        header: () => (
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                Тип визита
            </span>
        ),
        cell: ({ row }) => <span className="text-slate-700">{row.getValue("visit_type")}</span>,
    },
    {
        accessorKey: "visit_date",
        header: () => (
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                Дата
            </span>
        ),
        cell: ({ row }) => {
            const date = new Date(row.getValue("visit_date"));
            return <span className="text-slate-700">{format(date, "dd.MM.yyyy")}</span>;
        },
    },
    {
        accessorKey: "result",
        header: () => (
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                Результат
            </span>
        ),
        cell: ({ row }) => {
            const result = row.getValue("result") as string | null;
            return (
                <span className={`font-medium ${result === "Успешно" ? "text-green-600" : "text-slate-700"}`}>
                    {result || "—"}
                </span>
            );
        },
    },
]
