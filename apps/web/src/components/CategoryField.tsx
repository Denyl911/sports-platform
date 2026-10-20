import { CATEGORIES } from "../lib/categories";
import * as React from "react";

type CategoryFieldProps = {
	id: string;
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
};

export default function CategoryField({
	id,
	value,
	onChange,
	placeholder = "Ej: 2015, Sub-16…",
}: CategoryFieldProps) {
	const [display, setDisplay] = React.useState(() => {
		if (value && CATEGORIES[value as keyof typeof CATEGORIES]) {
			return CATEGORIES[value as keyof typeof CATEGORIES].label;
		}
		return value;
	});

	React.useEffect(() => {
		if (value && CATEGORIES[value as keyof typeof CATEGORIES]) {
			setDisplay(CATEGORIES[value as keyof typeof CATEGORIES].label);
		} else {
			setDisplay(value);
		}
	}, [value]);

	const handleInputChange = (newValue: string) => {
		setDisplay(newValue);
		onChange(newValue);
	};

	const handleChipClick = (val: keyof typeof CATEGORIES) => {
		onChange(val);
		setDisplay(CATEGORIES[val].label);
	};

	return (
		<div className="flex flex-col">
			<input
				id={id}
				list={`${id}-options`}
				value={display}
				onChange={(e) => handleInputChange(e.target.value)}
				placeholder={placeholder}
				className="w-full rounded-md border border-(--chip-line) bg-(--card) px-3 py-2 text-sm text-(--sea-ink) outline-none focus:border-(--sea-ink) focus:ring-1 focus:ring-(--sea-ink)"
			/>
			<datalist id={`${id}-options`}>
				{(
					Object.entries(CATEGORIES) as [
						keyof typeof CATEGORIES,
						(typeof CATEGORIES)[keyof typeof CATEGORIES],
					][]
				).map(([val, { label: l }]) => (
					<option key={val} value={val}>
						{l}
					</option>
				))}
			</datalist>
			<div className="mt-1.5 flex flex-wrap gap-1">
				{(
					Object.entries(CATEGORIES) as [
						keyof typeof CATEGORIES,
						(typeof CATEGORIES)[keyof typeof CATEGORIES],
					][]
				).map(([val, { label: l, description }]) => (
					<button
						key={val}
						type="button"
						title={description}
						onClick={() => handleChipClick(val)}
						className={`rounded-full border px-2 py-0.5 text-xs font-medium transition ${
							value === val
								? "border-slate-900 bg-slate-900 text-white"
								: "border-(--chip-line) bg-(--chip-bg) text-(--sea-ink) hover:border-(--sea-ink)"
						}`}
					>
						{l}
					</button>
				))}
			</div>
		</div>
	);
}
