import { type ColumnDef } from "@tanstack/react-table"
import { Pencil, MapPin } from "lucide-react"
import { Button } from "../../components/ui/button"
import type { MedicalOrganization } from "../../store/medOrgStore"

export const medOrgColumns: ColumnDef<MedicalOrganization>[] = [
    {
        id: "index",
        header: "#",
        cell: ({ row }) => <span className="text-slate-400 font-medium">{row.index + 1}</span>,
    },
    {
        accessorKey: "name",
        header: "Название",
        cell: ({ row }) => (
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-[10px] shadow-sm flex-shrink-0">
                    {row.original.name ? row.original.name.substring(0, 2).toUpperCase() : 'MO'}
                </div>
                <div className="flex flex-col">
                    <span className="font-bold text-slate-900 leading-tight">
                        {row.getValue("name") || "—"}
                    </span>
                    {row.original.brand && (
                        <span className="text-[10px] text-slate-500 font-medium">
                            Бренд: {row.original.brand}
                        </span>
                    )}
                </div>
            </div>
        ),
    },
    {
        accessorKey: "org_type",
        header: "Тип",
        cell: ({ row }) => {
            const types: Record<string, string> = {
                pharmacy: 'Аптека',
                clinic: 'Клиника',
                hospital: 'Больница / Госпиталь',
                lechebniy: 'Лечебное Учреждение'
            };
            const val = row.getValue("org_type") as string;
            return (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-blue-50 text-blue-600">
                    {types[val] || val || "—"}
                </span>
            );
        },
    },
    {
        accessorKey: "contact_phone",
        header: "Телефон",
        cell: ({ row }) => (
            <div className="text-[12px] font-medium text-slate-700">
                {row.getValue("contact_phone") || "—"}
            </div>
        ),
    },
    {
        accessorKey: "address",
        header: "Адрес",
        cell: ({ row }) => (
            <div className="text-[11px] text-slate-500 max-w-[300px] leading-relaxed">
                {row.getValue("address") || "—"}
            </div>
        ),
    },
    {
        id: "region",
        accessorFn: (row) => row.region?.name,
        header: "Регион",
        cell: ({ row }) => (
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {row.original.region?.name || "—"}
            </div>
        ),
    },
    {
        id: "actions",
        header: "Действия",
        cell: () => (
            <div className="flex justify-end pr-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-slate-50">
                    <Pencil className="h-4 w-4" />
                </Button>
            </div>
        ),
    },
]
