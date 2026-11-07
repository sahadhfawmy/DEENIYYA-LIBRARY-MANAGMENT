import React from 'react';
import { LucideIcon } from 'lucide-react';

export type DimensionMode = '3d' | '2d';

interface NavIcon3DProps {
  icon: LucideIcon;
  dimension: DimensionMode;
  isSelected: boolean;
  isLocked: boolean;
  highlight?: boolean;
  badge?: number;
  colorScheme: 'blue' | 'sky' | 'emerald' | 'violet' | 'amber' | 'indigo' | 'rose' | 'red' | 'teal' | 'slate';
}

const colorThemes: Record<
  NavIcon3DProps['colorScheme'],
  {
    bg3d: string;
    shadow3d: string;
    border3d: string;
    iconColor3d: string;
    bg2d: string;
    border2d: string;
    iconColor2d: string;
  }
> = {
  blue: {
    bg3d: 'from-blue-500 to-indigo-600',
    shadow3d: 'shadow-[0_4px_10px_rgba(59,130,246,0.35)]',
    border3d: 'border-blue-400/40 border-b-blue-800',
    iconColor3d: 'text-white',
    bg2d: 'bg-blue-50 dark:bg-blue-950/40',
    border2d: 'border-blue-200 dark:border-blue-800/60',
    iconColor2d: 'text-blue-600 dark:text-blue-400',
  },
  sky: {
    bg3d: 'from-sky-500 to-cyan-600',
    shadow3d: 'shadow-[0_4px_10px_rgba(14,165,233,0.35)]',
    border3d: 'border-sky-400/40 border-b-cyan-800',
    iconColor3d: 'text-white',
    bg2d: 'bg-sky-50 dark:bg-sky-950/40',
    border2d: 'border-sky-200 dark:border-sky-800/60',
    iconColor2d: 'text-sky-600 dark:text-sky-400',
  },
  emerald: {
    bg3d: 'from-emerald-500 to-teal-700',
    shadow3d: 'shadow-[0_4px_10px_rgba(16,185,129,0.35)]',
    border3d: 'border-emerald-400/40 border-b-emerald-900',
    iconColor3d: 'text-white',
    bg2d: 'bg-emerald-50 dark:bg-emerald-950/40',
    border2d: 'border-emerald-200 dark:border-emerald-800/60',
    iconColor2d: 'text-emerald-600 dark:text-emerald-400',
  },
  violet: {
    bg3d: 'from-violet-500 to-purple-600',
    shadow3d: 'shadow-[0_4px_10px_rgba(139,92,246,0.35)]',
    border3d: 'border-violet-400/40 border-b-purple-800',
    iconColor3d: 'text-white',
    bg2d: 'bg-violet-50 dark:bg-violet-950/40',
    border2d: 'border-violet-200 dark:border-violet-800/60',
    iconColor2d: 'text-violet-600 dark:text-violet-400',
  },
  amber: {
    bg3d: 'from-amber-500 to-amber-600',
    shadow3d: 'shadow-[0_4px_10px_rgba(245,158,11,0.35)]',
    border3d: 'border-amber-300/40 border-b-amber-700',
    iconColor3d: 'text-white',
    bg2d: 'bg-amber-50 dark:bg-amber-950/40',
    border2d: 'border-amber-200 dark:border-amber-800/60',
    iconColor2d: 'text-amber-600 dark:text-amber-400',
  },
  indigo: {
    bg3d: 'from-indigo-500 to-blue-700',
    shadow3d: 'shadow-[0_4px_10px_rgba(99,102,241,0.35)]',
    border3d: 'border-indigo-400/40 border-b-indigo-900',
    iconColor3d: 'text-white',
    bg2d: 'bg-indigo-50 dark:bg-indigo-950/40',
    border2d: 'border-indigo-200 dark:border-indigo-800/60',
    iconColor2d: 'text-indigo-600 dark:text-indigo-400',
  },
  rose: {
    bg3d: 'from-rose-500 to-pink-600',
    shadow3d: 'shadow-[0_4px_10px_rgba(244,63,94,0.35)]',
    border3d: 'border-rose-400/40 border-b-rose-800',
    iconColor3d: 'text-white',
    bg2d: 'bg-rose-50 dark:bg-rose-950/40',
    border2d: 'border-rose-200 dark:border-rose-800/60',
    iconColor2d: 'text-rose-600 dark:text-rose-400',
  },
  red: {
    bg3d: 'from-red-500 to-rose-700',
    shadow3d: 'shadow-[0_4px_10px_rgba(239,68,68,0.35)]',
    border3d: 'border-red-400/40 border-b-red-900',
    iconColor3d: 'text-white',
    bg2d: 'bg-red-50 dark:bg-red-950/40',
    border2d: 'border-red-200 dark:border-red-800/60',
    iconColor2d: 'text-red-600 dark:text-red-400',
  },
  teal: {
    bg3d: 'from-teal-500 to-emerald-700',
    shadow3d: 'shadow-[0_4px_10px_rgba(20,184,166,0.35)]',
    border3d: 'border-teal-400/40 border-b-teal-900',
    iconColor3d: 'text-white',
    bg2d: 'bg-teal-50 dark:bg-teal-950/40',
    border2d: 'border-teal-200 dark:border-teal-800/60',
    iconColor2d: 'text-teal-600 dark:text-teal-400',
  },
  slate: {
    bg3d: 'from-slate-600 to-slate-800',
    shadow3d: 'shadow-[0_4px_10px_rgba(100,116,139,0.35)]',
    border3d: 'border-slate-400/40 border-b-slate-900',
    iconColor3d: 'text-white',
    bg2d: 'bg-slate-100 dark:bg-slate-800',
    border2d: 'border-slate-200 dark:border-slate-700',
    iconColor2d: 'text-slate-600 dark:text-slate-300',
  },
};

export const NavIcon3D: React.FC<NavIcon3DProps> = ({
  icon: Icon,
  dimension,
  isSelected,
  isLocked,
  colorScheme,
}) => {
  const theme = colorThemes[colorScheme];

  // 3D Spatial Rendering
  if (dimension === '3d') {
    return (
      <div
        className={`relative flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg transition-transform duration-200 ${
          isLocked
            ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-300 dark:border-slate-700 shadow-sm opacity-60'
            : isSelected
            ? 'bg-gradient-to-b from-white/30 to-white/10 text-white border-t border-white/50 border-b border-white/20 shadow-inner'
            : `bg-gradient-to-b ${theme.bg3d} ${theme.shadow3d} border-t ${theme.border3d} border-b-2 ${theme.iconColor3d} hover:scale-110 active:translate-y-0.5 active:border-b-0`
        }`}
        style={{
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Specular sheen on top edge */}
        <div className="absolute inset-x-1 top-0 h-[1px] bg-white/40 rounded-t pointer-events-none" />
        
        <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 drop-shadow-sm ${isSelected ? 'text-white' : ''}`} />
      </div>
    );
  }

  // 2D Minimalist Vector Rendering
  return (
    <div
      className={`flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-md transition-colors ${
        isLocked
          ? 'bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-600'
          : isSelected
          ? 'bg-white/20 text-white'
          : `${theme.bg2d} border ${theme.border2d} ${theme.iconColor2d}`
      }`}
    >
      <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
    </div>
  );
};
