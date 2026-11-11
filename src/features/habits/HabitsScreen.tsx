import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Check, Flame, Plus } from 'lucide-react';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { ClickableCard } from '@astryxdesign/core/ClickableCard';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Heading } from '@astryxdesign/core/Heading';
import { IconButton } from '@astryxdesign/core/IconButton';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { HabitEditor } from './HabitEditor';
import { Heatmap } from './Heatmap';
import { CATEGORY_LABELS } from './labels';
import { addDays, computeStreak, dateKey, daysCompleted, type Habit, todayKey, weekdayIndex } from './lib';
import { addHabit, checkIn, useHabits } from './store';

export function HabitIcon({ habit, size = 34 }: { habit: Habit; size?: number }) {
  return (
    <span className="habit-icon" style={{ width: size, height: size, background: habit.color + '2e', fontSize: size * 0.5 }}>
      {habit.icon}
    </span>
  );
}

function HabitCard({ habit }: { habit: Habit }) {
  const navigate = useNavigate();
  const today = todayKey();
  const progress = habit.entries[today] || 0;
  const done = progress >= habit.target;
  const streak = computeStreak(habit);

  return (
    <ClickableCard label={habit.name} onClick={() => navigate(`/habits/${habit.id}`)} padding={3}>
      <VStack gap={3}>
        <HStack gap={2} align="center">
          <HabitIcon habit={habit} />
          <div className="card-title">
            <Text weight="semibold" maxLines={1}>{habit.name}</Text>
            <Text type="supporting" size="xsm">
              <Flame size={11} color={habit.color} aria-hidden /> {streak} {streak === 1 ? 'Tag' : 'Tage'}
            </Text>
          </div>
          <IconButton
            label={done ? 'Erledigt, zurücksetzen' : 'Abhaken'}
            variant={done ? 'primary' : 'secondary'}
            icon={done ? <Check size={16} /> : <Plus size={16} />}
            onClick={(e) => {
              e.stopPropagation();
              void checkIn(habit.id);
            }}
          />
        </HStack>
        <Heatmap habit={habit} weeks={13} cell={8} gap={2} />
        <Text type="supporting" size="xsm">
          {habit.target === 1 ? (done ? 'Heute erledigt' : 'Heute offen') : `${progress}/${habit.target} ${habit.targetUnit}`}
        </Text>
      </VStack>
    </ClickableCard>
  );
}

function TodayView({ habits, onNew }: { habits: Habit[]; onNew: () => void }) {
  const [category, setCategory] = useState('all');
  const today = todayKey();
  const scheduled = habits.filter((h) => h.schedule.includes(weekdayIndex(new Date())));
  const doneCount = scheduled.filter((h) => (h.entries[today] || 0) >= h.target).length;
  const categories = [...new Set(habits.map((h) => h.category))];
  const shown = category === 'all' ? habits : habits.filter((h) => h.category === category);

  if (!habits.length) {
    return (
      <EmptyState
        title="Starte dein erstes Habit"
        description="Kleine tägliche Schritte summieren sich. Oder importiere deine Daten unter Einstellungen."
        actions={<Button label="Neues Habit" variant="primary" onClick={onNew} />}
      />
    );
  }

  return (
    <VStack gap={4}>
      <Card padding={4}>
        <ProgressBar
          label={`${doneCount} von ${scheduled.length} für heute erledigt`}
          value={doneCount}
          max={Math.max(1, scheduled.length)}
          hasValueLabel
          variant={doneCount === scheduled.length ? 'success' : 'accent'}
        />
      </Card>
      {categories.length > 1 && (
        <SegmentedControl label="Kategorie filtern" value={category} onChange={setCategory} size="sm">
          <SegmentedControlItem value="all" label="Alle" />
          {categories.map((c) => (
            <SegmentedControlItem key={c} value={c} label={CATEGORY_LABELS[c] ?? c} />
          ))}
        </SegmentedControl>
      )}
      <div className="habit-grid">
        {shown.map((h) => (
          <HabitCard key={h.id} habit={h} />
        ))}
      </div>
    </VStack>
  );
}

function StatsView({ habits }: { habits: Habit[] }) {
  const now = new Date();
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(now, i - 6);
    const k = dateKey(d);
    const sched = habits.filter((h) => h.schedule.includes(weekdayIndex(d)));
    const done = sched.filter((h) => (h.entries[k] || 0) >= h.target).length;
    return { d, ratio: sched.length ? done / sched.length : 0 };
  });
  const totalCheckins = habits.reduce((a, h) => a + Object.values(h.entries).reduce((x, y) => x + y, 0), 0);
  const bestStreak = Math.max(0, ...habits.map((h) => computeStreak(h)));

  return (
    <VStack gap={4}>
      <HStack gap={3}>
        <Card padding={4} width="100%">
          <Text type="supporting">Check-ins gesamt</Text>
          <Heading level={2}>{totalCheckins}</Heading>
        </Card>
        <Card padding={4} width="100%">
          <Text type="supporting">Beste Serie</Text>
          <Heading level={2}>{bestStreak} Tage</Heading>
        </Card>
      </HStack>
      <Card padding={4}>
        <VStack gap={2}>
          <Text weight="semibold">Letzte 7 Tage</Text>
          {last7.map(({ d, ratio }) => (
            <ProgressBar
              key={dateKey(d)}
              label={d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}
              value={Math.round(ratio * 100)}
              hasValueLabel
            />
          ))}
        </VStack>
      </Card>
      {habits.map((h) => (
        <Card key={h.id} padding={3}>
          <HStack gap={3} align="center">
            <HabitIcon habit={h} size={30} />
            <VStack gap={0.5} width="100%">
              <Text weight="semibold">{h.name}</Text>
              <Text type="supporting" size="xsm">
                Serie {computeStreak(h)} · {daysCompleted(h, 30)}/30 Tage
              </Text>
            </VStack>
          </HStack>
        </Card>
      ))}
    </VStack>
  );
}

export function HabitsScreen() {
  const habits = useHabits();
  const [view, setView] = useState('today');
  const [isEditorOpen, setEditorOpen] = useState(false);
  const dateLabel = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <VStack gap={4}>
      <HStack justify="between" align="center">
        <VStack gap={0.5}>
          <Text type="supporting">{dateLabel}</Text>
          <Heading level={1}>Habits</Heading>
        </VStack>
        <IconButton label="Neues Habit" variant="primary" icon={<Plus size={18} />} onClick={() => setEditorOpen(true)} />
      </HStack>

      <SegmentedControl label="Ansicht" value={view} onChange={setView} layout="fill">
        <SegmentedControlItem value="today" label="Heute" />
        <SegmentedControlItem value="stats" label="Statistik" />
      </SegmentedControl>

      {habits === undefined ? null : view === 'today' ? (
        <TodayView habits={habits} onNew={() => setEditorOpen(true)} />
      ) : (
        <StatsView habits={habits} />
      )}

      {isEditorOpen && (
        <HabitEditor
          isOpen
          onClose={() => setEditorOpen(false)}
          onSave={async (draft) => {
            await addHabit(draft);
            setEditorOpen(false);
          }}
        />
      )}
    </VStack>
  );
}
