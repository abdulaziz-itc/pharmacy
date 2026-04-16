import React, { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatMoney } from '../ui/MoneyInput';
import { getAdaptiveFontSize } from '@/lib/utils';

interface PremiumKpiCardProps {
    label: string;
    value: any; // Allow anything to prevent crash if backend sends unexpected data
    subValue?: any;
    subLabel?: string;
    subSuffix?: string;
    suffix?: string;
    icon: LucideIcon;
    color?: 'blue' | 'emerald' | 'violet' | 'rose' | 'amber' | 'indigo' | 'slate' | 'navy';
    subtitle?: string;
    badge?: string;
    onClick?: () => void;
    variant?: 'default' | 'minimal';
}

const CountUp = ({ value, suffix = 'UZS' }: { value: any, suffix?: string }) => {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        // Ultimate safety check
        const val = parseFloat(String(value || 0)) || 0;
        let start = 0;
        const end = val;
        const duration = 1000;
        const startTime = performance.now();

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease out cubic
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            
            const currentCount = Math.floor(easeProgress * end);
            setDisplayValue(currentCount);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }, [value]);

    const safeValue = parseFloat(String(value || 0)) || 0;

    return (
        <span className="tabular-nums" title={safeValue.toLocaleString()}>
            {formatMoney(displayValue)}
            {suffix && <span className="text-[10px] ml-1.5 opacity-40 font-bold uppercase tracking-widest">{suffix}</span>}
        </span>
    );
};

export const PremiumKpiCard: React.FC<PremiumKpiCardProps> = ({
    label,
    value,
    subValue,
    subLabel,
    subSuffix,
    suffix,
    icon: Icon,
    color = 'blue',
    subtitle,
    badge,
    onClick,
    variant = 'default'
}) => {
    const colorMap = {
        blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', accent: 'bg-blue-600', shadow: 'shadow-blue-100' },
        emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', accent: 'bg-emerald-600', shadow: 'shadow-emerald-100' },
        violet: { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-100', accent: 'bg-violet-600', shadow: 'shadow-violet-100' },
        rose: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100', accent: 'bg-rose-600', shadow: 'shadow-rose-100' },
        amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', accent: 'bg-amber-600', shadow: 'shadow-amber-100' },
        indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100', accent: 'bg-indigo-600', shadow: 'shadow-indigo-100' },
        slate: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-100', accent: 'bg-slate-900', shadow: 'shadow-slate-100' },
        navy: { bg: 'bg-indigo-100', text: 'text-indigo-900', border: 'border-indigo-200', accent: 'bg-indigo-900', shadow: 'shadow-indigo-200' },
    };

    const colors = colorMap[color] || colorMap.blue;
    const safeValue = parseFloat(String(value || 0)) || 0;
    const hasSubValue = subValue !== undefined;

    return (
        <motion.div
            variants={{
                initial: { opacity: 0, scale: 0.95 },
                show: { opacity: 1, scale: 1 }
            }}
            onClick={onClick}
            className={`
                group relative bg-white p-6 rounded-[2.5rem] border border-slate-100 
                shadow-2xl ${colors.shadow}/60 transition-all duration-500
                ${onClick ? 'cursor-pointer hover:-translate-y-2 hover:border-slate-200' : ''}
            `}
        >
            <div className="relative z-10 space-y-4">
                <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 rounded-2xl ${colors.bg} flex items-center justify-center ${colors.text} transition-colors group-hover:${colors.accent} group-hover:text-white`}>
                        <Icon className="w-6 h-6" />
                    </div>
                    {badge && (
                        <div className={`px-3 py-1 rounded-full ${colors.bg} ${colors.text} text-[10px] font-black uppercase tracking-widest border ${colors.border}`}>
                            {badge}
                        </div>
                    )}
                </div>

                <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                        {label}
                    </p>
                    <h3 className={`font-black tracking-tight text-slate-900 flex items-baseline gap-2 ${getAdaptiveFontSize(formatMoney(safeValue), variant === 'minimal' ? 'text-2xl' : 'text-3xl')}`}>
                         <CountUp value={value} suffix={suffix === undefined ? 'UZS' : suffix} />
                    </h3>
                    
                    {hasSubValue && (
                        <div className="flex items-center gap-2 mt-2 ml-1">
                            <span className="text-sm font-black text-slate-700">
                                {Number(subValue).toLocaleString()} {subSuffix}
                            </span>
                            {subLabel && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{subLabel}</span>}
                        </div>
                    )}

                    {subtitle && !hasSubValue && (
                        <p className="text-xs font-bold text-slate-500 ml-1">
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>

            {/* Subtle Gradient Backdrop */}
            <div className={`absolute inset-0 bg-gradient-to-br from-white via-white to-slate-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-[2.5rem]`} />
        </motion.div>
    );
};
