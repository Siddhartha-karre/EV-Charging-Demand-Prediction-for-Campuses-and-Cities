import React from 'react';
import { PersonaType } from '../types';
import { SyntheticBadge } from './SyntheticBadge';
import { ShieldCheck, UserCheck, Cpu, HardHat, BarChart3 } from 'lucide-react';

interface TopNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activePersona: PersonaType;
  onPersonaChange: (persona: PersonaType) => void;
  personas: PersonaType[];
}

export const TopNav: React.FC<TopNavProps> = ({
  activeTab,
  setActiveTab,
  activePersona,
  onPersonaChange,
  personas,
}) => {
  const navItems = [
    { id: 'cases', label: 'Cases & Spine' },
    { id: 'data_prep', label: 'Data Prep' },
    { id: 'demand', label: 'Demand Analysis' },
    { id: 'site_eval', label: 'Site Evaluation' },
    { id: 'approval', label: 'Approval & Memo' },
  ];

  const getPersonaIcon = (p: PersonaType) => {
    switch (p) {
      case 'Data Scientist':
        return <BarChart3 className="w-3.5 h-3.5 text-blue-400" />;
      case 'Urban Mobility Analyst':
        return <UserCheck className="w-3.5 h-3.5 text-emerald-400" />;
      case 'City Infrastructure Planner':
        return <HardHat className="w-3.5 h-3.5 text-amber-400" />;
      case 'Application Control Agent':
        return <Cpu className="w-3.5 h-3.5 text-purple-400" />;
    }
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-3.5 bg-slate-900 border-b border-slate-800 text-slate-100">
      {/* Zone 1: Brand Wordmark */}
      <div className="flex items-center gap-3">
        <a href="#home" className="text-base font-semibold tracking-tight text-white flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
          <span>EV Demand &amp; Placement</span>
        </a>
        <SyntheticBadge />
      </div>

      {/* Zone 2: Navigation Links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`transition-colors whitespace-nowrap py-1 relative ${
                isActive
                  ? 'text-emerald-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {item.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: Persona Switcher & Controls */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700">
          {getPersonaIcon(activePersona)}
          <select
            value={activePersona}
            onChange={(e) => onPersonaChange(e.target.value as PersonaType)}
            className="bg-transparent text-xs font-medium text-slate-200 focus:outline-none cursor-pointer"
          >
            {personas.map((p) => (
              <option key={p} value={p} className="bg-slate-900 text-slate-200">
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
};
