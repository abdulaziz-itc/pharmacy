import { type ColumnDef } from "@tanstack/react-table"
import { Pencil } from "lucide-react"
import { Button } from "../../components/ui/button"
import type { Manufacturer } from "../../store/manufacturerStore"

export const columns: ColumnDef<Manufacturer>[] = [
    {
        id: "index",
        header: "#",
        cell: ({ row }) => <span className="text-slate-400 font-medium">{row.index + 1}</span>,
    },
    {
        accessorKey: "name",
        header: () => (
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                НАЗВАНИЕ
            </span>
        ),
        cell: ({ row }) => <span className="font-bold text-slate-900">{row.getValue("name")}</span>,
    },
    {
        id: "actions",
        header: () => (
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right block pr-4">
                ДЕЙСТВИЯ
            </span>
        ),
        cell: () => (
            <div className="flex justify-end pr-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50">
                    <Pencil className="h-4 w-4" />
                </Button>
            </div>
        ),
    },
]
