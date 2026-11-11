import { useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { ToggleButton } from '@astryxdesign/core/ToggleButton';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { CATEGORIES, COLORS, ICONS, type Habit, WEEKDAYS } from './lib';
import { CATEGORY_LABELS } from './labels';
import type { HabitDraft } from './store';

interface Props {
  isOpen: boolean;
  existing?: Habit;
  onClose: () => void;
  onSave: (draft: HabitDraft) => void;
  onDelete?: () => void;
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <VStack gap={2}>
      <Text type="label">{label}</Text>
      {children}
    </VStack>
  );
}

export function HabitEditor({ isOpen, existing, onClose, onSave, onDelete }: Props) {
  const [name, setName] = useState(existing?.name ?? '');
  const [icon, setIcon] = useState(existing?.icon ?? '🌱');
  const [color, setColor] = useState(existing?.color ?? COLORS[0].value);
  const [category, setCategory] = useState(existing?.category ?? 'Health');
  const [target, setTarget] = useState(existing?.target ?? 1);
  const [targetUnit, setTargetUnit] = useState(existing?.targetUnit ?? 'mal');
  const [schedule, setSchedule] = useState<number[]>(existing?.schedule ?? [0, 1, 2, 3, 4, 5, 6]);

  const canSave = name.trim().length > 0 && schedule.length > 0;

  const toggleDay = (i: number) =>
    setSchedule((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i].sort()));

  return (
    <Dialog isOpen={isOpen} onOpenChange={(open) => !open && onClose()} variant="fullscreen" purpose="form">
      <DialogHeader
        title={existing ? 'Habit bearbeiten' : 'Neues Habit'}
        onOpenChange={(open) => !open && onClose()}
      />
      <VStack gap={5} padding={4} isScrollable>
        <TextInput label="Name" value={name} onChange={setName} placeholder="z. B. Dehnen am Morgen" hasAutoFocus={!existing} />

        <Section label="Icon">
          <div className="emoji-grid">
            {ICONS.map((ic) => (
              <button key={ic} type="button" aria-pressed={icon === ic} onClick={() => setIcon(ic)}>
                {ic}
              </button>
            ))}
          </div>
        </Section>

        <Section label="Farbe">
          <div className="swatch-grid">
            {COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                className="swatch"
                aria-label={c.name}
                aria-pressed={color === c.value}
                style={{ background: c.value }}
                onClick={() => setColor(c.value)}
              />
            ))}
          </div>
        </Section>

        <Section label="Kategorie">
          <HStack gap={1} wrap="wrap">
            {CATEGORIES.map((c) => (
              <ToggleButton key={c} label={CATEGORY_LABELS[c] ?? c} size="sm" isPressed={category === c} onPressedChange={() => setCategory(c)}>
                {CATEGORY_LABELS[c] ?? c}
              </ToggleButton>
            ))}
          </HStack>
        </Section>

        <HStack gap={3} align="end">
          <NumberInput label="Tagesziel" value={target} onChange={(v) => setTarget(Math.max(1, v))} min={1} max={99} isIntegerOnly width={120} />
          <TextInput label="Einheit" value={targetUnit} onChange={setTargetUnit} width="100%" />
        </HStack>

        <Section label="Tage">
          <HStack gap={1} wrap="wrap">
            {WEEKDAYS.map((d, i) => (
              <ToggleButton key={d} label={d} size="sm" isPressed={schedule.includes(i)} onPressedChange={() => toggleDay(i)}>
                {d}
              </ToggleButton>
            ))}
          </HStack>
        </Section>

        <HStack gap={2} justify="between">
          {existing && onDelete ? <Button label="Löschen" variant="destructive" onClick={onDelete} /> : <span />}
          <Button
            label="Speichern"
            variant="primary"
            isDisabled={!canSave}
            onClick={() => canSave && onSave({ name: name.trim(), icon, color, category, target, targetUnit, schedule })}
          />
        </HStack>
      </VStack>
    </Dialog>
  );
}
