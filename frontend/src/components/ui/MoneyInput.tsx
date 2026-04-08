import React, { useRef, useLayoutEffect, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface MoneyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
    value: string | number;
    onChange: (raw: string) => void;
    className?: string;
}

/**
 * Standard Uzbek/Russian formatting: 1.000,00
 */
export function formatMoney(value: string | number): string {
    if (value === null || value === undefined || value === '') return '';
    
    let num: number;
    if (typeof value === 'number') {
        num = value;
    } else {
        const valStr = value.toString();
        // Heuristic: if it has a comma, it's the formatted style (1.000,00)
        // If it has multiple dots, it's also formatted (1.000.000)
        const hasComma = valStr.includes(',');
        const hasManyDots = (valStr.match(/\./g) || []).length > 1;
        
        if (hasComma || hasManyDots) {
            num = Number(valStr.replace(/\./g, '').replace(/,/g, '.'));
        } else {
            // Raw JS number string (e.g. "12899.69" or "1000")
            // Number() handles these dots correctly as decimals.
            num = Number(valStr);
        }
    }
    
    if (isNaN(num)) return '';
    
    const fixed = num.toFixed(2);
    const [intPart, decPart] = fixed.split('.');
    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${formattedInt},${decPart}`;
}

/**
 * Strips everything except digits and the first decimal separator.
 */
export function parseMoney(formatted: string): string {
    if (typeof formatted !== 'string') return String(formatted);
    
    // Heuristic similar to formatMoney: 
    // If it has a comma or multiple dots, treat it as formatted and strip thousands.
    if (formatted.includes(',') || (formatted.match(/\./g) || []).length > 1) {
        return formatted.replace(/\./g, '').replace(/,/g, '.');
    }
    
    // Single dot and no comma: likely already a raw numeric string
    return formatted;
}

/**
 * Robust MoneyInput with local state and cursor tracking from the right.
 */
export function MoneyInput({ value, onChange, className, ...props }: MoneyInputProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [localValue, setLocalValue] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    const cursorRef = useRef<{ digitsFromEnd: number } | null>(null);

    // 1. Sync local value with prop value when NOT focused or when prop changes significantly
    useEffect(() => {
        if (!isFocused) {
            setLocalValue(formatMoney(value));
        }
    }, [value, isFocused]);

    // 2. Formatting helper while typing
    const formatDisplay = (val: string) => {
        const raw = parseMoney(val);
        if (!raw) return "";
        
        const parts = raw.split('.');
        const intPart = parts[0];
        const decPart = parts[1];

        // Format integer part with dots
        const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        
        // Preserve decimals exactly as entered (don't pad yet)
        return decPart !== undefined ? `${formattedInt},${decPart}` : formattedInt;
    };

    // 3. CURSOR MANAGEMENT (Track from Right side of integer part)
    useLayoutEffect(() => {
        if (inputRef.current && cursorRef.current) {
            const el = inputRef.current;
            const targetDigitsFromEnd = cursorRef.current.digitsFromEnd;
            const currentVal = el.value;
            
            let pos = currentVal.length;
            let digitsSeen = 0;
            
            // Scan from right to left
            for (let i = currentVal.length - 1; i >= 0; i--) {
                if (/\d/.test(currentVal[i])) {
                    digitsSeen++;
                }
                if (digitsSeen === targetDigitsFromEnd) {
                    pos = i;
                    break;
                }
            }
            
            el.setSelectionRange(pos, pos);
            cursorRef.current = null;
        }
    }, [localValue]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.target;
        const val = input.value;
        const selectionStart = input.selectionStart || 0;

        // Count how many DIGITS are to the RIGHT of the cursor
        const suffix = val.substring(selectionStart);
        const digitsFromEnd = suffix.replace(/\D/g, '').length;

        const raw = parseMoney(val);
        
        // Only allow valid numeric entry
        if (raw !== "" && !/^-?\d*\.?\d*$/.test(raw)) return;

        // Update local display immediately
        setLocalValue(formatDisplay(val));
        
        // Store cursor info
        cursorRef.current = { digitsFromEnd };

        // Notify parent
        onChange(raw);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        setIsFocused(true);
        // Select all text on focus to allow easy overwrite
        e.target.select();
        props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        setIsFocused(false);
        // Strict formatting on blur using the standardized formatMoney
        setLocalValue(formatMoney(value));
        props.onBlur?.(e);
    };

    return (
        <input
            {...props}
            ref={inputRef}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={localValue}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={cn(
                "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
                "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50",
                className
            )}
        />
    );
}
