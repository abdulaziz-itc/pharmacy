import React, { useRef, useLayoutEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface MoneyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
    value: string | number;
    onChange: (raw: string) => void;
    className?: string;
}

/**
 * Formats a number with dots as thousand separators (Uzbek/Russian style).
 * e.g., 1000000 → "1.000.000,00"
 * 
 * isFocused flag allows more flexible formatting during active typing.
 */
export function formatMoney(value: string | number, isFocused: boolean = false): string {
    if (value === null || value === undefined || value === '') return '';
    
    const str = value.toString();
    
    // Normalize to a raw numeric string with '.' as the only decimal separator
    let normalized = str;
    if (str.includes(',')) {
        // If it has a comma, it's definitely the formatted style (e.g., "1.234,56")
        normalized = str.replace(/\./g, '').replace(/,/g, '.');
    } else {
        // If no comma, check if dots are thousand separators or a decimal point
        const dotsCount = (str.match(/\./g) || []).length;
        if (dotsCount > 1) {
            // Multiple dots => thousand separators (e.g., "1.234.567")
            normalized = str.replace(/\./g, '');
        } else if (dotsCount === 1) {
            // One dot => could be "1.234" (thousand) or "1234.5" (decimal)
            // If it's a number from JS/Backend, it's always "1234.5"
            // If it's a string, we check its length or just assume decimal if it looks like one
            const parts = str.split('.');
            if (parts[1].length === 3) {
                // Highly likely a thousand separator (e.g., "1.234")
                normalized = parts[0] + parts[1];
            } else {
                // Likely a decimal point (e.g., "1234.5")
                normalized = str;
            }
        }
    }

    const parts = normalized.split('.');
    const intPart = parts[0];
    const decPart = parts[1];

    const num = Number(normalized);
    if (isNaN(num)) return '';
    
    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    
    if (isFocused) {
        // While focused, preserve decimal entry exactly as is (don't pad with zeros)
        return decPart !== undefined ? `${formattedInt},${decPart}` : formattedInt;
    }
    
    // For blur/static display: strictly force 2 decimal places
    const fixed = num.toFixed(2);
    const [fInt, fDec] = fixed.split('.');
    const finalInt = fInt.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${finalInt},${fDec}`;
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
 * 
 * Uses useLayoutEffect for zero-flicker cursor restoration.
 */
export function MoneyInput({ value, onChange, className, ...props }: MoneyInputProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const lastDigitsCount = useRef<number | null>(null);
    const [isInternalFocused, setIsInternalFocused] = useState(false);

    // ZERO-FLICKER CURSOR RESTORATION
    useLayoutEffect(() => {
        if (inputRef.current && lastDigitsCount.current !== null) {
            const el = inputRef.current;
            const targetDigits = lastDigitsCount.current;
            const val = el.value;
            
            let newPos = 0;
            let digitsFound = 0;
            
            if (targetDigits === 0) {
                newPos = 0;
            } else {
                for (let i = 0; i < val.length; i++) {
                    // We count both digits and the decimal comma as "content" to track
                    if (/[\d,]/.test(val[i])) {
                        digitsFound++;
                    }
                    if (digitsFound === targetDigits) {
                        newPos = i + 1;
                        break;
                    }
                }
            }
            
            el.setSelectionRange(newPos, newPos);
            lastDigitsCount.current = null;
        }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.target;
        const valBefore = input.value;
        const selectionStart = input.selectionStart || 0;
        
        // Count content characters (digits and comma) before cursor
        const prefix = valBefore.substring(0, selectionStart);
        lastDigitsCount.current = prefix.replace(/[^\d,]/g, '').length;

        const raw = parseMoney(valBefore);
        
        // Basic validation: allow digits and at most one dot/comma
        if (raw && !/^-?\d*\.?\d*$/.test(raw)) {
             // If invalid, we don't update state but we might need to reset the ref
             lastDigitsCount.current = null;
             return;
        }
        
        onChange(raw);
    };

    return (
        <input
            {...props}
            ref={inputRef}
            type="text"
            inputMode="decimal"
            value={formatMoney(value, isInternalFocused)}
            onChange={handleChange}
            onFocus={(e) => {
                setIsInternalFocused(true);
                props.onFocus?.(e);
            }}
            onBlur={(e) => {
                setIsInternalFocused(false);
                // When focus is lost, the value will be re-formatted to strict 2 decimals via prop update
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
