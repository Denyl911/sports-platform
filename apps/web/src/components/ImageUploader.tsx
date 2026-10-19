import { getApiErrorMessage } from "@sports/api-client";
import { useAttachMedia, usePresignedUpload } from "@sports/api-client/hooks";
import { toast } from "@sports/ui";
import * as React from "react";
import { api } from "../lib/api";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = [
	"image/jpeg",
	"image/png",
	"image/gif",
	"image/webp",
];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm"];

type MediaType = "image" | "video";

export function ImageUploader({
	entityType,
	entityId,
	mediaType,
	onUploaded,
	children,
}: {
	entityType: string;
	entityId: string;
	mediaType?: MediaType;
	onUploaded?: (publicUrl: string) => void;
	children?: React.ReactNode;
}) {
	const fileInputRef = React.useRef<HTMLInputElement>(null);
	const [isDragging, setIsDragging] = React.useState(false);
	const [isUploading, setIsUploading] = React.useState(false);
	const [progress, setProgress] = React.useState(0);

	const presignedUpload = usePresignedUpload(api);
	const attachMedia = useAttachMedia(api);

	const detectMediaType = (mimeType: string): MediaType => {
		if (ALLOWED_VIDEO_TYPES.includes(mimeType)) return "video";
		return "image";
	};

	const uploadFile = async (file: File) => {
		const type = mediaType ?? detectMediaType(file.type);

		// Validar tipo
		const allowed =
			type === "video" ? ALLOWED_VIDEO_TYPES : ALLOWED_IMAGE_TYPES;
		if (!allowed.includes(file.type)) {
			toast.error(`Tipo no permitido: ${file.type}. Usa ${allowed.join(", ")}`);
			return;
		}

		// Validar tamaño
		if (file.size > MAX_FILE_SIZE) {
			toast.error(
				`Archivo muy grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo 5MB.`,
			);
			return;
		}

		setIsUploading(true);
		setProgress(0);

		try {
			// 1. Obtener URL prefirmada
			const { uploadUrl, mediaKey } = await presignedUpload.mutateAsync({
				fileName: file.name,
				mimeType: file.type,
				fileSize: file.size,
				mediaType: type,
			});

			// 2. Subir directamente a S3
			await new Promise<void>((resolve, reject) => {
				const xhr = new XMLHttpRequest();
				xhr.upload.addEventListener("progress", (e) => {
					if (e.lengthComputable) {
						setProgress(Math.round((e.loaded / e.total) * 100));
					}
				});
				xhr.addEventListener("load", () => {
					if (xhr.status >= 200 && xhr.status < 300) {
						resolve();
					} else {
						reject(new Error(`Upload failed: ${xhr.status}`));
					}
				});
				xhr.addEventListener("error", () => reject(new Error("Upload failed")));
				xhr.open("PUT", uploadUrl);
				xhr.setRequestHeader("Content-Type", file.type);
				xhr.send(file);
			});

			// 3. Asociar a la entidad
			await attachMedia.mutateAsync({
				entityType,
				entityId,
				mediaId: mediaKey,
			});

			toast.success("Archivo subido exitosamente");
			onUploaded?.(uploadUrl);
		} catch (err) {
			toast.error("No se pudo subir el archivo", getApiErrorMessage(err));
		} finally {
			setIsUploading(false);
			setProgress(0);
		}
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
		const files = Array.from(e.dataTransfer.files);
		if (files.length > 0) uploadFile(files[0]!);
	};

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (files && files.length > 0) uploadFile(files[0]!);
		e.target.value = "";
	};

	return (
		<button
			type="button"
			onDragOver={(e) => {
				e.preventDefault();
				setIsDragging(true);
			}}
			onDragLeave={() => setIsDragging(false)}
			onDrop={handleDrop}
			className={`relative flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-colors ${
				isDragging
					? "border-(--sea-ink) bg-(--chip-bg)"
					: "border-(--line) hover:border-(--sea-ink-soft)"
			}`}
			onClick={() => fileInputRef.current?.click()}
		>
			<input
				type="file"
				ref={fileInputRef}
				onChange={handleFileSelect}
				accept={mediaType === "video" ? "video/*" : "image/*"}
				className="hidden"
			/>
			{isUploading ? (
				<div className="space-y-2 text-center">
					<p className="text-sm font-semibold">Subiendo... {progress}%</p>
					<div className="h-2 overflow-hidden rounded-full bg-(--line)">
						<div
							className="h-full bg-(--sea-ink) transition-all"
							style={{ width: `${progress}%` }}
						/>
					</div>
				</div>
			) : (
				<div className="space-y-1 text-center">
					{children}
					<p className="text-sm font-semibold">
						{isDragging
							? "Suelta el archivo aquí"
							: "Arrastra y suelta un archivo"}
					</p>
					<p className="text-xs text-(--sea-ink-soft)">
						{"o haz clic para seleccionar. Máximo 5MB."}
					</p>
				</div>
			)}
		</button>
	);
}
