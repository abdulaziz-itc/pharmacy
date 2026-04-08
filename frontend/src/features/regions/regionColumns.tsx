import type { ColumnDef } from "@tanstack/react-table";
import type { Region } from "../../store/regionStore";
import { Button } from "../../components/ui/button";
import { Pencil } from "lucide-react";

export const columns = (onEdit: (region: Region) => void): ColumnDef<Region>[] => [
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
    },
    {
        id: "actions",
        header: "",
        cell: ({ row }) => {
            const region = row.original;
            return (
                <div className="flex justify-end">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(region)}
                        className="h-8 w-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors"
                    >
                        <Pencil className="h-4 w-4" />
                    </Button>
                </div>
            );
        },
    }
];
