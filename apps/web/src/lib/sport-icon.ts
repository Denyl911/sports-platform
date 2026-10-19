import {
	Activity,
	Bike,
	Car,
	CircleDot,
	Crown,
	Dumbbell,
	Flag,
	Goal,
	Medal,
	Mountain,
	Shield,
	Snowflake,
	Sparkles,
	Swords,
	Trophy,
	Users,
	Waves,
	Zap,
	type LucideIcon,
} from "lucide-react";

const SPORT_ICON_MAP: Record<string, LucideIcon> = {
	futbol: Trophy,
	football: Trophy,
	fútbol: Trophy,
	basketball: CircleDot,
	baloncesto: CircleDot,
	voley: CircleDot,
	voleibol: CircleDot,
	volleyball: CircleDot,
	beachvolley: CircleDot,
	beachvoleibol: CircleDot,
	"3x3": CircleDot,
	"3": CircleDot,
	tennis: CircleDot,
	tenis: CircleDot,
	pingpong: CircleDot,
	"ping-pong": CircleDot,
	badminton: CircleDot,
	squash: CircleDot,
	rugby: Shield,
	americano: Shield,
	hockey: Zap,
	fieldhockey: Zap,
	icehockey: Zap,
	cricket: Swords,
	baseball: Swords,
	softball: Swords,
	swimming: Waves,
	natacion: Waves,
	natación: Waves,
	surf: Waves,
	diving: Waves,
	waterpolo: Waves,
	wrestling: Users,
	judo: Users,
	karate: Users,
	muaythai: Users,
	box: Users,
	boxing: Users,
	mma: Users,
	athletics: Zap,
	atletismo: Zap,
	sprint: Zap,
	marathon: Zap,
	maratón: Zap,
	cycling: Bike,
	ciclismo: Bike,
	bmx: Bike,
	golf: Flag,
	goalball: Goal,
	powerchair: Car,
	boccia: CircleDot,
	gymnastics: Activity,
	gimnasia: Activity,
	skiing: Snowflake,
	esqui: Snowflake,
	esquí: Snowflake,
	snowboard: Snowflake,
	climbing: Mountain,
	escalada: Mountain,
	rowing: Waves,
	remo: Waves,
	canoe: Waves,
	kayak: Waves,
	sailing: Waves,
	vela: Waves,
	fencing: Swords,
	esgrima: Swords,
	archery: Swords,
	arco: Swords,
	shooting: Swords,
	tiro: Swords,
	tabletennis: CircleDot,
	chess: Crown,
	ajedrez: Crown,
	go: Crown,
	esports: Zap,
	"e-sports": Zap,
	videojuegos: Zap,
	motorsport: Car,
	motorsports: Car,
	racing: Car,
	formula: Car,
	f1: Car,
	karting: Car,
	triathlon: Zap,
	triatlon: Zap,
	triatlón: Zap,
	duathlon: Zap,
	pentathlon: Medal,
	pentatlon: Medal,
	decathlon: Medal,
	decatlon: Medal,
	weightlifting: Dumbbell,
	halterofilia: Dumbbell,
	dance: Sparkles,
	baile: Sparkles,
	cheer: Sparkles,
	porras: Sparkles,
	default: Activity,
};

export function resolveSportIcon(
	sportName: string | undefined | null,
	savedIcon?: string | null,
): LucideIcon {
	if (savedIcon && SPORT_ICON_MAP[savedIcon]) {
		return SPORT_ICON_MAP[savedIcon]!;
	}

	if (!sportName) return Activity;

	const normalized = sportName
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.trim();

	const direct = SPORT_ICON_MAP[normalized];
	if (direct) return direct;

	const partial = Object.keys(SPORT_ICON_MAP).find(
		(key) => normalized.includes(key) || key.includes(normalized),
	);

	if (partial) return SPORT_ICON_MAP[partial]!;

	return Activity;
}

export function getSportIconName(sportName: string | undefined | null): string {
	const icon = resolveSportIcon(sportName);
	return icon.displayName ?? "Activity";
}
