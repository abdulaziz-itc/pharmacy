"use client"

import * as React from "react"
import { format, parseISO } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { ru } from "date-fns/locale"

export interface DatePickerProps {
    date?: Date | string
    setDate: (date?: Date) => void
    placeholder?: string
    className?: string
    formatStr?: string
}

export function DatePicker({ date, setDate, placeholder = "Выберите дату", className, formatStr = "PPP" }: DatePickerProps) {
    // Handle both Date objects and string inputs for robust native behavior
    const parsedDate = typeof date === 'string' ? parseISO(date) : date;
    const dateString = parsedDate ? format(parsedDate, 'yyyy-MM-dd') : '';

    return (
        <div className={cn(
            "relative w-full flex items-center bg-white border border-slate-200 hover:bg-slate-50 rounded-xl h-11 px-3 text-sm transition-colors cursor-pointer",
            !date && "text-muted-foreground",
            className
        )}>
            <CalendarIcon className="h-4 w-4 text-slate-400 shrink-0 pointer-events-none z-10" />

            {/* Visual Fake Input for nice text formatting */}
            <div className="ml-2 flex-grow pointer-events-none whitespace-nowrap overflow-hidden text-ellipsis">
                {parsedDate ? format(parsedDate, formatStr, { locale: ru }) : <span className="text-slate-400">{placeholder}</span>}
            </div>

            {/* Real Native Hidden Input positioned over everything */}
            <input
                type="date"
                value={dateString}
                onClick={(e) => {
                    try {
                        // Force picker to open when clicking anywhere on the input element
                        (e.target as HTMLInputElement).showPicker();
                    } catch (err) {
                        // ignore if browser doesn't support showPicker
                    }
                }}
                onChange={(e) => {
                    if (!e.target.value) {
                        setDate(undefined);
                    } else {
                        // Ensure the time is set to midnight local time to avoid timezone shifts
                        const [year, month, day] = e.target.value.split('-').map(Number);
                        setDate(new Date(year, month - 1, day));
                    }
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                style={{
                    // extra cross-browser invisible styling
                    color: 'transparent',
                    background: 'transparent'
                }}
            />
        </div>
    )
}
