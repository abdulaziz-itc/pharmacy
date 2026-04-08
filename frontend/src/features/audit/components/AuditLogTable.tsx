import React from "react";
import { format } from "date-fns";
import {
    Search,
    Filter,
    Calendar as CalendarIcon,
    User,
    Activity,
    Globe,
    Info,
    ChevronLeft,
    ChevronRight
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "../../../components/ui/data-table";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "../../../components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "../../../components/ui/dialog";
import { Badge } from "../../../components/ui/badge";
import { toast } from "sonner";
import type { AuditLog } from "../../../api/audit";
import { getAuditLogs, getAuditActions, clearAuditLogs } from "../../../api/audit";

const columns: ColumnDef<AuditLog>[] = [
    {
        accessorKey: "created_at",
        header: "ДАТА И ВРЕМЯ",
        cell: ({ row }) => (
            <div className="flex flex-col">
                <span className="font-bold text-slate-900">
                    {format(new Date(row.original.created_at), "dd.MM.yyyy")}
                </span>
                <span className="text-[10px] text-slate-400 font-medium uppercase">
                    {format(new Date(row.original.created_at), "HH:mm:ss")}
                </span>
            </div>
        )
    },
    {
        accessorKey: "username",
        header: "ПОЛЬЗОВАТЕЛЬ",
        cell: ({ row }) => (
            <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <span className="font-black text-slate-700 uppercase text-[11px] tracking-tight">
                    {row.original.full_name || row.original.username}
                </span>
            </div>
        )
    },
    {
        accessorKey: "action",
        header: "ДЕЙСТВИЕ",
        cell: ({ row }) => {
            const actionLabels: Record<string, { label: string, color: string }> = {
                'CREATE': { label: 'СОЗДАНИЕ', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
                'UPDATE': { label: 'ИЗМЕНЕНИЕ', color: 'bg-blue-100 text-blue-700 border-blue-200' },
                'DELETE': { label: 'УДАЛЕНИЕ', color: 'bg-rose-100 text-rose-700 border-rose-200' },
                'REASSIGN': { label: 'ПЕРЕДАЧА', color: 'bg-amber-100 text-amber-700 border-amber-200' },
                'REPORT_DOWNLOAD': { label: 'СКАЧИВАНИЕ', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
                'UPDATE_STATUS': { label: 'ОБН. СТАТУСА', color: 'bg-purple-100 text-purple-700 border-purple-200' },
                'RESERVATION_MODIFIED': { label: '⚠️ ИЗМЕНЕНИЕ ЦЕНЫ/БОНУСА', color: 'bg-red-100 text-red-800 border-red-300 font-extrabold shadow-sm' },
            };
            const info = actionLabels[row.original.action] || { label: row.original.action, color: 'bg-slate-100 text-slate-700' };
            return (
                <Badge variant="outline" className={`font-black text-[9px] px-2 py-0 border ${info.color} rounded-md h-5`}>
                    {info.label}
                </Badge>
            );
        }
    },
    {
        accessorKey: "entity_type",
        header: "ОБЪЕКТ",
        cell: ({ row }) => (
            <Badge variant="secondary" className="bg-slate-50 text-slate-500 font-bold text-[9px] uppercase border-none h-5">
                {row.original.entity_type}
            </Badge>
        )
    },
    {
        accessorKey: "description",
        header: "ДЕТАЛИ",
        cell: ({ row }) => (
            <span className="text-slate-600 font-medium text-[11px] max-w-[300px] block truncate" title={row.original.description}>
                {row.original.description}
            </span>
        )
    },
    {
        accessorKey: "ip_address",
        header: "IP-АДРЕС",
        cell: ({ row }) => (
            <div className="flex items-center gap-1.5">
                <Globe className="w-3 h-3 text-slate-300" />
                <code className="text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                    {row.original.ip_address}
                </code>
            </div>
        )
    }
];

export function AuditLogTable() {
    const [selectedLog, setSelectedLog] = React.useState<AuditLog | null>(null);
    const [logs, setLogs] = React.useState<AuditLog[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [actions, setActions] = React.useState<string[]>([]);

    // Filter state
    const [username, setUsername] = React.useState("");
    const [selectedAction, setSelectedAction] = React.useState("all");
    const [skip, setSkip] = React.useState(0);
    const limit = 20;

    const fetchLogs = React.useCallback(async () => {
        setLoading(true);
        try {
            const data = await getAuditLogs({
                username: username || undefined,
                action: selectedAction === "all" ? undefined : selectedAction,
                skip,
                limit
            });
            setLogs(data);
        } catch (error) {
            console.error("Failed to fetch logs:", error);
        } finally {
            setLoading(false);
        }
    }, [username, selectedAction, skip]);

    const fetchActions = React.useCallback(async () => {
        try {
            const data = await getAuditActions();
            setActions(data);
        } catch (error) {
            console.error("Failed to fetch actions:", error);
        }
    }, []);

    React.useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    React.useEffect(() => {
        fetchActions();
    }, [fetchActions]);

    return (
        <div className="bg-white rounded-3xl shadow-2xl shadow-slate-200/40 border border-slate-100 overflow-hidden flex flex-col h-full">
            {/* Header & Filters */}
            <div className="p-6 bg-slate-50/50 border-b border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg shadow-slate-200">
                            <Activity className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-slate-900 tracking-tight">Журнал аудита</h1>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Все действия пользователей</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl border-slate-200 text-slate-600 font-black text-[10px] uppercase h-9 px-4"
                            onClick={() => { setUsername(""); setSelectedAction("all"); setSkip(0); }}
                        >
                            Сброс
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            className="rounded-xl font-black text-[10px] uppercase h-9 px-4 bg-rose-500 hover:bg-rose-600 text-white border-none shadow-lg shadow-rose-200"
                            onClick={async () => {
                                if (window.confirm("Вы уверены, что хотите полностью очистить журнал аудита? Это действие необратимо.")) {
                                    try {
                                        await clearAuditLogs();
                                        toast.success("Журнал аудита очищен");
                                        fetchLogs();
                                    } catch (e) {
                                        toast.error("Ошибка при очистке журнала");
                                    }
                                }
                            }}
                        >
                            Очистить
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Имя пользователя..."
                            className="pl-10 h-10 rounded-xl bg-white border-slate-200 text-[12px] font-medium"
                            value={username}
                            onChange={(e) => { setUsername(e.target.value); setSkip(0); }}
                        />
                    </div>

                    <Select value={selectedAction} onValueChange={(val) => { setSelectedAction(val); setSkip(0); }}>
                        <SelectTrigger className="h-10 rounded-xl bg-white border-slate-200 text-[12px] font-medium">
                            <SelectValue placeholder="Тип действия" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                            <SelectItem value="all" className="text-[12px] font-medium">Все действия</SelectItem>
                            {actions.map(action => (
                                <SelectItem key={action} value={action} className="text-[12px] font-medium uppercase">{action}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <div className="flex items-center justify-end gap-2">
                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-tighter">Страница: {Math.floor(skip / limit) + 1}</span>
                        <div className="flex gap-1">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-lg border-slate-200 disabled:opacity-30"
                                onClick={() => setSkip(Math.max(0, skip - limit))}
                                disabled={skip === 0}
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-lg border-slate-200 disabled:opacity-30"
                                onClick={() => setSkip(skip + limit)}
                                disabled={logs.length < limit}
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto custom-scrollbar">
                <DataTable
                    columns={columns}
                    data={logs}
                    onRowClick={(row) => setSelectedLog(row)}
                />

                <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
                    <DialogContent className="max-w-2xl rounded-3xl border-slate-100 shadow-2xl p-0 overflow-hidden bg-white">
                        <DialogHeader className="p-6 bg-slate-50 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg shadow-slate-200">
                                    <Activity className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <DialogTitle className="text-xl font-black text-slate-900 tracking-tight">
                                        Детали действия
                                    </DialogTitle>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                        Полная информация из журнала
                                    </p>
                                </div>
                            </div>
                        </DialogHeader>

                        {selectedLog && (
                            <div className="p-8 space-y-8">
                                <div className="grid grid-cols-2 gap-8">
                                    {/* Left Column */}
                                    <div className="space-y-6">
                                        <div className="space-y-1.5">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ДАТА И ВРЕМЯ</p>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-slate-900">
                                                    {format(new Date(selectedLog.created_at), "dd MMMM yyyy")}
                                                </span>
                                                <span className="text-[11px] text-slate-500 font-bold uppercase">
                                                    {format(new Date(selectedLog.created_at), "HH:mm:ss")}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ПОЛЬЗОВАТЕЛЬ</p>
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                                                    <User className="w-4 h-4 text-slate-500" />
                                                </div>
                                                <span className="font-black text-slate-900 uppercase text-sm tracking-tight">
                                                    {selectedLog.full_name || selectedLog.username}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">IP-АДРЕС</p>
                                            <div className="flex items-center gap-2">
                                                <Globe className="w-4 h-4 text-slate-300" />
                                                <code className="text-xs font-mono text-slate-600 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-100">
                                                    {selectedLog.ip_address}
                                                </code>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column */}
                                    <div className="space-y-6">
                                        <div className="space-y-1.5">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ОБЪЕКТ СИСТЕМЫ</p>
                                            <div className="flex">
                                                <Badge variant="secondary" className="bg-slate-900 text-white font-black text-[10px] uppercase border-none px-3 h-6 rounded-lg">
                                                    {selectedLog.entity_type}
                                                </Badge>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ТИП ДЕЙСТВИЯ</p>
                                            <div className="flex">
                                                <Badge className="font-black text-[10px] px-3 py-1 border border-slate-200 bg-white text-slate-900 rounded-lg h-6">
                                                    {selectedLog.action}
                                                </Badge>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID ОБЪЕКТА</p>
                                            <span className="text-sm font-mono font-bold text-slate-500">#{selectedLog.entity_id}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Full Description */}
                                <div className="space-y-2 pt-6 border-t border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">ПОЛНОЕ ОПИСАНИЕ</p>
                                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5">
                                        <p className="text-slate-700 font-medium text-sm leading-relaxed">
                                            {selectedLog.description}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4">
                                    <Button
                                        onClick={() => setSelectedLog(null)}
                                        className="rounded-xl px-10 h-10 font-black text-[11px] uppercase tracking-wider bg-slate-900 hover:bg-slate-800 text-white border-none shadow-xl shadow-slate-200"
                                    >
                                        Закрыть
                                    </Button>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
                {!loading && logs.length === 0 && (
                    <div className="py-20 flex flex-col items-center justify-center text-slate-300">
                        <Info className="w-12 h-12 mb-3 opacity-20" />
                        <p className="font-black text-[10px] uppercase tracking-widest opacity-40">Данные не найдены</p>
                    </div>
                )}
            </div>
        </div>
    );
}
