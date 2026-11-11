import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { ToggleButton } from '@astryxdesign/core/ToggleButton';
import { useHabits } from '../habits/store';
import { keyToDate, todayKey, weekdayIndex } from '../habits/lib';
import { AREAS, areaOf, bonusQuestsFor, RANKS, XP } from './engine';
import { RankBadge } from './StatusBar';
import { toggleBonus, useBonusDoneToday, useProgress } from './store';

const AREA_LABEL = Object.fromEntries(AREAS.map((a) => [a.id, a.label]));

export function StatusScreen() {
  const p = useProgress();
  const habits = useHabits();
  const bonusDone = useBonusDoneToday();
  if (!p || !habits || !bonusDone) return null;

  const today = todayKey();
  const dueToday = habits.filter((h) => h.schedule.includes(weekdayIndex(new Date())));
  const nextRank = [...RANKS].reverse().find((r) => r.minLevel > p.overall.level);

  return (
    <VStack gap={4}>
      <Heading level={1}>Status</Heading>

      <Card padding={4}>
        <HStack gap={4} align="center">
          <RankBadge rank={p.rank.rank} color={p.rank.color} size={72} />
          <VStack gap={1} width="100%">
            <Text type="supporting" size="xsm">Rang {p.rank.rank}</Text>
            <Heading level={2}>Level {p.overall.level}</Heading>
            <ProgressBar
              label={`${p.overall.into} / ${p.overall.needed} XP bis Level ${p.overall.level + 1}`}
              value={p.overall.into}
              max={p.overall.needed}
            />
            <Text type="supporting" size="xsm">
              {p.totalXp} XP gesamt{nextRank ? ` · Rang ${nextRank.rank} ab Level ${nextRank.minLevel}` : ''}
            </Text>
          </VStack>
        </HStack>
      </Card>

      <Card padding={4}>
        <VStack gap={3}>
          <Text weight="semibold">Bereiche</Text>
          {AREAS.map((a) => {
            const s = p.areas[a.id];
            return (
              <ProgressBar
                key={a.id}
                label={`${a.label} · Level ${s.level}`}
                value={s.into}
                max={s.needed}
                formatValueLabel={(v, m) => `${v}/${m}`}
                hasValueLabel
              />
            );
          })}
        </VStack>
      </Card>

      <Card padding={4}>
        <VStack gap={3}>
          <VStack gap={0.5}>
            <Text weight="semibold">Pflicht-Quests heute</Text>
            <Text type="supporting" size="xsm">
              Jedes verpasste Habit kostet {Math.abs(XP.missedHabit)} XP. Alle erledigt: +{XP.perfectDay} XP Disziplin.
            </Text>
          </VStack>
          {dueToday.length === 0 && <Text type="supporting">Heute steht nichts an.</Text>}
          {dueToday.map((h) => {
            const done = (h.entries[today] || 0) >= h.target;
            return (
              <HStack key={h.id} justify="between" align="center" gap={2}>
                <Text hasStrikethrough={done} color={done ? 'secondary' : 'primary'}>
                  {h.icon} {h.name}
                </Text>
                <Text type="supporting" size="xsm">{done ? 'erledigt' : AREA_LABEL[areaOf(h)]}</Text>
              </HStack>
            );
          })}
        </VStack>
      </Card>

      <Card padding={4}>
        <VStack gap={3}>
          <VStack gap={0.5}>
            <Text weight="semibold">Bonus-Quests</Text>
            <Text type="supporting" size="xsm">Freiwillig: bringen XP, kosten nichts. Jeden Tag neu.</Text>
          </VStack>
          {bonusQuestsFor(today).map((q) => {
            const done = bonusDone.has(q.id);
            return (
              <HStack key={q.id} justify="between" align="center" gap={2}>
                <div className="card-title">
                  <Text hasStrikethrough={done}>{q.title}</Text>
                  <Text type="supporting" size="xsm">{AREA_LABEL[q.area]} · +{q.xp} XP</Text>
                </div>
                <ToggleButton
                  label={done ? 'Erledigt' : 'Abhaken'}
                  size="sm"
                  isPressed={done}
                  onPressedChange={() => void toggleBonus(today, q.id)}
                >
                  {done ? 'Erledigt' : 'Abhaken'}
                </ToggleButton>
              </HStack>
            );
          })}
        </VStack>
      </Card>

      <Card padding={4}>
        <VStack gap={2}>
          <Text weight="semibold">Verlauf</Text>
          {p.events.length === 0 && <Text type="supporting">Noch keine XP. Hake ein Habit ab, um zu starten.</Text>}
          {p.events.slice(0, 20).map((e, i) => (
            <HStack key={i} justify="between" gap={2}>
              <VStack gap={0}>
                <Text size="sm">{e.kind === 'missed' ? `Verpasst: ${e.label}` : e.label}</Text>
                <Text type="supporting" size="xsm">
                  {keyToDate(e.date).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })} · {AREA_LABEL[e.area]}
                </Text>
              </VStack>
              <Text weight="semibold" size="sm" hasTabularNumbers style={e.xp < 0 ? { color: 'var(--color-text-error)' } : undefined}>
                {e.xp > 0 ? `+${e.xp}` : e.xp} XP
              </Text>
            </HStack>
          ))}
        </VStack>
      </Card>
    </VStack>
  );
}
