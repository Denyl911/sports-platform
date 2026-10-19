"use client";

/**
 * SplitText — bit de react-bits reescrito sobre `motion` (runtime único del
 * monorepo): la versión vendida original usaba gsap+ScrollTheme, un runtime
 * entero por titular (ver docs/adr/009). Subconjunto de la API vendida:
 * efectos rise/fade/blur/pop, chars o words, al cargar o al entrar en
 * viewport, y loop opcional de repeticiones.
 */
import {
	motion,
	type TargetAndTransition,
	useInView,
	useReducedMotion,
} from "motion/react";
import {
	type CSSProperties,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";

export type SplitTextEffect = "rise" | "fade" | "blur" | "pop";

export interface SplitTextProps {
	text: string;
	className?: string;
	tag?: "h1" | "h2" | "h3" | "h4" | "p" | "span";
	splitType?: "chars" | "words";
	effect?: SplitTextEffect;
	/** Retardo por unidad entre letras/palabras, en segundos. */
	staggerSeconds?: number;
	durationSeconds?: number;
	trigger?: "load" | "view";
	loop?: boolean;
	loopDelaySeconds?: number;
	textAlign?: CSSProperties["textAlign"];
	color?: string;
	/** Color inicial de cada unidad; termina en el color del contenedor. */
	accentColor?: string;
}

const EASE = [0.22, 1, 0.36, 1] as const;

const poses: Record<
	SplitTextEffect,
	{ hide: TargetAndTransition; show: TargetAndTransition }
> = {
	rise: {
		hide: { opacity: 0, y: "0.45em" },
		show: { opacity: 1, y: 0 },
	},
	fade: { hide: { opacity: 0 }, show: { opacity: 1 } },
	blur: {
		hide: { opacity: 0, filter: "blur(6px)" },
		show: { opacity: 1, filter: "blur(0px)" },
	},
	pop: {
		hide: { opacity: 0, scale: 0.6 },
		show: { opacity: 1, scale: 1 },
	},
};

export default function SplitText({
	text,
	className = "",
	tag = "p",
	splitType = "chars",
	effect = "rise",
	staggerSeconds = 0.04,
	durationSeconds = 0.8,
	trigger = "load",
	loop = false,
	loopDelaySeconds = 3,
	textAlign = "center",
	color,
	accentColor,
}: SplitTextProps) {
	const Tag = tag;
	const ref = useRef<HTMLHeadingElement>(null);
	const seen = useInView(ref, { once: true, margin: "-40px" });
	const reduce = useReducedMotion();
	const [cycle, setCycle] = useState(0);

	useEffect(() => {
		if (!loop || reduce) return undefined;
		const period = (durationSeconds + loopDelaySeconds) * 1000;
		const id = window.setInterval(() => setCycle((c) => c + 1), period);
		return () => window.clearInterval(id);
	}, [loop, reduce, durationSeconds, loopDelaySeconds, text]);

	const units = useMemo(
		() => (splitType === "words" ? text.split(/(\s+)/) : Array.from(text)),
		[splitType, text],
	);

	const active = reduce ? true : trigger === "load" ? true : seen;
	const duration = reduce ? 0 : durationSeconds;

	return (
		<Tag
			ref={ref}
			className={`split-parent inline-block whitespace-pre-wrap ${className}`}
			style={{ textAlign, color }}
			aria-label={text}
		>
			{units.map((unit, index) => {
				if (/\s+/.test(unit)) {
					return <span key={`${cycle}-${index}`}>{unit}</span>;
				}
				const pose = poses[effect];
				return (
					<motion.span
						key={`${cycle}-${index}`}
						aria-hidden="true"
						className="inline-block"
						style={{ display: "inline-block" }}
						initial={
							accentColor ? { ...pose.hide, color: accentColor } : pose.hide
						}
						animate={
							active
								? accentColor
									? { ...pose.show, color: color ?? "var(--sea-ink)" }
									: pose.show
								: pose.hide
						}
						transition={{
							duration,
							delay: active ? index * staggerSeconds : 0,
							ease: EASE,
						}}
					>
						{unit}
					</motion.span>
				);
			})}
		</Tag>
	);
}
