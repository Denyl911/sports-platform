// Errores de dominio libres de HTTP. El service lanza, el controller traduce.
export class DomainError extends Error {
	constructor(
		message: string,
		public status: number,
	) {
		super(message);
		this.name = "DomainError";
	}

	static badRequest(message: string) {
		return new DomainError(message, 400);
	}

	static unauthorized(message: string) {
		return new DomainError(message, 401);
	}

	static forbidden(message: string) {
		return new DomainError(message, 403);
	}

	static notFound(message: string) {
		return new DomainError(message, 404);
	}

	static conflict(message: string) {
		return new DomainError(message, 409);
	}
}
