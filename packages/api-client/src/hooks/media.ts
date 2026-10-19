import type {
	AttachMediaToEntity,
	MediaAssetResponse,
	PresignedUrlRequest,
	PresignedUrlResponse,
} from "@sports/schemas";
import {
	type UseMutationOptions,
	type UseQueryOptions,
	useMutation,
	useQuery,
} from "@tanstack/react-query";
import { type ApiClient, type TreatyResponse, unwrap } from "../client";

export function usePresignedUpload(
	client: ApiClient,
	options?: Omit<
		UseMutationOptions<unknown, Error, PresignedUrlRequest>,
		"mutationFn"
	>,
) {
	return useMutation({
		mutationFn: (body: PresignedUrlRequest) =>
			unwrap(
				(
					client.media as unknown as {
						presignedUrl: {
							post: (b: PresignedUrlRequest) => Promise<TreatyResponse>;
						};
					}
				).presignedUrl.post(body),
			) as Promise<PresignedUrlResponse>,
		...(options as unknown as object),
	});
}

export function useAttachMedia(
	client: ApiClient,
	options?: Omit<
		UseMutationOptions<unknown, Error, AttachMediaToEntity>,
		"mutationFn"
	>,
) {
	return useMutation({
		mutationFn: (body: AttachMediaToEntity) =>
			unwrap(
				(
					client.media as unknown as {
						attach: {
							post: (b: AttachMediaToEntity) => Promise<TreatyResponse>;
						};
					}
				).attach.post(body),
			) as Promise<{ success: true }>,
		...(options as unknown as object),
	});
}

export function useEntityMedia(
	client: ApiClient,
	entityType: string,
	entityId: string,
	options?: Omit<
		UseQueryOptions<
			unknown,
			Error,
			{
				items: Array<{
					id: string;
					media: MediaAssetResponse;
					isFeatured: boolean;
					displayOrder: number;
				}>;
			},
			readonly unknown[]
		>,
		"queryKey" | "queryFn"
	>,
) {
	return useQuery({
		queryKey: ["entity-media", entityType, entityId],
		queryFn: () =>
			unwrap(
				(
					client.media as unknown as {
						entity: (params: { entityType: string; entityId: string }) => {
							get: () => Promise<TreatyResponse>;
						};
					}
				)
					.entity({ entityType, entityId })
					.get(),
			) as Promise<{
				items: Array<{
					id: string;
					media: MediaAssetResponse;
					isFeatured: boolean;
					displayOrder: number;
				}>;
			}>,
		...(options as unknown as object),
	});
}
