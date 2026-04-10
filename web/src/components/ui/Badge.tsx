import React from 'react';

export function Badge({ children, color = 'amber', className = '', style = {} }: { children: React.ReactNode, color?: string, className?: string, style?: React.CSSProperties }) {
  let colorClass = '';
  if (color === 'amber') {
    colorClass = 'bg-amber-600/80 text-white border-amber-400/60';
  } else if (color === 'amber-soft') {
    colorClass = 'bg-amber-200/40 text-amber-900 border-amber-300/40';
  } else {
    colorClass = 'bg-slate-700 text-white border-slate-500/60';
  }
  return (
    <span
      className={`inline-block rounded-md px-2 py-[2px] border font-semibold text-[11px] shadow-sm tracking-tight align-middle select-none transition-all duration-150 ${colorClass} ${className}`}
      style={{ lineHeight: 1.1, letterSpacing: 0.1, ...style }}
    >
      {children}
    </span>
  );
}
