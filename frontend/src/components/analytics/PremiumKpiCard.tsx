import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { formatMoney } from '../ui/MoneyInput';
import { cn, getAdaptiveFontSize } from '../../lib/utils';

interface PremiumKpiCardProps {
    label: string;
    value: number;
    icon: LucideIcon;
    color: 'blue' | 'emerald' | 'rose' | 'violet' | 'amber' | 'indigo' | 'cyan' | 'pink' | 'navy' | 'slate';
    badge?: string;
    onClick?: () => void;
    subtitle?: string;
    suffix?: string;
    subValue?: number;
    subLabel?: string;
    subSuffix?: string;
    variant?: 'premium' | 'minimal';
}

const CountUp = ({ value, suffix = 'UZS' }: { value: number, suffix?: string }) => {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        let start = 0;
        const end = value;
        const duration = 1000;
        const startTime = performance.now();

        const animate = (currentTime: number) => {
            const elapsedTime = currentTime - startTime;
            const progress = Math.min(elapsedTime / duration, 1);
            
            // Ease-out expo
            const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
            
            const currentCount = Math.floor(easeProgress * end);
            setDisplayValue(currentCount);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }, [value]);

    return (
        <span className="tabular-nums" title={value.toLocaleString()}>
            {formatMoney(displayValue)}
            <span className="text-[10px] ml-1.5 opacity-40 font-bold uppercase tracking-widest">{suffix}</span>
        </span>
    );
};

