ALTER TABLE public.report_items ADD COLUMN requires_leader_review BOOLEAN DEFAULT FALSE;
ALTER TABLE public.report_items ADD COLUMN review_request_note TEXT;
