import * as React from "react"
import {
    type ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
    getPaginationRowModel,
    type SortingState,
    getSortedRowModel,
    type ColumnFiltersState,
    getFilteredRowModel,
    type VisibilityState,
    getExpandedRowModel,
} from "@tanstack/react-table"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../../components/ui/table"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu"
import { ChevronLeft, ChevronRight, Filter, Search, Settings2, X } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    filters?: React.ReactNode
    searchColumn?: string
    onRowClick?: (row: TData) => void
    renderSubComponent?: (props: { row: any }) => React.ReactElement
    meta?: any
    topContent?: React.ReactNode
}

export function DataTable<TData, TValue>({
    columns,
    data,
    filters,
    searchColumn,
    onRowClick,
    renderSubComponent,
    meta,
    topContent,
}: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
        []
    )
    const [columnVisibility, setColumnVisibility] =
        React.useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = React.useState({})

    const headerRef = React.useRef<HTMLDivElement>(null)
    const bodyRef = React.useRef<HTMLDivElement>(null)

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        getExpandedRowModel: getExpandedRowModel(),
        getRowCanExpand: () => true,
        onColumnFiltersChange: setColumnFilters,
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
        },
        meta,
    })

    // Synchronize horizontal scroll between header and body
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (headerRef.current) {
            headerRef.current.scrollLeft = e.currentTarget.scrollLeft
        }
    }

    return (
        <div className="table-container flex flex-col relative overflow-visible border-none bg-transparent">
            {/* 
                THE STICKY CAP: 
                Now forced to top-0 and fully opaque with z-50 to cover any background rows.
            */}
            <div className="sticky top-0 z-50 bg-white border border-slate-200 rounded-t-3xl shadow-xl">
                {/* 1. Filters Row */}
                <div className="flex flex-col xl:flex-row xl:items-center justify-between py-2 px-8 gap-3 bg-white rounded-t-3xl border-b border-slate-100">
                    <div className="flex flex-row flex-wrap items-center gap-2 flex-1">
                        <div className="relative w-full max-w-[180px] group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                            <Input
                                placeholder="Поиск..."
                                value={(searchColumn ? table.getColumn(searchColumn)?.getFilterValue() as string : "") ?? ""}
                                onChange={(event) =>
                                    searchColumn && table.getColumn(searchColumn)?.setFilterValue(event.target.value)
                                }
                                className="pl-9 h-9 bg-slate-50 border-slate-100 rounded-xl focus:ring-blue-500/10 focus:border-blue-500/30 transition-all text-[11px] font-bold"
                            />
                        </div>
                        {filters}
                    </div>
                    <div className="flex items-center gap-2">
                        {columnFilters.length > 0 && (
                            <Button
                                variant="ghost"
                                className="h-9 rounded-xl px-3 gap-2 font-bold text-rose-500 hover:text-rose-600 hover:bg-rose-50 transition-all text-[11px]"
                                onClick={() => table.resetColumnFilters()}
                            >
                                <X className="w-3.5 h-3.5" />
                                Сбросить
                            </Button>
                        )}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="h-9 rounded-xl border-slate-100/50 bg-white px-3 gap-2 font-bold text-slate-600 hover:bg-white hover:shadow-md transition-all text-[11px]">
                                    <Settings2 className="w-3.5 h-3.5" />
                                    Вид
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[180px] rounded-2xl p-2 shadow-2xl border-slate-100/50 backdrop-blur-xl bg-white/90">
                                <div className="px-2 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Колонки</div>
                                {table
                                    .getAllColumns()
                                    .filter((column) => column.getCanHide())
                                    .map((column) => {
                                        return (
                                            <DropdownMenuCheckboxItem
                                                key={column.id}
                                                className="capitalize rounded-xl font-bold text-slate-600 text-xs my-0.5"
                                                checked={column.getIsVisible()}
                                                onCheckedChange={(value) =>
                                                    column.toggleVisibility(!!value)
                                                }
                                            >
                                                {column.id}
                                            </DropdownMenuCheckboxItem>
                                        )
                                    })}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* 2. Stats Row */}
                {topContent && (
                    <div className="px-8 py-1.5 bg-slate-50/50 border-b border-slate-100">
                        {topContent}
                    </div>
                )}

                <div
                    ref={headerRef}
                    className="overflow-hidden bg-white border-x border-b border-slate-200"
                    style={{ scrollbarGutter: 'stable' }}
                >
                    <Table className="w-full bg-white table-fixed border-none">
                        <TableHeader className="border-none">
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id} className="hover:bg-transparent border-none bg-white">
                                    {headerGroup.headers.map((header) => (
                                        <TableHead
                                            key={header.id}
                                            className="h-10 px-3 align-middle text-xs font-black uppercase tracking-widest text-slate-500 bg-white whitespace-nowrap border-none"
                                            style={{
                                                width: header.getSize(),
                                                minWidth: header.getSize(),
                                            }}
                                        >
                                            <div className="flex items-center gap-1.5 w-full">
                                                {header.isPlaceholder
                                                    ? null
                                                    : <div className="min-h-[1.25rem] flex items-center flex-1">
                                                        {flexRender(
                                                            header.column.columnDef.header,
                                                            header.getContext()
                                                        )}
                                                    </div>
                                                }
                                                {header.column.getCanFilter() && (
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <button
                                                                className={`p-1 rounded-md transition-colors hover:bg-slate-200/50 ${header.column.getFilterValue() ? 'text-blue-600' : 'text-slate-300'}`}
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <Filter className="w-3 h-3" />
                                                            </button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-64 p-3 rounded-2xl border-slate-100 shadow-2xl backdrop-blur-xl bg-white" align="start">
                                                            <div className="space-y-3">
                                                                <div className="text-xs font-black text-slate-400 uppercase tracking-widest">
                                                                    Фильтр
                                                                </div>
                                                                <div className="relative group/filter">
                                                                    <Input
                                                                        className="h-9 text-xs bg-slate-50 border-slate-100 rounded-xl focus:ring-blue-500/10 focus:border-blue-500/20 pr-8"
                                                                        placeholder="Поиск..."
                                                                        value={(header.column.getFilterValue() as string) ?? ""}
                                                                        onChange={(event) =>
                                                                            header.column.setFilterValue(event.target.value)
                                                                        }
                                                                        autoFocus
                                                                    />
                                                                    {(header.column.getFilterValue() as string) && (
                                                                        <button
                                                                            onClick={() => header.column.setFilterValue(undefined)}
                                                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-rose-500 transition-colors"
                                                                        >
                                                                            <X className="h-3.5 w-3.5" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </PopoverContent>
                                                    </Popover>
                                                )}
                                            </div>
                                        </TableHead>
                                    ))}
                                </TableRow>
                            ))}
                        </TableHeader>
                    </Table>
                </div>
            </div>

            {/* 
                THE TABLE BODY:
                Removed the horizontal border/gap to make it feel connected to the header.
            */}
            <div
                ref={bodyRef}
                onScroll={handleScroll}
                className="overflow-x-auto bg-white border-x border-b border-slate-200 rounded-b-3xl shadow-2xl shadow-slate-200/50 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent"
                style={{ scrollbarGutter: 'stable' }}
            >
                <Table className="w-full table-fixed border-none">
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <React.Fragment key={row.id}>
                                    <TableRow
                                        data-state={row.getIsSelected() && "selected"}
                                        className={`group transition-all border-slate-50/50 ${onRowClick ? 'cursor-pointer' : ''} bg-white hover:bg-slate-50/30`}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell
                                                key={cell.id}
                                                className="px-3 py-2 text-slate-700 font-medium tracking-tight whitespace-nowrap overflow-hidden text-ellipsis border-none"
                                                style={{
                                                    width: cell.column.getSize(),
                                                    minWidth: cell.column.getSize(),
                                                }}
                                                onClick={() => {
                                                    if (cell.column.id !== 'expander' && cell.column.id !== 'select') {
                                                        onRowClick && onRowClick(row.original);
                                                    }
                                                }}
                                            >
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext()
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                    {row.getIsExpanded() && renderSubComponent && (
                                        <TableRow className="hover:bg-transparent border-none">
                                            <TableCell colSpan={row.getVisibleCells().length} className="p-0 border-none">
                                                <div className="bg-slate-50/50 border-y border-slate-100/10">
                                                    {renderSubComponent({ row })}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </React.Fragment>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-48 text-center"
                                >
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="p-5 rounded-3xl bg-slate-50 text-slate-300 transform -rotate-6">
                                            <Search className="w-10 h-10" />
                                        </div>
                                        <div>
                                            <p className="text-base font-black text-slate-800 tracking-tight">Записи не найдены</p>
                                            <p className="text-xs text-slate-400 font-medium mt-1">Попробуйте изменить параметры фильтрации</p>
                                        </div>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* PAGINATION */}
            <div className="flex items-center justify-between px-8 py-4 bg-white border border-slate-200 rounded-3xl mt-6 shadow-sm">
                <div className="flex-1 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
                    {table.getFilteredSelectedRowModel().rows.length} /{" "}
                    {table.getFilteredRowModel().rows.length} выбрано
                </div>
                <div className="flex items-center gap-8">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Страница <span className="text-blue-600">{table.getState().pagination.pageIndex + 1}</span> / {table.getPageCount()}
                    </div>
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            size="icon"
                            className="w-10 h-10 rounded-2xl border-slate-100 bg-white/50 text-slate-400 hover:text-blue-600 hover:bg-white hover:shadow-lg transition-all"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="w-10 h-10 rounded-2xl border-slate-100 bg-white/50 text-slate-400 hover:text-blue-600 hover:bg-white hover:shadow-lg transition-all"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                        >
                            <ChevronRight className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