export const PremiumKpiCard: React.FC<PremiumKpiCardProps> = ({
    label,
    value,
    icon: Icon,
    color,
    badge,
    onClick,
    subtitle,
    suffix = 'UZS',
    subValue,
    subLabel,
    subSuffix,
    variant = 'premium'
}) => {
    const colorStyles: Record<string, any> = {
        blue: {
            bg: 'bg-blue-50',
            text: 'text-blue-600',
            border: 'border-blue-200/50',
            mesh: 'premium-mesh-blue',
            glow: 'shadow-blue-500/10'
        },
        emerald: {
            bg: 'bg-emerald-50',
            text: 'text-emerald-600',
            border: 'border-emerald-200/50',
            mesh: 'premium-mesh-emerald',
            glow: 'shadow-emerald-500/10'
        },
        rose: {
            bg: 'bg-rose-50',
            text: 'text-rose-600',
            border: 'border-rose-200/50',
            mesh: 'premium-mesh-rose',
            glow: 'shadow-rose-500/10'
        },
        violet: {
            bg: 'bg-violet-50',
            text: 'text-violet-600',
            border: 'border-violet-200/50',
            mesh: 'premium-mesh-violet',
            glow: 'shadow-violet-500/10'
        },
        amber: {
            bg: 'bg-amber-50',
            text: 'text-amber-600',
            border: 'border-amber-200/50',
            mesh: 'premium-mesh-rose', 
            glow: 'shadow-amber-500/10'
        },
        indigo: {
            bg: 'bg-indigo-50',
            text: 'text-indigo-600',
            border: 'border-indigo-200/50',
            mesh: 'premium-mesh-blue',
            glow: 'shadow-indigo-500/10'
        },
        navy: {
            bg: 'bg-slate-100/80',
            text: 'text-slate-900',
            border: 'border-slate-300/50',
            mesh: 'premium-mesh-blue',
            glow: 'shadow-slate-500/10'
        },
        slate: {
            bg: 'bg-slate-50',
            text: 'text-slate-600',
            border: 'border-slate-200',
            mesh: 'premium-mesh-blue',
            glow: 'shadow-slate-400/10'
        }
    };

    const style = colorStyles[color] || colorStyles.blue;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={onClick ? { 
                y: -8, 
                scale: 1.02,
                transition: { type: "spring", stiffness: 400, damping: 25 } 
            } : {}}
            whileTap={onClick ? { scale: 0.98 } : {}}
            onClick={onClick}
            className={`
                relative p-8 rounded-[2.5rem] bg-white border border-slate-100
                shadow-2xl shadow-slate-200/50 overflow-hidden group
                ${style.glow} ${onClick ? 'cursor-pointer active:shadow-none translate-y-0 hover:-translate-y-2' : ''}
                transition-all duration-500
                ${variant === 'minimal' ? 'rounded-[3rem] shadow-xl shadow-slate-200/40 bg-gradient-to-b from-white to-slate-50/30 border-white/50' : ''}
            `}
        >
            {/* Mesh Background Overlay (Subtle for minimal, full for premium) */}
            <div className={`
                absolute inset-0 transition-opacity duration-700 ${style.mesh}
                ${variant === 'minimal' ? 'opacity-[0.02] group-hover:opacity-[0.05]' : 'opacity-0 group-hover:opacity-100'}
            `} />
            
            {/* Decorative Pulse Glow (Top Right) */}
            <div className={`absolute top-0 right-0 w-64 h-64 -mr-16 -mt-16 bg-gradient-to-br from-white/20 to-transparent rounded-full blur-3xl`} />
            
            <div className="relative z-10 flex flex-col h-full">
                {/* Icon & Badge Header */}
                <div className="flex items-start justify-between mb-8">
                    <motion.div 
                        whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                        className={`w-16 h-16 rounded-[1.25rem] ${style.bg} ${style.border} border-2 flex items-center justify-center shadow-inner relative group-hover:shadow-lg transition-shadow duration-300`}
                    >
                        {/* Floating Glow Aura */}
                        <div className={`absolute -inset-4 ${style.text} opacity-20 blur-2xl group-hover:opacity-40 transition-opacity duration-500`} />
                        <Icon strokeWidth={2.5} className={`w-8 h-8 ${style.text} relative z-10`} />
                    </motion.div>
    
                    {badge && (
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className={`
                                px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm backdrop-blur-sm border
                                ${variant === 'minimal' 
                                    ? 'bg-emerald-500 text-white border-emerald-400 shadow-emerald-200/50' 
                                    : `${style.bg} ${style.text} ${style.border}`}
                            `}
                        >
                            {badge}
                        </motion.div>
                    )}
                </div>
    
                {/* Text Content */}
                <div className="mt-auto">
                    <h3 className={`
                        text-slate-400 text-[10px] font-black uppercase tracking-[0.25em] mb-3 group-hover:translate-x-1 transition-transform duration-300
                        ${variant === 'minimal' ? 'text-slate-400 font-extrabold tracking-widest' : ''}
                    `}>
                        {label}
                    </h3>
                    
                    <div className="space-y-1">
                        <div 
                            title={value.toLocaleString()}
                            className={cn(
                                "font-black tracking-tighter leading-none flex items-baseline gap-2 transition-all duration-300",
                                variant === 'minimal' ? 'text-slate-900' : 'text-slate-800',
                                getAdaptiveFontSize(formatMoney(value), variant === 'minimal' ? 'text-4xl' : 'text-3xl')
                            )}
                        >
                            <CountUp value={value} suffix={suffix} />
                        </div>
                        
                        <AnimatePresence>
                            {subtitle && (
                                <motion.p 
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="text-slate-400 text-[11px] font-bold italic tracking-tight"
                                >
                                    {subtitle}
                                </motion.p>
                            )}
                        </AnimatePresence>

                        {subLabel && subValue !== undefined && (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-4 pt-3 border-t border-slate-100 flex flex-col"
                            >
                                <span className={`text-[9px] font-black uppercase tracking-widest ${style.text} opacity-70`}>
                                    {subLabel}:
                                </span>
                                <span className="text-sm font-black text-slate-700 tracking-tight">
                                    {formatMoney(subValue)} {subSuffix || suffix}
                                </span>
                            </motion.div>
                        )}
                    </div>
                </div>

                {/* Interactive Indicator (Dots/Arrow) */}
                {onClick && (
                    <div className="absolute bottom-8 right-8 overflow-hidden">
                        <motion.div 
                            initial={{ x: 20, opacity: 0 }}
                            whileHover={{ x: 0, opacity: 1 }}
                            className="flex items-center gap-1.5"
                        >
                            <div className={`w-1.5 h-1.5 rounded-full ${style.text} opacity-20`} />
                            <div className={`w-1.5 h-1.5 rounded-full ${style.text} opacity-40`} />
                            <div className={`w-1.5 h-1.5 rounded-full ${style.text} opacity-80`} />
                        </motion.div>
                    </div>
                )}
            </div>
            
            {/* Geometric Accent Decoration */}
            <div className={`absolute bottom-[-20%] left-[-10%] w-40 h-40 rounded-full border border-slate-500/10 group-hover:scale-150 transition-transform duration-1000`} />
        </motion.div>
    );
};
