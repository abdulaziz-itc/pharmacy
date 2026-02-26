import { type ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MapPin, ChevronDown, ChevronRight } from "lucide-react"
import { Button } from "../../components/ui/button"
import { Checkbox } from "../../components/ui/checkbox"
import type { Doctor } from "../../store/doctorStore"
import { cn } from "../../lib/utils"

export const columns: ColumnDef<Doctor>[] = [
    {
        id: "select",
        header: ({ table }) => (
            <Checkbox
                checked={table.getIsAllPageRowsSelected()}
                onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                aria-label="Select all"
                className="translate-y-[2px]"
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Select row"
                className="translate-y-[2px]"
            />
        ),
        enableSorting: false,
        enableHiding: false,
        size: 40,
    },
    {
        id: "expander",
        header: () => null,
        cell: ({ row }) => (
            <button
                {...{
                    onClick: (e) => {
                        e.stopPropagation();
                        row.toggleExpanded();
                    },
                    style: { cursor: 'pointer' },
                }}
                className="p-1 hover:bg-slate-100 rounded-full transition-colors border border-slate-200"
            >
                {row.getIsExpanded() ? (
                    <ChevronDown className="h-4 w-4 text-blue-600" />
                ) : (
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                )}
            </button>
        ),
        size: 40,
    },
    {
        accessorKey: "id",
        header: () => (
            <div className="w-full text-center text-xs font-bold text-slate-400 uppercase tracking-widest">№</div>
        ),
        cell: ({ row }) => <span className="text-slate-500 font-mono text-xs">{row.getValue("id")}</span>,
        size: 60,
    },
    {
        accessorKey: "name",
        header: ({ column }) => (
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                className="w-full hover:bg-transparent p-0 text-xs font-bold text-slate-400 uppercase tracking-widest"
            >
                Профиль врача
                <ArrowUpDown className="ml-2 h-3 w-3" />
            </Button>
        ),
        cell: ({ row }) => {
            const name = row.getValue("name") as string
            const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)

            return (
                <div className="flex items-center gap-3 w-full">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-blue-500/20 flex-shrink-0">
                        {initials}
                    </div>
                    <div className="truncate">
                        <div className="font-bold text-slate-900 leading-tight truncate">{name}</div>
                        <div className="text-[9px] text-slate-400 font-medium mt-0.5">Специалист</div>
                    </div>
                </div>
            )
        },
        size: 250,
    },
    {
        accessorKey: "medReps",
        header: () => (
            <div className="w-full text-xs font-bold text-slate-400 uppercase tracking-widest text-left">Мед представитель</div>
        ),
        cell: ({ row }) => (
            <div className="text-xs font-semibold text-slate-700 truncate">{row.getValue("medReps")}</div>
        ),
        size: 180,
    },
    {
        accessorKey: "region",
        header: () => (
            <div className="w-full text-xs font-bold text-slate-400 uppercase tracking-widest text-left">Регион</div>
        ),
        cell: ({ row }) => (
            <div className="flex items-center gap-1 text-xs font-semibold text-slate-600 truncate">
                <MapPin className="w-3 h-3 text-slate-400" />
                <span className="truncate">{row.getValue("region")}</span>
            </div>
        ),
        size: 150,
    },
    {
        accessorKey: "specialty",
        header: () => (
            <div className="w-full text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Специальность</div>
        ),
        cell: ({ row }) => (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider border border-blue-100/50 whitespace-nowrap">
                {row.getValue("specialty")}
            </div>
        ),
        size: 150,
    },
    {
        accessorKey: "organization",
        header: () => (
            <div className="w-full text-xs font-bold text-slate-400 uppercase tracking-widest text-left">Организация</div>
        ),
        cell: ({ row }) => (
            <div className="text-xs font-bold text-slate-700 truncate">
                {row.getValue("organization")}
            </div>
        ),
        size: 200,
    },
    {
        accessorKey: "totalPlan",
        header: () => (
            <div className="text-right w-full text-xs font-bold text-slate-400 uppercase tracking-widest">План</div>
        ),
        cell: ({ row }) => {
            const amount = parseFloat(row.getValue("totalPlan"))
            return <div className="text-right font-bold text-slate-900 text-xs">{amount.toLocaleString()} уп.</div>
        },
        size: 100,
    },
    {
        accessorKey: "fact",
        header: () => (
            <div className="text-right w-full text-xs font-bold text-slate-400 uppercase tracking-widest">Факт</div>
        ),
        cell: ({ row }) => {
            const amount = parseFloat(row.getValue("fact"))
            return <div className="text-right font-bold text-slate-900 text-xs">{amount.toLocaleString()} уп.</div>
        },
        size: 100,
    },
    {
        accessorKey: "factReceived",
        header: () => (
            <div className="text-right w-full text-xs font-bold text-slate-400 uppercase tracking-widest">Выручка</div>
        ),
        cell: ({ row }) => {
            const amount = parseFloat(row.getValue("factReceived"))
            return <div className="text-right font-bold text-slate-900 text-xs">{amount.toLocaleString()} сум</div>
        },
        size: 130,
    },
    {
        accessorKey: "factPercent",
        header: () => (
            <div className="text-center w-full text-xs font-bold text-slate-400 uppercase tracking-widest">Выполн. %</div>
        ),
        cell: ({ row }) => {
            const plan = parseFloat(row.getValue("totalPlan")) || 0;
            const fact = parseFloat(row.getValue("fact")) || 0;
            const percent = plan > 0 ? parseFloat(((fact / plan) * 100).toFixed(1)) : 0;
            return (
                <div className="flex flex-col items-center gap-1 w-full">
                    <div className={cn(
                        "text-xs font-bold",
                        percent >= 100 ? "text-emerald-600" : percent < 50 ? "text-rose-600" : "text-amber-600"
                    )}>
                        {percent}%
                    </div>
                    <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className={cn(
                                "h-full transition-all duration-1000",
                                percent >= 100 ? "bg-emerald-500" : percent < 50 ? "bg-rose-500" : "bg-amber-500"
                            )}
                            style={{ width: `${Math.min(percent, 100)}%` }}
                        />
                    </div>
                </div>
            )
        },
        size: 80,
    },
    {
        accessorKey: "bonus",
        header: () => (
            <div className="text-right w-full text-xs font-bold text-slate-400 uppercase tracking-widest">Бонус</div>
        ),
        cell: ({ row }) => {
            const amount = parseFloat(row.getValue("bonus"))
            return <div className="text-right font-bold text-slate-900 text-xs">{amount.toLocaleString()} сум</div>
        },
        size: 130,
    },
    {
        accessorKey: "bonusPaid",
        header: () => (
            <div className="text-right w-full text-xs font-bold text-slate-400 uppercase tracking-widest">Выплачено</div>
        ),
        cell: ({ row }) => {
            const amount = parseFloat(row.getValue("bonusPaid"))
            return <div className="text-right font-bold text-slate-600 text-xs">{amount.toLocaleString()} сум</div>
        },
        size: 130,
    },
    {
        accessorKey: "bonusBalance",
        header: () => (
            <div className="text-right w-full text-xs font-bold text-slate-400 uppercase tracking-widest">Остаток</div>
        ),
        cell: ({ row }) => {
            const amount = parseFloat(row.getValue("bonusBalance"))
            return (
                <div className="text-right">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-100">
                        {amount.toLocaleString()} сум
                    </span>
                </div>
            )
        },
        size: 130,
    },
    {
        accessorKey: "preInvest",
        header: () => (
            <div className="text-right w-full text-xs font-bold text-slate-400 uppercase tracking-widest">Прединвест</div>
        ),
        cell: ({ row }) => {
            const amount = parseFloat(row.getValue("preInvest"))
            return <div className="text-right font-bold text-slate-600 text-xs">{amount.toLocaleString()} сум</div>
        },
        size: 130,
    },
]
