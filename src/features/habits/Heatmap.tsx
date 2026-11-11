import { useEffect, useRef } from 'react';
import { addDays, completionLevel, dateKey, type Habit, weekdayIndex } from './lib';

interface Props {
  habit: Habit;
  weeks: number;
  cell?: number;
  gap?: number;
}

const LEVEL_OPACITY = [0, 0.3, 0.55, 0.8, 1];

/** GitHub-style grid: one column per week (Mon at top), newest week on the right. */
export function Heatmap({ habit, weeks, cell = 9, gap = 3 }: Props) {
  const today = new Date();
  // Start on the Monday `weeks - 1` weeks before this week's Monday.
  const start = addDays(today, -weekdayIndex(today) - (weeks - 1) * 7);
  const width = weeks * (cell + gap) - gap;
  const height = 7 * (cell + gap) - gap;

  const rects = [];
  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const day = addDays(start, w * 7 + d);
      if (day > today) continue;
      const level = completionLevel(habit, dateKey(day));
      rects.push(
        <rect
          key={`${w}-${d}`}
          x={w * (cell + gap)}
          y={d * (cell + gap)}
          width={cell}
          height={cell}
          rx={2}
          fill={level ? habit.color : 'var(--cell-empty)'}
          fillOpacity={level ? LEVEL_OPACITY[level] : 1}
        />,
      );
    }
  }

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Verlauf ${habit.name}`}>
      {rects}
    </svg>
  );
}

/** Horizontally scrollable heatmap that starts scrolled to the newest week. */
export function HeatmapScroller(props: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollLeft = ref.current.scrollWidth;
  }, [props.habit.id, props.weeks]);
  return (
    <div ref={ref} className="heatmap-scroll">
      <Heatmap {...props} />
    </div>
  );
}
