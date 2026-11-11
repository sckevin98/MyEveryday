import { NavLink, Navigate, Route, Routes } from 'react-router';
import { CalendarDays, Dumbbell, Flame, Settings, Utensils, type LucideIcon } from 'lucide-react';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { HabitsScreen } from './features/habits/HabitsScreen';
import { HabitDetailScreen } from './features/habits/HabitDetailScreen';
import { SettingsScreen } from './features/settings/SettingsScreen';

interface Module {
  path: string;
  label: string;
  icon: LucideIcon;
}

// One entry per tool. A new module gets a route below and an entry here.
const MODULES: Module[] = [
  { path: '/habits', label: 'Habits', icon: Flame },
  { path: '/planner', label: 'Planer', icon: CalendarDays },
  { path: '/fitness', label: 'Fitness', icon: Dumbbell },
  { path: '/nutrition', label: 'Kalorien', icon: Utensils },
  { path: '/settings', label: 'Einstellungen', icon: Settings },
];

function ComingSoon({ title }: { title: string }) {
  return <EmptyState title={title} description="Dieses Modul kommt als Nächstes." />;
}

export default function App() {
  return (
    <div className="app">
      <main className="app-content">
        <Routes>
          <Route path="/" element={<Navigate to="/habits" replace />} />
          <Route path="/habits" element={<HabitsScreen />} />
          <Route path="/habits/:id" element={<HabitDetailScreen />} />
          <Route path="/planner" element={<ComingSoon title="Daily Planner" />} />
          <Route path="/fitness" element={<ComingSoon title="Fitness Tracker" />} />
          <Route path="/nutrition" element={<ComingSoon title="Kalorien Tracker" />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="*" element={<Navigate to="/habits" replace />} />
        </Routes>
      </main>
      <nav className="bottom-nav" aria-label="Module">
        {MODULES.map(({ path, label, icon: Icon }) => (
          <NavLink key={path} to={path}>
            <Icon size={20} aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
