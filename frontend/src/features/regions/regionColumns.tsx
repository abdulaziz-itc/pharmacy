import type { ColumnDef } from "@tanstack/react-table";
import type { Region } from "../../store/regionStore";

export const columns: ColumnDef<Region>[] = [
    {
        id: "index",
        header: "#",
        cell: ({ row }) => <div className="font-medium text-slate-400">{row.index + 1}</div>,
    },
    {
        accessorKey: "name",
        header: "Название региона",
        cell: ({ row }) => {
            return (
                <div className="flex items-center">
                    <span className="font-bold text-slate-900">{row.getValue("name")}</span>
                </div>
            );
        },
    }
];
