import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getISOWeekAndYear,
  getDatesForISOWeek,
  getDaysOfWeek,
  getOrderedDayLabels,
  getCustomWeekRange,
  getCustomWeekDetails,
  getCustomWeekDetailsFromWeek,
  getAdjacentWeek,
} from '../src/lib/date-utils';

const iso = (d: Date) => d.toISOString().slice(0, 10);

test('semaine ISO : bords d\'année', () => {
  assert.deepEqual(getISOWeekAndYear(new Date('2021-01-03T12:00:00Z')), { week: 53, year: 2020 });
  assert.deepEqual(getISOWeekAndYear(new Date('2024-12-30T12:00:00Z')), { week: 1, year: 2025 });
});

test('getDatesForISOWeek : lundi -> dimanche', () => {
  const { start, end } = getDatesForISOWeek(1, 2025);
  assert.equal(iso(start), '2024-12-30');
  assert.equal(iso(end), '2025-01-05');
  assert.equal(end.getUTCHours(), 23);
});

test('getDaysOfWeek : 7 jours consécutifs à minuit UTC', () => {
  const days = getDaysOfWeek(10, 2025);
  assert.equal(days.length, 7);
  assert.equal(iso(days[0]), '2025-03-03');
  assert.equal(iso(days[6]), '2025-03-09');
  assert.ok(days.every((d) => d.getUTCHours() === 0));
});

test('getOrderedDayLabels', () => {
  assert.deepEqual(getOrderedDayLabels(2), ['Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche', 'Lundi', 'Mardi']);
});

test('getCustomWeekRange : semaine démarrant mercredi', () => {
  // vendredi 2025-03-07, semaine démarrant mercredi (2) -> 2025-03-05 .. 2025-03-11
  const { start, end } = getCustomWeekRange(new Date('2025-03-07T12:00:00Z'), 2);
  assert.equal(iso(start), '2025-03-05');
  assert.equal(iso(end), '2025-03-11');
});

test('getCustomWeekRange : démarrage dimanche (6) et lundi (0)', () => {
  assert.equal(iso(getCustomWeekRange(new Date('2025-03-07T12:00:00Z'), 6).start), '2025-03-02');
  assert.equal(iso(getCustomWeekRange(new Date('2025-03-07T12:00:00Z'), 0).start), '2025-03-03');
});

test('semaine perso : aller-retour details <-> fromWeek', () => {
  const d = getCustomWeekDetails(new Date('2025-03-07T12:00:00Z'), 2);
  const back = getCustomWeekDetailsFromWeek(d.week, d.year, 2);
  assert.equal(iso(back.start), iso(d.start));
  assert.equal(iso(back.end), iso(d.end));
});

test('getAdjacentWeek : passage d\'année', () => {
  assert.deepEqual(getAdjacentWeek(1, 2025, 'prev'), { week: 52, year: 2024 });
  assert.deepEqual(getAdjacentWeek(52, 2024, 'next'), { week: 1, year: 2025 });
});
