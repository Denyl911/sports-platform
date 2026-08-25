import { pgEnum } from "drizzle-orm/pg-core/columns";

export const stageTypeEnum = pgEnum("stage_type", [
  "round_robin",
  "single_elimination",
  "double_elimination",
  "swiss",
  "manual",
]);

export const matchStatusEnum = pgEnum("match_status", [
  "scheduled",
  "in_progress",
  "paused",
  "finished",
  "cancelled",
  "walkover",
]);
