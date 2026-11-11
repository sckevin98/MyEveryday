import { useRef, useState } from 'react';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { db, exportBackup, restoreBackup, wipeAll } from '../../db';
import { isNativeBackup, mergeCsvImport, parseCsv, parseHabitKit, todayKey } from '../habits/lib';
import { appendHabits, replaceAllHabits } from '../habits/store';
import { type ColorMode, setColorMode, useColorMode } from '../../shared/colorMode';

type Msg = { status: 'success' | 'error'; text: string } | null;

async function download() {
  const blob = new Blob([JSON.stringify(await exportBackup(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `myeveryday-backup-${todayKey()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Accepts our own backups, old MyHabits backups, HabitKit exports and CSV. */
async function importFile(file: File): Promise<string | null> {
  const text = await file.text();
  if (!text.trim().startsWith('{')) {
    const parsed = parseCsv(text);
    if (!parsed.columns.length) throw new Error('Keine Habit-Daten in der CSV gefunden');
    if (!confirm(`${parsed.columns.length} Habits aus CSV importieren (${parsed.earliest} bis ${parsed.latest})? Gleichnamige Habits werden zusammengeführt.`)) return null;
    await replaceAllHabits(mergeCsvImport(await db.habits.orderBy('order').toArray(), parsed));
    return `${parsed.columns.length} Habit-Spalten importiert.`;
  }

  const json = JSON.parse(text);
  if (isNativeBackup(json)) {
    if (!confirm('Alle aktuellen Daten durch dieses Backup ersetzen?')) return null;
    await restoreBackup(json);
    return `${json.habits.length} Habits wiederhergestellt.`;
  }
  const imported = parseHabitKit(json);
  if (!confirm(`${imported.length} Habits aus HabitKit zu deinen bestehenden hinzufügen?`)) return null;
  await appendHabits(imported);
  return `${imported.length} Habits aus HabitKit importiert.`;
}

export function SettingsScreen() {
  const mode = useColorMode();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<Msg>(null);

  return (
    <VStack gap={4}>
      <Heading level={1}>Einstellungen</Heading>

      <Card padding={4}>
        <VStack gap={3}>
          <Text weight="semibold">Darstellung</Text>
          <SegmentedControl label="Farbmodus" value={mode} onChange={(v) => setColorMode(v as ColorMode)} layout="fill">
            <SegmentedControlItem value="system" label="System" />
            <SegmentedControlItem value="light" label="Hell" />
            <SegmentedControlItem value="dark" label="Dunkel" />
          </SegmentedControl>
        </VStack>
      </Card>

      <Card padding={4}>
        <VStack gap={3}>
          <Text weight="semibold">Daten</Text>
          <Text type="supporting">
            Alle Daten liegen nur auf diesem Gerät. Exportiere regelmäßig ein Backup, besonders vor dem Wechsel auf ein neues Gerät.
          </Text>
          <Button label="Backup exportieren (.json)" clickAction={download} width="100%" />
          <Button label="Daten importieren (.json oder .csv)" onClick={() => fileRef.current?.click()} width="100%" />
          <input
            ref={fileRef}
            type="file"
            accept=".json,.csv,application/json,text/csv,text/plain"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              try {
                const result = await importFile(file);
                if (result) setMsg({ status: 'success', text: result });
              } catch (err) {
                setMsg({ status: 'error', text: `Import fehlgeschlagen: ${(err as Error).message}` });
              }
            }}
          />
          {msg && <Banner status={msg.status} title={msg.text} isDismissable onDismiss={() => setMsg(null)} />}
          <Text type="supporting" size="xsm">
            Unterstützt: MyEveryday- und alte MyHabits-Backups (ersetzen alles), HabitKit-Exporte (werden hinzugefügt) und CSV
            (erste Spalte Datum im Format JJJJ-MM-TT, weitere Spalten sind Habit-Namen).
          </Text>
          <Button
            label="Alles löschen"
            variant="destructive"
            width="100%"
            clickAction={async () => {
              if (confirm('Wirklich ALLE Daten löschen? Das kann nicht rückgängig gemacht werden.')) await wipeAll();
            }}
          />
        </VStack>
      </Card>

      <Text type="supporting" size="xsm" justify="center">MyEveryday · Daten nur auf diesem Gerät</Text>
    </VStack>
  );
}
