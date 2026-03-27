import { type ColumnDef } from "@tanstack/react-table"
import { Monitor, MapPin, Clock, User } from "lucide-react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import type { LoginHistory } from "../../store/userStore"

export const loginHistoryColumns: ColumnDef<LoginHistory>[] = [
    {
        id: "index",
        header: "#",
        cell: ({ row }) => <span className="text-slate-400 font-medium">{row.index + 1}</span>,
    },
    {
        accessorKey: "user.full_name",
        header: "Пользователь",
        cell: ({ row }) => {
            const history = row.original;
            return (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <User className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{history.user?.full_name}</span>
                        <span className="text-xs text-slate-400">@{history.user?.username}</span>
                    </div>
                </div>
            );
        },
    },
    {
        accessorKey: "login_at",
        header: "Дата и время",
        cell: ({ row }) => {
            const date = new Date(row.getValue("login_at"));
            return (
                <div className="flex items-center gap-2 text-slate-600 font-medium">
                    <Clock className="w-4 h-4 text-slate-400" />
                    {format(date, "d MMMM yyyy, HH:mm", { locale: ru })}
                </div>
            );
        }
    },
    {
        accessorKey: "ip_address",
        header: "IP-адрес",
        cell: ({ row }) => (
            <div className="flex items-center gap-2 font-mono text-sm text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                {row.getValue("ip_address") || "Неизвестно"}
            </div>
        ),
    },
    {
        accessorKey: "location",
        header: "Локация",
        cell: ({ row }) => (
            <div className="flex items-center gap-2 text-slate-600 italic">
                <MapPin className="w-4 h-4 text-slate-400" />
                {row.getValue("location") || "Не определено"}
            </div>
        ),
    },
    {
        accessorKey: "user_agent",
        header: "Устройство",
        cell: ({ row }) => {
            const ua = row.getValue("user_agent") as string;
            return (
                <div className="flex items-center gap-2 text-xs text-slate-400 max-w-[200px] truncate" title={ua}>
                    <Monitor className="w-3.5 h-3.5" />
                    {ua || "—"}
                </div>
            );
        }
    },
];
