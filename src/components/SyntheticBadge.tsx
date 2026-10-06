import React from 'react';

interface SyntheticBadgeProps {
  className?: string;
}

export const SyntheticBadge: React.FC<SyntheticBadgeProps> = ({ className = '' }) => {
  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-mono font-medium tracking-wide ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
      <span>SYNTHETIC</span>
    </div>
  );
};
