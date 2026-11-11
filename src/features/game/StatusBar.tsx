import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { ClickableCard } from '@astryxdesign/core/ClickableCard';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { useToast } from '@astryxdesign/core/Toast';
import { AREAS, type Progress } from './engine';
import { useProgress } from './store';

export function RankBadge({ rank, color, size = 36 }: { rank: string; color: string; size?: number }) {
  return (
    <span
      className="rank-badge"
      style={{ width: size, height: size, fontSize: size * 0.5, borderColor: color, color }}
      aria-label={`Rang ${rank}`}
    >
      {rank}
    </span>
  );
}

/** Toasts on level and rank changes, including drops caused by penalties. */
function useLevelToasts(p: Progress | undefined) {
  const toast = useToast();
  const prev = useRef<Progress | undefined>(undefined);
  useEffect(() => {
    if (!p) return;
    const before = prev.current;
    prev.current = p;
    if (!before) return; // first load: nothing changed, just the current state
    if (p.rank.rank !== before.rank.rank) {
      const up = p.overall.level > before.overall.level;
      toast({ body: up ? `Neuer Rang: ${p.rank.rank}` : `Rang verloren: jetzt ${p.rank.rank}`, type: up ? 'info' : 'error' });
    } else if (p.overall.level !== before.overall.level) {
      const up = p.overall.level > before.overall.level;
      toast({ body: up ? `Level up! Jetzt Level ${p.overall.level}` : `Level verloren: jetzt Level ${p.overall.level}`, type: up ? 'info' : 'error' });
    }
    for (const a of AREAS) {
      if (p.areas[a.id].level > before.areas[a.id].level) {
        toast({ body: `${a.label} steigt auf Level ${p.areas[a.id].level}` });
      }
    }
  }, [p, toast]);
}

/** Compact level display shown above every screen; opens the status screen. */
export function StatusBar() {
  const p = useProgress();
  const navigate = useNavigate();
  useLevelToasts(p);
  if (!p) return null;

  return (
    <ClickableCard label="Status öffnen" onClick={() => navigate('/status')} padding={2}>
      <HStack gap={3} align="center">
        <RankBadge rank={p.rank.rank} color={p.rank.color} />
        <VStack gap={1} width="100%">
          <HStack justify="between">
            <Text weight="semibold" size="sm">Level {p.overall.level}</Text>
            <Text type="supporting" size="xsm" hasTabularNumbers>
              {p.overall.into} / {p.overall.needed} XP
            </Text>
          </HStack>
          <ProgressBar label={`Level ${p.overall.level}`} isLabelHidden value={p.overall.into} max={p.overall.needed} />
        </VStack>
      </HStack>
    </ClickableCard>
  );
}
