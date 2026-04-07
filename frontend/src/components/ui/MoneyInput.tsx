import React from 'react';
import { cn } from '@/lib/utils';

interface MoneyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
    value: string | number;
    onChange: (raw: string) => void;
    className?: string;
}

/**
 * Formats a number with dots as thousand separators (Uzbek/Russian style).
 * e.g., 1000000 → "1.000.000"
 */
export function formatMoney(value: string | number): string {
    const str = String(value).replace(/[^\d]/g, '');
    if (!str) return '';
    return str.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Strips dots and returns raw numeric string.
 */
export function parseMoney(formatted: string): string {
    return formatted.replace(/\./g, '');
}

/**
 * An <input> that displays numbers with dot separators while the user types.
 * `onChange` receives the raw numeric string (no dots).
 */
export function MoneyInput({ value, onChange, className, ...props }: MoneyInputProps) {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = parseMoney(e.target.value);
        // Only allow digits
        if (raw && !/^\d+$/.test(raw)) return;
        onChange(raw);
    };

    return (
        <input
            {...props}
            type="text"
            inputMode="numeric"
            value={formatMoney(value)}
            onChange={handleChange}
            className={cn(
                "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
                "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50",
                className
            )}
        />
    );
}
