-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.departments (
  dept_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  dept_code text NOT NULL UNIQUE,
  dept_name text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT departments_pkey PRIMARY KEY (dept_id)
);
CREATE TABLE public.master_tasks (
  task_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  timestamp time with time zone NOT NULL,
  department text,
  given_by_username text NOT NULL,
  name text,
  task_title text NOT NULL,
  task_description text,
  task_start_date date,
  freq text,
  enable_reminders boolean DEFAULT false,
  require_attachment boolean DEFAULT false,
  planned_date date,
  actual date,
  delay integer,
  status text DEFAULT 'pending'::text,
  remarks text,
  uploaded_image text,
  whatsapp_no text,
  CONSTRAINT master_tasks_pkey PRIMARY KEY (task_id),
  CONSTRAINT fk_given_by_username FOREIGN KEY (given_by_username) REFERENCES public.users(username),
  CONSTRAINT fk_master_tasks_department FOREIGN KEY (department) REFERENCES public.departments(dept_name)
);
CREATE TABLE public.users (
  emp_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  full_name text NOT NULL,
  username text NOT NULL UNIQUE,
  password text,
  department text,
  role text NOT NULL DEFAULT 'user'::text,
  status text NOT NULL DEFAULT 'active'::text,
  user_access text,
  dept_id bigint,
  CONSTRAINT users_pkey PRIMARY KEY (emp_id),
  CONSTRAINT fk_users_department FOREIGN KEY (dept_id) REFERENCES public.departments(dept_id)
);