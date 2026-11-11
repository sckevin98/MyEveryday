import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ChevronLeft, Pencil } from 'lucide-react';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Heading } from '@astryxdesign/core/Heading';
import { IconButton } from '@astryxdesign/core/IconButton';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { HabitEditor } from './HabitEditor';
import { HabitIcon } from './HabitsScreen';
import { HeatmapScroller } from './Heatmap';
import { CATEGORY_LABELS } from './labels';
import { completionRatio, computeStreak, dateKey, daysCompleted, type Habit, todayKey, WEEKDAYS, weekdayIndex } from './lib';
import { checkIn, deleteHabit, setEntry, updateHabit, useHabit } from './store';

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card padding={3} width="100%">
      <Text type="supporting" size="xsm">{label}</Text>
      <Heading level={3}>{value}</Heading>
    </Card>
  );
}

function MonthCalendar({ habit }: { habit: Habit }) {
  const now = new Date();
  const today = todayKey();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array<null>(weekdayIndex(first)).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(now.getFullYear(), now.getMonth(), i + 1)),
  ];

  return (
    <Card padding={4}>
      <VStack gap={3}>
        <Text weight="semibold">{now.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}</Text>
        <div className="month-grid">
          {WEEKDAYS.map((d) => (
            <span key={d} className="weekday">{d}</span>
          ))}
          {cells.map((d, i) => {
            if (!d) return <span key={i} />;
            const key = dateKey(d);
            const ratio = completionRatio(habit, key);
            const isFuture = d > now;
            return (
              <button
                key={key}
                type="button"
                className={key === today ? 'today' : undefined}
                disabled={isFuture}
                aria-label={`${d.getDate()}. ${ratio >= 1 ? 'erledigt' : 'offen'}`}
                style={{
                  background: ratio > 0 ? habit.color : 'var(--cell-empty)',
                  opacity: ratio > 0 ? 0.35 + ratio * 0.65 : undefined,
                }}
                onClick={() => void checkIn(habit.id, key)}
              >
                {d.getDate()}
              </button>
            );
          })}
        </div>
        <Text type="supporting" size="xsm" justify="center">Tippe auf einen Tag, um ihn nachzutragen</Text>
      </VStack>
    </Card>
  );
}

export function HabitDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const habit = useHabit(id);
  const [isEditorOpen, setEditorOpen] = useState(false);

  if (habit === undefined) return null;
  if (habit === null) {
    return (
      <EmptyState
        title="Habit nicht gefunden"
        actions={<Button label="Zurück" onClick={() => navigate('/habits')} />}
      />
    );
  }

  const today = todayKey();
  const todayVal = habit.entries[today] || 0;
  const totalDays = Object.values(habit.entries).filter((v) => v >= habit.target).length;

  return (
    <VStack gap={4}>
      <HStack justify="between">
        <IconButton label="Zurück" variant="ghost" icon={<ChevronLeft size={20} />} onClick={() => navigate('/habits')} />
        <IconButton label="Bearbeiten" variant="ghost" icon={<Pencil size={18} />} onClick={() => setEditorOpen(true)} />
      </HStack>

      <HStack gap={3} align="center">
        <HabitIcon habit={habit} size={52} />
        <VStack gap={0.5}>
          <Heading level={1}>{habit.name}</Heading>
          <Text type="supporting">
            {CATEGORY_LABELS[habit.category] ?? habit.category} · {habit.target} {habit.targetUnit} pro Tag
          </Text>
        </VStack>
      </HStack>

      <Card padding={4}>
        <HStack justify="between" align="center" gap={3}>
          <VStack gap={0.5}>
            <Text type="supporting" size="xsm">Heute</Text>
            <Heading level={3}>{todayVal}/{habit.target} {habit.targetUnit}</Heading>
          </VStack>
          {habit.target > 1 ? (
            <NumberInput
              label="Heute"
              isLabelHidden
              value={todayVal}
              onChange={(v) => void setEntry(habit.id, today, v)}
              min={0}
              max={habit.target}
              isIntegerOnly
              hasNumberSteppers
              width={120}
            />
          ) : (
            <Button
              label={todayVal ? 'Erledigt' : 'Abhaken'}
              variant={todayVal ? 'primary' : 'secondary'}
              onClick={() => void checkIn(habit.id)}
            />
          )}
        </HStack>
      </Card>

      <HStack gap={2}>
        <Stat label="Serie" value={computeStreak(habit)} />
        <Stat label="Letzte 30 T." value={daysCompleted(habit, 30)} />
        <Stat label="Gesamt" value={totalDays} />
      </HStack>

      <Card padding={4}>
        <VStack gap={3}>
          <Text weight="semibold">Verlauf</Text>
          <HeatmapScroller habit={habit} weeks={53} cell={10} gap={3} />
        </VStack>
      </Card>

      <MonthCalendar habit={habit} />

      {isEditorOpen && (
        <HabitEditor
          isOpen
          existing={habit}
          onClose={() => setEditorOpen(false)}
          onSave={async (patch) => {
            await updateHabit(habit.id, patch);
            setEditorOpen(false);
          }}
          onDelete={async () => {
            if (!confirm('Dieses Habit löschen? Der Verlauf geht verloren.')) return;
            await deleteHabit(habit.id);
            navigate('/habits');
          }}
        />
      )}
    </VStack>
  );
}
