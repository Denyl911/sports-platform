/**
 * La puerta de los iconos del producto: `lucide-react` entra aquí y no sale de
 * aquí. La app importa `{ Trophy }` de `@sports/ui`; nadie fuera de este módulo
 * conoce la librería (ADR 009 la eligió y la dejó en `packages/ui`).
 *
 * Por qué un barril y no imports directos: `apps/web` no declara la
 * dependencia, así que un `import { Trophy } from "lucide-react"` compilaría y
 * pasaría el gate sin estar declarado — el peor tipo de bug, el invisible.
 * Tampoco vale `export * from "lucide-react"`: lucide exporta `Table` y `Sheet`
 * y `@sports/ui` ya los exporta, así que la ambigüedad rompe el barrel.
 * Re-exports nombrados: se añaden de a una línea, cuando el producto los pide.
 *
 * Reglas de uso (son obligación, no gusto):
 *
 * - **Decorativo siempre.** Todo icono es `aria-hidden` (ver `DECORATIVE`): el
 *   nombre accesible lo lleva el control que lo contiene. No es clasicismo: el
 *   preset de biome tiene `lint/a11y/noSvgWithoutTitle` en error y un `<svg>`
 *   sin `aria-hidden` ni `<title>` lo hace caer.
 * - **Tamaño por clase Tailwind**, nunca por la prop `size`: `size-4` en botones
 *   y texto, `size-3.5` en badges/pills, `size-5` en estados vacíos y chips.
 * - **Color por `currentColor`**: hereda del texto. Solo los semánticos fijan
 *   color (éxito `--palm`, error `#9f3030`, neutro `--sea-ink-soft`).
 * - **Un verbo, un icono**, siempre el mismo: crear `Plus`, editar `Pencil`,
 *   eliminar `Trash2`, guardar `Save`, buscar `Search`, cerrar `X`, volver
 *   `ArrowLeft`.
 * - **El icono acompaña a la palabra.** Va solo (sin texto) únicamente en una
 *   acción conocida, y entonces el control lleva `aria-label` en español.
 *
 * Vocabulario del dominio (un icono por término de CONTEXT.md):
 *
 * | Término | Icono | Término | Icono |
 * |---|---|---|---|
 * | Torneo | `Trophy` | Partido | `Swords` |
 * | Edición | `CalendarDays` | Equipo | `Users` |
 * | Etapa | `Layers` | Jugador | `UserRound` |
 * | Grupo | `Table2` | Club | `Building2` |
 * | Posiciones | `ListOrdered` | Sede | `MapPin` |
 * | Deporte | `Dumbbell` | Acceso | `UserCog` |
 * | Árbitro | `Whistle` | Estadísticas | `ClipboardList` |
 * | Dashboard | `Gauge` | Estado | `Flag` / `CircleCheck` |
 *
 * Lo que no lleva icono a propósito: las opciones de un `<Select>` (no admiten
 * hijos) y el pie del sitio.
 */

import type { LucideIcon } from "lucide-react";

export type { LucideIcon };

/**
 * Props de un icono decorativo. Se esparcen antes de `className`:
 * `<Trophy {...DECORATIVE} className="size-4" />`.
 */
export const DECORATIVE = {
	"aria-hidden": true,
	focusable: false,
} as const;

export {
	ArrowDown,
	ArrowDownWideNarrow,
	ArrowLeft,
	ArrowRight,
	ArrowUp,
	ArrowUpDown,
	ArrowUpNarrowWide,
	Building2,
	CalendarClock,
	CalendarDays,
	Check,
	ChevronDown,
	ChevronRight,
	ChevronUp,
	CircleAlert,
	CircleCheck,
	CircleDot,
	CircleUserRound,
	ClipboardList,
	Clock,
	Dumbbell,
	Ellipsis,
	ExternalLink,
	Eye,
	Flag,
	Gauge,
	House,
	Info,
	Layers,
	ListOrdered,
	LoaderCircle,
	Lock,
	LogIn,
	LogOut,
	Mail,
	MapPin,
	Medal,
	Menu,
	Monitor,
	Moon,
	Pause,
	Pencil,
	Play,
	Plus,
	Podium,
	Radio,
	RefreshCw,
	Save,
	Search,
	ShieldCheck,
	Sparkles,
	Sun,
	Swords,
	Table2,
	Target,
	Trash2,
	TriangleAlert,
	Trophy,
	UserCog,
	UserPlus,
	UserRound,
	Users,
	Volleyball,
	Whistle,
	Wifi,
	WifiOff,
	X,
} from "lucide-react";
