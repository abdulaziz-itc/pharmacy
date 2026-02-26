import React from 'react';
import { cn } from '../lib/utils';

interface PageContainerProps {
    children: React.ReactNode;
    className?: string;
}

export function PageContainer({ children, className }: PageContainerProps) {
    return (
        <div className={cn("space-y-8 animate-slide-up pb-8", className)}>
            {children}
        </div>
    );
}
