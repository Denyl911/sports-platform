// @ts-nocheck
import { createFileRoute, Link } from "@tanstack/react-router";
import { api } from "../../../lib/api";
import { getApiErrorMessage } from "@sports/api-client";
import { useCreateStage, useDeleteStage, useStagesByEdition } from "@sports/api-client/hooks";
import { Button, Card, CardHeader, CardTitle, Input, Select, Badge } from "@sports/ui";
import * as React from "react";

export const Route = createFileRoute("/admin/editions/$editionId")({
	component: AdminEditionDetailPage,
});

function AdminEditionDetailPage() {
	const { editionId } = Route.useParams();
	const { data: stagesData } = useStagesByEdition(api, editionId);
	const createStage = useCreateStage(api);
	const deleteStage = useDeleteStage(api);
	const stages = (stagesData as { items: Array<{ id: string; name: string; stageType: string; sequenceOrder: number }>; total: number } | undefined)?.items ?? [];

	const [name, setName] = React.useState("");
	const [stageType, setStageType] = React.useState("round_robin");
	const [seq, setSeq] = React.useState(1);
	const [error, setError] = React.useState<string | null>(null);

	const onCreate = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		try {
			await createStage.mutateAsync({ editionId, body: { name, stageType, sequenceOrder: seq } as never });
			setName("");
		} catch (err) {
			setError(getApiErrorMessage(err));
		}
	};

	return (
		<div className="space-y-6">
			<Link to="/admin/tournaments" className="text-sm text-[var(--sea-ink-soft)]">← Torneos</Link>
			<Card className="p-4">
				<h3 className="font-bold">Etapas de la edición {editionId.slice(0, 8)}</h3>
				<form onSubmit={onCreate} className="mt-3 flex flex-wrap gap-2">
					<Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Fase 1" required className="flex-1 min-w-32" />
					<Select value={stageType} onChange={(e) => setStageType(e.target.value)}>
						<option value="round_robin">round_robin</option>
						<option value="single_elimination">single_elimination</option>
						<option value="swiss">swiss</option>
					</Select>
					<Input type="number" value={seq} onChange={(e) => setSeq(Number(e.target.value))} className="w-20" />
					<Button type="submit" disabled={createStage.isPending}>Crear etapa</Button>
				</form>
				{error && <div className="demo-alert-danger mt-2 text-sm">{error}</div>}
				<div className="mt-4 grid gap-2 sm:grid-cols-2">
					{stages.map((s) => (
						<Card key={s.id} className="p-3 flex flex-col">
							<Link to="/admin/stages/$stageId" params={{ stageId: s.id }} className="no-underline">
								<CardHeader className="p-0"><CardTitle className="text-sm">{s.name}</CardTitle></CardHeader>
								<div className="flex gap-2 mt-1">
									<Badge>{s.stageType}</Badge>
									<Badge variant="secondary">#{s.sequenceOrder}</Badge>
								</div>
							</Link>
							<Button
								variant="ghost"
								size="sm"
								className="mt-2 self-start"
								onClick={async () => {
									if (!confirm(`¿Eliminar etapa ${s.name}?`)) return;
									try {
										await deleteStage.mutateAsync(s.id);
									} catch (err) {
										setError(getApiErrorMessage(err));
									}
								}}
							>
								Eliminar
							</Button>
						</Card>
					))}
				</div>
				{stages.length === 0 && <div className="text-sm text-[var(--sea-ink-soft)] mt-2">Sin etapas</div>}
			</Card>
		</div>
	);
}
