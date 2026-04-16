import { Button } from './ui/button';
import { Plus } from 'lucide-react';
import { cn } from '../lib/utils';

interface PageHeaderProps {
    title: string;
    description?: string;
    buttonLabel?: string;
    onButtonClick?: () => void;
    className?: string;
    children?: React.ReactNode;
}

export function PageHeader({
    title,
    description,
    buttonLabel,
    onButtonClick,
    className,
    children
}: PageHeaderProps) {
    return (
        <div className={cn("flex flex-col md:flex-row md:items-center justify-between gap-4", className)}>
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">
                    {title}
                </h1>
                {description && (
                    <p className="text-slate-500 mt-1 font-medium">{description}</p>
                )}
            </div>
            <div className="flex items-center gap-3">
                {children}
                {buttonLabel && (
                    <Button
                        onClick={onButtonClick}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-600/20 px-6 h-12 font-semibold gap-2 border-none"
                    >
                        <Plus className="w-4 h-4" />
                        {buttonLabel}
                    </Button>
                )}
            </div>
        </div>
    );
}
