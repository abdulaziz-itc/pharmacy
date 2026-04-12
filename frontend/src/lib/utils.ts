import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/**
 * Formats large numbers into a compact, human-readable format (e.g., 1.5M, 42K).
 */
export function formatCompactNumber(value: number): string {
    if (value === 0) return '0';
    if (!value) return '';
    
    // For values less than 1 million, we use standard formatting but compact 
    // notation usually triggers around 10k or 100k depending on the locale.
    // For Uzbek dashboards, we want to start compacting from 1M+ for currency.
    if (Math.abs(value) < 1000000) {
        return new Intl.NumberFormat('ru-RU', {
            maximumFractionDigits: 0
        }).format(value);
    }

    return new Intl.NumberFormat('ru-RU', {
        notation: 'compact',
        compactDisplay: 'short',
        maximumFractionDigits: 1
    }).format(value);
}

/**
 * Returns a Tailwind font-size class based on the length of a string.
 * More aggressive tiers for handling long financial numbers.
 */
export function getAdaptiveFontSize(text: string, baseSize: string = 'text-3xl'): string {
    if (!text) return baseSize;
    const length = text.length;
    
    // Very long (e.g., 1.234.567.890,00 UZS) -> ~20+ chars
    if (length > 20) return 'text-base';
    if (length > 17) return 'text-lg';
    if (length > 13) return 'text-xl';
    if (length > 9) return 'text-2xl';
    
    return baseSize;
}
