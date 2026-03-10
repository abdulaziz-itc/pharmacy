import React, { useRef } from 'react';
import { CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DateInputProps {
    value?: string;           // YYYY-MM-DD string
    onChange: (val: string) => void;
    placeholder?: string;
    className?: string;
    label?: string;
}

export const DateInput: React.FC<DateInputProps> = ({
    value,
    onChange,
    placeholder = 'Sana',
    className,
}) => {
    const ref = useRef<HTMLInputElement>(null);

    return (
        <div
            className={cn(
                'relative flex items-center gap-2 h-10 px-3 rounded-xl border border-slate-200 bg-white shadow-sm cursor-pointer hover:border-blue-400 transition-all group',
                className
            )}
            onClick={() => ref.current?.showPicker?.()}
        >
            <CalendarDays className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors shrink-0" />
            <span className={cn('text-sm flex-1', value ? 'text-slate-700 font-bold' : 'text-slate-400')}>
                {value
                    ? new Date(value + 'T00:00:00').toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
                    : placeholder}
            </span>
            <input
                ref={ref}
                type="date"
                value={value ?? ''}
                onChange={e => onChange(e.target.value)}
                onClick={e => e.stopPropagation()}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                tabIndex={-1}
            />
        </div>
    );
};
