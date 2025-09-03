import React from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveLayout({ children, className }: ResponsiveLayoutProps) {
  return (
    <div className={cn(
      "min-h-screen w-full",
      "px-4 sm:px-6 lg:px-8",
      "py-4 sm:py-6 lg:py-8",
      className
    )}>
      <div className="mx-auto max-w-7xl">
        {children}
      </div>
    </div>
  );
}

interface ResponsiveGridProps {
  children: React.ReactNode;
  cols?: 1 | 2 | 3 | 4;
  className?: string;
}

export function ResponsiveGrid({ children, cols = 2, className }: ResponsiveGridProps) {
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
  };

  return (
    <div className={cn(
      "grid gap-4 sm:gap-6",
      gridCols[cols],
      className
    )}>
      {children}
    </div>
  );
}

interface ResponsiveCardProps {
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveCard({ children, className }: ResponsiveCardProps) {
  return (
    <div className={cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm",
      "p-4 sm:p-6",
      "w-full",
      className
    )}>
      {children}
    </div>
  );
}

interface ResponsiveStackProps {
  children: React.ReactNode;
  direction?: 'vertical' | 'horizontal';
  spacing?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ResponsiveStack({ 
  children, 
  direction = 'vertical', 
  spacing = 'md',
  className 
}: ResponsiveStackProps) {
  const spacingClasses = {
    sm: direction === 'vertical' ? 'space-y-2' : 'space-x-2',
    md: direction === 'vertical' ? 'space-y-4' : 'space-x-4',
    lg: direction === 'vertical' ? 'space-y-6' : 'space-x-6'
  };

  const flexDirection = direction === 'vertical' ? 'flex-col' : 'flex-row flex-wrap';

  return (
    <div className={cn(
      "flex w-full",
      flexDirection,
      spacingClasses[spacing],
      className
    )}>
      {children}
    </div>
  );
}