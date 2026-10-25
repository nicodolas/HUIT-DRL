CREATE TABLE "drl_criteria_presets" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"category" integer NOT NULL,
	"code" varchar(64) NOT NULL,
	"title" text NOT NULL,
	"type" varchar(16) NOT NULL,
	"points" numeric(5, 1) NOT NULL,
	"max_points_category" integer NOT NULL,
	"unit" varchar(32) DEFAULT 'lần' NOT NULL,
	"description" text,
	CONSTRAINT "drl_criteria_presets_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "drl_records" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"user_id" varchar(64) NOT NULL,
	"semester_id" varchar(64) NOT NULL,
	"preset_id" varchar(64),
	"category" integer NOT NULL,
	"title" text NOT NULL,
	"type" varchar(16) NOT NULL,
	"points" numeric(5, 1) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"occurred_at" varchar(32),
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "semesters" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"user_id" varchar(64) NOT NULL,
	"name" varchar(128) NOT NULL,
	"is_current" boolean DEFAULT true NOT NULL,
	"target_score" integer DEFAULT 90 NOT NULL,
	"discipline_level" varchar(32) DEFAULT 'none' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"username" varchar(64) NOT NULL,
	"password_hash" text NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"faculty" varchar(255),
	"class_name" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "drl_records" ADD CONSTRAINT "drl_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drl_records" ADD CONSTRAINT "drl_records_semester_id_semesters_id_fk" FOREIGN KEY ("semester_id") REFERENCES "public"."semesters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "semesters" ADD CONSTRAINT "semesters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;