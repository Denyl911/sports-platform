// Preload para `bun test`
process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET ??= "test-access-secret";
process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret";

const DEFAULT_TEST_DB =
	"postgresql://sports_user:sports_user_password@localhost:5432/sports_platform_test";
if (!process.env.DATABASE_URL?.includes("sports_platform_test")) {
	process.env.DATABASE_URL = DEFAULT_TEST_DB;
}
