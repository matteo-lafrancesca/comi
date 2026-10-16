import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidYmd,
  todayParis,
  addDays,
  weekdayIndex,
  toDbDate,
  fromDbDate,
  isoWeekOf,
  mondayOfIsoWeek,
  isValidWeekRef,
  weekRefOf,
  weekRange,
  adjacentWeek,
} from '../src/lib/date-utils';

const TIMEZONES = ['UTC', 'Europe/Paris', 'America/New_York', 'Pacific/Auckland'];

/** Joue `fn` dans chaque fuseau (le fuseau du processus ne doit rien changer). */
function inEveryTimezone(fn: (tz: string) => void) {
  const saved = process.env.TZ;
  try {
    for (const tz of TIMEZONES) {
      process.env.TZ = tz;
      fn(tz);
    }
  } finally {
    if (saved === undefined) delete process.env.TZ;
    else process.env.TZ = saved;
  }
}

test('isValidYmd : format et dates réelles', () => {
  assert.ok(isValidYmd('2025-03-05'));
  assert.ok(isValidYmd('2024-02-29'));
  assert.ok(!isValidYmd('2025-02-29'));
  assert.ok(!isValidYmd('2025-3-5'));
  assert.ok(!isValidYmd('2025-03-05T10:00:00Z'));
  assert.ok(!isValidYmd(20250305));
});

test('todayParis : dimanche soir et changements d\'heure, dans tous les fuseaux', () => {
  inEveryTimezone(() => {
    // dimanche 12 juillet 2026, 23h30 à Paris (UTC+2)
    assert.equal(todayParis(new Date('2026-07-12T21:30:00Z')), '2026-07-12');
    assert.equal(todayParis(new Date('2026-07-12T22:00:00Z')), '2026-07-13');
    // dimanche 11 janvier 2026, 23h30 à Paris (UTC+1)
    assert.equal(todayParis(new Date('2026-01-11T22:30:00Z')), '2026-01-11');
    assert.equal(todayParis(new Date('2026-01-11T23:00:00Z')), '2026-01-12');
    // passage à l'heure d'été : 29 mars 2026 à 01h59 UTC = 03h59 Paris
    assert.equal(todayParis(new Date('2026-03-29T01:59:00Z')), '2026-03-29');
  });
});

test('addDays et weekdayIndex : bords de mois, d\'année et bissextile', () => {
  assert.equal(addDays('2024-02-28', 2), '2024-03-01');
  assert.equal(addDays('2025-12-31', 1), '2026-01-01');
  assert.equal(addDays('2025-03-01', -1), '2025-02-28');
  assert.equal(weekdayIndex('2025-03-03'), 0); // lundi
  assert.equal(weekdayIndex('2025-03-09'), 6); // dimanche
});

test('toDbDate / fromDbDate : aller-retour à minuit UTC', () => {
  inEveryTimezone(() => {
    const d = toDbDate('2025-03-05');
    assert.equal(d.toISOString(), '2025-03-05T00:00:00.000Z');
    assert.equal(fromDbDate(d), '2025-03-05');
  });
});

test('semaine ISO : bords d\'année', () => {
  assert.deepEqual(isoWeekOf('2021-01-03'), { week: 53, year: 2020 });
  assert.deepEqual(isoWeekOf('2024-12-30'), { week: 1, year: 2025 });
  assert.deepEqual(isoWeekOf('2026-01-01'), { week: 1, year: 2026 });
  assert.deepEqual(isoWeekOf('2026-07-12'), { week: 28, year: 2026 });
  assert.deepEqual(isoWeekOf('2026-07-13'), { week: 29, year: 2026 });
});

test('mondayOfIsoWeek et isValidWeekRef', () => {
  assert.equal(mondayOfIsoWeek({ week: 1, year: 2025 }), '2024-12-30');
  assert.equal(mondayOfIsoWeek({ week: 10, year: 2025 }), '2025-03-03');
  assert.ok(isValidWeekRef({ week: 53, year: 2020 }));
  assert.ok(!isValidWeekRef({ week: 53, year: 2025 })); // 2025 n'a que 52 semaines
  assert.ok(!isValidWeekRef({ week: 0, year: 2025 }));
  assert.ok(!isValidWeekRef({ week: 1.5, year: 2025 }));
});

test('weekRange : lundi -> dimanche', () => {
  const r = weekRange({ week: 1, year: 2025 }, 0);
  assert.equal(r.start, '2024-12-30');
  assert.equal(r.end, '2025-01-05');
  assert.equal(r.days.length, 7);
});

test('weekRange : démarrage mercredi contient le lundi de la semaine', () => {
  const r = weekRange({ week: 10, year: 2025 }, 2);
  assert.equal(r.start, '2025-02-26');
  assert.equal(r.end, '2025-03-04');
  assert.ok(r.days.includes('2025-03-03'));
  assert.equal(weekdayIndex(r.start), 2);
});

test('weekRefOf : le dimanche soir reste dans la bonne semaine (tous fuseaux)', () => {
  inEveryTimezone(() => {
    // dimanche 12 juillet 2026 à 23h30 Paris, semaine démarrant lundi : S28
    const today = todayParis(new Date('2026-07-12T21:30:00Z'));
    assert.deepEqual(weekRefOf(today, 0), { week: 28, year: 2026 });
    // 30 minutes plus tard (minuit passé) : S29
    assert.deepEqual(weekRefOf(todayParis(new Date('2026-07-12T22:00:00Z')), 0), { week: 29, year: 2026 });
  });
});

test('weekRefOf / weekRange : cohérents pour chaque weekStartDay et chaque jour de l\'année', () => {
  for (let wsd = 0; wsd < 7; wsd++) {
    let day = '2024-12-20';
    for (let i = 0; i < 400; i++) {
      const ref = weekRefOf(day, wsd);
      const range = weekRange(ref, wsd);
      assert.ok(range.days.includes(day), `${day} (wsd=${wsd}) absent de ${range.start}..${range.end}`);
      assert.equal(weekdayIndex(range.start), wsd);
      assert.deepEqual(weekRefOf(range.start, wsd), ref);
      assert.deepEqual(weekRefOf(range.end, wsd), ref);
      day = addDays(day, 1);
    }
  }
});

test('adjacentWeek : passage d\'année et semaine 53', () => {
  assert.deepEqual(adjacentWeek({ week: 1, year: 2025 }, 'prev'), { week: 52, year: 2024 });
  assert.deepEqual(adjacentWeek({ week: 52, year: 2024 }, 'next'), { week: 1, year: 2025 });
  assert.deepEqual(adjacentWeek({ week: 52, year: 2020 }, 'next'), { week: 53, year: 2020 });
  assert.deepEqual(adjacentWeek({ week: 53, year: 2020 }, 'next'), { week: 1, year: 2021 });
});

