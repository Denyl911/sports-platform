/**
 * Fechas del fixture en la zona del navegador. La API guarda instantes UTC y
 * la pantalla los muestra en la hora local de quien mira; `datetime-local`
 * necesita el mismo criterio para editar sin correr la hora.
 *
 * Las funciones son compartidas por la mesa del admin y la vista pública para
 * que una jornada no se lea distinta en cada pantalla.
 */

const DAY_FORMAT = new Intl.DateTimeFormat("es-AR", {
	weekday: "short",
	day: "numeric",
	month: "short",
});
const TIME_FORMAT = new Intl.DateTimeFormat("es-AR", {
	hour: "2-digit",
	minute: "2-digit",
});

function pad(value: number): string {
	return String(value).padStart(2, "0");
}

export function toDate(value: Date | string | null | undefined): Date | null {
	if (!value) return null;
	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

export function localDateKey(
	value: Date | string | null | undefined,
): string | null {
	const date = toDate(value);
	if (!date) return null;
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function localTimeKey(
	value: Date | string | null | undefined,
): string | null {
	const date = toDate(value);
	if (!date) return null;
	return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function localDateTimeInput(
	value: Date | string | null | undefined,
): string {
	const day = localDateKey(value);
	const time = localTimeKey(value);
	return day && time ? `${day}T${time}` : "";
}

export function todayLocalDate(): string {
	return localDateKey(new Date()) ?? "";
}

export function formatDay(value: Date | string | null | undefined): string {
	const date = toDate(value);
	return date ? DAY_FORMAT.format(date) : "Sin fecha";
}

export function formatTime(value: Date | string | null | undefined): string {
	const date = toDate(value);
	return date ? TIME_FORMAT.format(date) : "";
}

export function formatDateKey(key: string): string {
	const date = new Date(`${key}T12:00:00`);
	return Number.isNaN(date.getTime()) ? key : DAY_FORMAT.format(date);
}

export function timestampOf(
	value: Date | string | null | undefined,
): number | null {
	const date = toDate(value);
	return date ? date.getTime() : null;
}

export type FixtureDateItem = {
	id: string;
	roundNumber?: number | null;
	scheduledAt: Date | string | null;
	matchNumber: number | null;
};

export function compareFixtureItems(
	a: FixtureDateItem,
	b: FixtureDateItem,
): number {
	const aTime = timestampOf(a.scheduledAt);
	const bTime = timestampOf(b.scheduledAt);
	if (aTime !== null && bTime !== null && aTime !== bTime) return aTime - bTime;
	if (aTime === null && bTime !== null) return 1;
	if (aTime !== null && bTime === null) return -1;
	const aNumber = a.matchNumber ?? Number.POSITIVE_INFINITY;
	const bNumber = b.matchNumber ?? Number.POSITIVE_INFINITY;
	if (aNumber !== bNumber) return aNumber < bNumber ? -1 : 1;
	return a.id.localeCompare(b.id);
}

export interface Matchday<T> {
	roundNumber: number;
	items: T[];
}

export function matchdayDateLabel(
	items: Array<Pick<FixtureDateItem, "scheduledAt">>,
): string {
	const keys = Array.from(
		new Set(
			items
				.map((item) => localDateKey(item.scheduledAt))
				.filter((key): key is string => key !== null),
		),
	).sort();
	if (keys.length === 0) return "Sin fecha";
	return keys.map((key) => formatDateKey(key)).join(" · ");
}

export function groupByMatchday<T extends FixtureDateItem>(
	items: T[],
): Matchday<T>[] {
	const byRound = new Map<number, T[]>();
	for (const item of items) {
		const round = item.roundNumber ?? 1;
		const list = byRound.get(round);
		if (list) list.push(item);
		else byRound.set(round, [item]);
	}
	return Array.from(byRound.entries())
		.sort(([a], [b]) => a - b)
		.map(([roundNumber, roundItems]) => ({
			roundNumber,
			items: [...roundItems].sort(compareFixtureItems),
		}));
}
