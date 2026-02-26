import { type ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, Pencil, Wallet } from "lucide-react"
import { Button } from "../../components/ui/button"

import type { Product } from "../../store/productStore"


// Fixed formatter based on the screenshot (which shows "360 000" for 360000)
const rubFormatter = new Intl.NumberFormat("ru-RU", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

import { Switch } from "../../components/ui/switch"

// ... imports

export const createColumns = (
    onEdit: (product: Product) => void,
    onStatusChange: (id: number, newStatus: "active" | "inactive") => void
): ColumnDef<Product>[] => [
        {
            id: "index",
            header: "#",
            cell: ({ row }) => <span className="text-slate-400 font-medium">{row.index + 1}</span>,
        },
        {
            accessorKey: "name",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="hover:bg-transparent p-0 text-[10px] font-bold text-slate-400 uppercase tracking-widest"
                >
                    НАЗВАНИЕ
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
            ),
            cell: ({ row }) => <span className="font-bold text-slate-900">{row.getValue("name")}</span>,
        },
        {
            accessorKey: "price",
            header: () => <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ЦЕНА</span>,
            cell: ({ row }) => <span className="font-bold text-slate-700">{rubFormatter.format(row.getValue("price"))}</span>,
        },
        {
            accessorKey: "production_price",
            header: () => <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ПРОИЗ. ЦЕНА</span>,
            cell: ({ row }) => <span className="font-bold text-slate-700">{rubFormatter.format(row.getValue("production_price"))}</span>,
        },
        {
            id: "manufacturer_name",
            accessorFn: (row) => row.manufacturers?.map(m => m.name).join(', ') ?? "—",
            header: () => <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ПРОИЗВОДИТЕЛЬ</span>,
            cell: ({ getValue }) => <span className="font-bold text-slate-700">{(getValue() as string).toUpperCase()}</span>,
        },
        {
            id: "category_name",
            accessorFn: (row) => row.category?.name ?? "—",
            header: () => <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">КАТЕГОРИЯ</span>,
            cell: ({ getValue }) => <span className="font-bold text-slate-700">{getValue() as string}</span>,
        },
        {
            accessorKey: "is_active",
            header: () => <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">СТАТУС</span>,
            cell: ({ row }) => {
                const isActive = row.getValue("is_active") as boolean

                return (
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Switch
                            id={`product-status-${row.id}`}
                            checked={isActive}
                            onCheckedChange={(checked) => {
                                onStatusChange(row.original.id, checked ? "active" : "inactive")
                            }}
                        />
                        <label
                            htmlFor={`product-status-${row.id}`}
                            className={`text-[10px] font-bold cursor-pointer select-none ${isActive ? "text-blue-600" : "text-slate-400"}`}
                        >
                            {isActive ? "АКТИВЕН" : "НЕАКТИВЕН"}
                        </label>
                    </div>
                )
            },
        },
        {
            accessorKey: "marketing_expense",
            header: () => <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center block">РАСХОДЫ НА<br />МАРКЕТИНГ</span>,
            cell: ({ row }) => <span className="font-bold text-slate-700 block text-center">{rubFormatter.format(row.getValue("marketing_expense") ?? 0)}</span>,
        },
        {
            accessorKey: "salary_expense",
            header: () => <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center block">РАСХОДЫ НА<br />ЗАРПЛАТУ</span>,
            cell: ({ row }) => <span className="font-bold text-slate-700 block text-center">{rubFormatter.format(row.getValue("salary_expense") ?? 0)}</span>,
        },
        {
            accessorKey: "other_expenses",
            header: () => <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center block">ПРОЧИЕ<br />РАСХОДЫ</span>,
            cell: ({ row }) => <span className="font-bold text-slate-700 block text-center">{rubFormatter.format(row.getValue("other_expenses") ?? 0)}</span>,
        },
        {
            id: "net_profit",
            header: () => <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest text-center block">СОФ<br />ФОЙДА</span>,
            cell: ({ row }) => {
                const p = row.original;
                const profit = (p.price ?? 0) - (p.production_price ?? 0) - (p.marketing_expense ?? 0) - (p.salary_expense ?? 0) - (p.other_expenses ?? 0);
                return (
                    <span className={`font-black block text-center text-sm ${profit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {rubFormatter.format(profit)}
                    </span>
                );
            },
        },
        {
            id: "add_expenses",
            header: () => <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center block">ВНЕСТИ<br />РАСХОДЫ</span>,
            cell: () => (
                <div className="flex justify-center">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50">
                        <Wallet className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
        {
            id: "edit",
            header: () => <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center block">ИЗМЕНИТЬ</span>,
            cell: ({ row }) => (
                <div className="flex justify-center">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                        onClick={() => onEdit(row.original)}
                    >
                        <Pencil className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ]
