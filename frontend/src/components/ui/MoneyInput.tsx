import React, { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface MoneyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
    value: string | number;
    onChange: (raw: string) => void;
    className?: string;
}

/**
 * Formats a number with dots as thousand separators (Uzbek/Russian style).
 * e.g., 1000000 → "1.000.000,00"
 */
export function formatMoney(value: string | number): string {
    if (value === null || value === undefined || value === '') return '';
    
    let num: number;
    if (typeof value === 'number') {
        num = value;
    } else {
        // If it's a string, strip dots (thousand separators) and replace comma with dot for parsing
        const cleanStr = value.toString().replace(/\./g, '').replace(/,/g, '.');
        num = Number(cleanStr);
    }
    
    if (isNaN(num)) return '';
    
    // Ensure exactly 2 decimal places
    const fixed = num.toFixed(2);
    const [intPart, decPart] = fixed.split('.');
    
    // Format integer part with dots as thousand separators
    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    
    // Append decimal part with a comma
    return `${formattedInt},${decPart}`;
}

/**
 * Strips dots and returns raw numeric string with dot as decimal separator.
 */
export function parseMoney(formatted: string): string {
    // Replace dots (thousands) with empty, and commas (decimal) with dots
    return formatted.replace(/\./g, '').replace(/,/g, '.');
}

/**
 * An <input> that displays numbers with dot separators while the user types.
 * `onChange` receives the raw numeric string (with dots as decimal if any).
 */
export function MoneyInput({ value, onChange, className, ...props }: MoneyInputProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isFocused, setIsFocused] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.target;
        const selectionStart = input.selectionStart || 0;
        
        // Count how many digits/dots (non-separator characters) are before the cursor
        // In our case, dots are separators, comma is the decimal.
        // We want to track the position relative to the numeric content.
        const valBefore = input.value;
        const prefixBefore = valBefore.substring(0, selectionStart);
        const digitsBefore = prefixBefore.replace(/[^\d,]/g, '').length;

        const raw = parseMoney(valBefore);
        
        // Allow digits and at most one dot/comma
        if (raw && !/^\d*\.?\d*$/.test(raw)) return;
        
        onChange(raw);

        // We'll restore the cursor in the useEffect after the value update
        setTimeout(() => {
            if (inputRef.current) {
                const valAfter = inputRef.current.value;
                let newPos = 0;
                let digitsFound = 0;
                for (let i = 0; i < valAfter.length; i++) {
                    if (/[\d,]/.test(valAfter[i])) {
                        digitsFound++;
                    }
                    if (digitsFound === digitsBefore) {
                        newPos = i + 1;
                        break;
                    }
                }
                inputRef.current.setSelectionRange(newPos, newPos);
            }
        }, 0);
    };

    return (
        <input
            {...props}
            ref={inputRef}
            type="text"
            inputMode="numeric"
            value={formatMoney(value)}
            onChange={handleChange}
            onFocus={(e) => {
                setIsFocused(true);
                props.onFocus?.(e);
            }}
            onBlur={(e) => {
                setIsFocused(false);
                props.onBlur?.(e);
            }}
            className={cn(
                "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
                "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50",
                className
            )}
        />
    );
}
