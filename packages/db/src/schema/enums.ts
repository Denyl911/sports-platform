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

export const editionStatusEnum = pgEnum("edition_status", [
  "draft",
  "registration",
  "in_progress",
  "finished",
  "archived",
  "cancelled",
]);

export const matchPeriodTypeEnum = pgEnum("match_period_type", [
  "regular",
  "overtime",
  "extra_time",
  "penalties",
  "break",
]);

export const matchSlotEnum = pgEnum("match_slot", ["home", "away"]);
