export default function Footer() {
	const year = new Date().getFullYear();

	return (
		<footer className="mt-20 border-t border-(--line) px-4 pt-10 pb-14 text-(--sea-ink-soft)">
			<div className="page-wrap flex flex-col items-center justify-between gap-4 text-center text-sm sm:flex-row sm:text-left">
				<p className="m-0">&copy; {year} Sports Platform</p>
				<p className="m-0">
					Torneos multideporte: resultados, fixture, tablas y marcador en vivo.
				</p>
			</div>
		</footer>
	);
}
