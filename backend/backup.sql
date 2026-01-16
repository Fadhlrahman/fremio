--
-- PostgreSQL database dump
--

\restrict 5riRYZUatoHjBzTnOJJRpvaUCm5SW33BIzooJR8S5B8ukMYxmVn2ZCchYYu4RBQ

-- Dumped from database version 15.15 (Homebrew)
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: can_user_download(uuid); Type: FUNCTION; Schema: public; Owner: fremio_user
--

CREATE FUNCTION public.can_user_download(p_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_limit INTEGER;
    v_used INTEGER;
BEGIN
    SELECT (p.limits->>'downloads_per_month')::INTEGER
    INTO v_limit
    FROM user_subscriptions s
    JOIN subscription_plans p ON s.plan_id = p.id
    WHERE s.user_id = p_user_id
    AND s.status = 'active'
    AND s.current_period_end > NOW();
    
    IF v_limit IS NULL THEN
        v_limit := 5;
    END IF;
    
    IF v_limit = -1 THEN
        RETURN TRUE;
    END IF;
    
    SELECT downloads_count
    INTO v_used
    FROM user_usage
    WHERE user_id = p_user_id
    AND period_start = date_trunc('month', CURRENT_DATE)::DATE;
    
    IF v_used IS NULL THEN
        v_used := 0;
    END IF;
    
    RETURN v_used < v_limit;
END;
$$;


ALTER FUNCTION public.can_user_download(p_user_id uuid) OWNER TO fremio_user;

--
-- Name: generate_invoice_number(); Type: FUNCTION; Schema: public; Owner: fremio_user
--

CREATE FUNCTION public.generate_invoice_number() RETURNS character varying
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_year VARCHAR(4);
    v_month VARCHAR(2);
    v_sequence INTEGER;
    v_invoice VARCHAR(50);
BEGIN
    v_year := to_char(CURRENT_DATE, 'YYYY');
    v_month := to_char(CURRENT_DATE, 'MM');
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 12) AS INTEGER)), 0) + 1
    INTO v_sequence
    FROM payment_transactions
    WHERE invoice_number LIKE 'INV-' || v_year || v_month || '-%';
    
    v_invoice := 'INV-' || v_year || v_month || '-' || LPAD(v_sequence::TEXT, 5, '0');
    
    RETURN v_invoice;
END;
$$;


ALTER FUNCTION public.generate_invoice_number() OWNER TO fremio_user;

--
-- Name: get_user_subscription(uuid); Type: FUNCTION; Schema: public; Owner: fremio_user
--

CREATE FUNCTION public.get_user_subscription(p_user_id uuid) RETURNS TABLE(plan_id character varying, plan_name character varying, status character varying, period_end timestamp with time zone, limits jsonb)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.plan_id,
        p.name,
        s.status,
        s.current_period_end,
        p.limits
    FROM user_subscriptions s
    JOIN subscription_plans p ON s.plan_id = p.id
    WHERE s.user_id = p_user_id
    AND s.status IN ('active', 'trialing')
    AND s.current_period_end > NOW()
    ORDER BY p.price_monthly DESC
    LIMIT 1;
END;
$$;


ALTER FUNCTION public.get_user_subscription(p_user_id uuid) OWNER TO fremio_user;

--
-- Name: log_payment_changes(); Type: FUNCTION; Schema: public; Owner: fremio_user
--

CREATE FUNCTION public.log_payment_changes() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO audit_log (user_id, action, table_name, record_id, old_values, new_values)
    VALUES (
        COALESCE(NEW.user_id, OLD.user_id),
        TG_OP,
        'payment_transactions',
        COALESCE(NEW.id, OLD.id)::TEXT,
        CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END
    );
    RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION public.log_payment_changes() OWNER TO fremio_user;

--
-- Name: log_subscription_changes(); Type: FUNCTION; Schema: public; Owner: fremio_user
--

CREATE FUNCTION public.log_subscription_changes() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO audit_log (user_id, action, table_name, record_id, old_values, new_values)
    VALUES (
        COALESCE(NEW.user_id, OLD.user_id),
        TG_OP,
        'user_subscriptions',
        COALESCE(NEW.id, OLD.id)::TEXT,
        CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END
    );
    RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION public.log_subscription_changes() OWNER TO fremio_user;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: fremio_user
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO fremio_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: subscription_plans; Type: TABLE; Schema: public; Owner: fremio_user
--

CREATE TABLE public.subscription_plans (
    id character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    price_monthly numeric(10,2) NOT NULL,
    price_yearly numeric(10,2),
    currency character varying(3) DEFAULT 'IDR'::character varying,
    features jsonb DEFAULT '[]'::jsonb,
    limits jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.subscription_plans OWNER TO fremio_user;

--
-- Name: user_subscriptions; Type: TABLE; Schema: public; Owner: fremio_user
--

CREATE TABLE public.user_subscriptions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    plan_id character varying(50) NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying,
    billing_cycle character varying(10) DEFAULT 'monthly'::character varying,
    current_period_start timestamp with time zone NOT NULL,
    current_period_end timestamp with time zone NOT NULL,
    cancel_at_period_end boolean DEFAULT false,
    cancelled_at timestamp with time zone,
    gateway character varying(50),
    gateway_subscription_id character varying(255),
    gateway_customer_id character varying(255),
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_subscriptions_billing_cycle_check CHECK (((billing_cycle)::text = ANY ((ARRAY['monthly'::character varying, 'yearly'::character varying])::text[]))),
    CONSTRAINT user_subscriptions_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'cancelled'::character varying, 'expired'::character varying, 'past_due'::character varying, 'trialing'::character varying])::text[])))
);


ALTER TABLE public.user_subscriptions OWNER TO fremio_user;

--
-- Name: users; Type: TABLE; Schema: public; Owner: fremio_user
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    display_name character varying(100),
    photo_url text,
    role character varying(20) DEFAULT 'user'::character varying,
    is_active boolean DEFAULT true,
    email_verified boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['user'::character varying, 'admin'::character varying, 'kreator'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO fremio_user;

--
-- Name: active_subscribers; Type: VIEW; Schema: public; Owner: fremio_user
--

CREATE VIEW public.active_subscribers AS
 SELECT u.id AS user_id,
    u.email,
    u.display_name,
    s.plan_id,
    p.name AS plan_name,
    p.price_monthly,
    s.status,
    s.billing_cycle,
    s.current_period_start,
    s.current_period_end,
    s.gateway
   FROM ((public.users u
     JOIN public.user_subscriptions s ON ((u.id = s.user_id)))
     JOIN public.subscription_plans p ON (((s.plan_id)::text = (p.id)::text)))
  WHERE (((s.status)::text = ANY ((ARRAY['active'::character varying, 'trialing'::character varying])::text[])) AND (s.current_period_end > now()));


ALTER VIEW public.active_subscribers OWNER TO fremio_user;

--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: fremio_user
--

CREATE TABLE public.audit_log (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    action character varying(100) NOT NULL,
    table_name character varying(100),
    record_id character varying(255),
    old_values jsonb,
    new_values jsonb,
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.audit_log OWNER TO fremio_user;

--
-- Name: contact_messages; Type: TABLE; Schema: public; Owner: fremio_user
--

CREATE TABLE public.contact_messages (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    subject character varying(255),
    message text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.contact_messages OWNER TO fremio_user;

--
-- Name: daily_stats; Type: TABLE; Schema: public; Owner: fremio_user
--

CREATE TABLE public.daily_stats (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    stat_date date NOT NULL,
    new_users integer DEFAULT 0,
    active_users integer DEFAULT 0,
    returning_users integer DEFAULT 0,
    total_sessions integer DEFAULT 0,
    unique_visitors integer DEFAULT 0,
    total_page_views integer DEFAULT 0,
    avg_session_duration integer DEFAULT 0,
    bounce_rate numeric(5,2) DEFAULT 0,
    total_downloads integer DEFAULT 0,
    unique_downloaders integer DEFAULT 0,
    new_subscriptions integer DEFAULT 0,
    cancelled_subscriptions integer DEFAULT 0,
    total_revenue numeric(12,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.daily_stats OWNER TO fremio_user;

--
-- Name: download_logs; Type: TABLE; Schema: public; Owner: fremio_user
--

CREATE TABLE public.download_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    session_id character varying(100),
    frame_id character varying(100),
    frame_name character varying(255),
    file_format character varying(20),
    file_size_kb integer,
    download_source character varying(50),
    user_plan character varying(50),
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.download_logs OWNER TO fremio_user;

--
-- Name: drafts; Type: TABLE; Schema: public; Owner: fremio_user
--

CREATE TABLE public.drafts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    name character varying(255) DEFAULT 'Untitled'::character varying,
    elements jsonb DEFAULT '[]'::jsonb,
    settings jsonb DEFAULT '{}'::jsonb,
    thumbnail_path text,
    status character varying(20) DEFAULT 'draft'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT drafts_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'completed'::character varying, 'archived'::character varying])::text[])))
);


ALTER TABLE public.drafts OWNER TO fremio_user;

--
-- Name: frames; Type: TABLE; Schema: public; Owner: fremio_user
--

CREATE TABLE public.frames (
    id character varying(100) NOT NULL,
    name character varying(255) NOT NULL,
    description text DEFAULT ''::text,
    category character varying(50) DEFAULT 'custom'::character varying,
    image_path text NOT NULL,
    thumbnail_path text,
    slots jsonb DEFAULT '[]'::jsonb,
    max_captures integer DEFAULT 1,
    is_premium boolean DEFAULT false,
    required_plan character varying(50) DEFAULT 'free'::character varying,
    is_active boolean DEFAULT true,
    view_count integer DEFAULT 0,
    download_count integer DEFAULT 0,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    layout jsonb DEFAULT '{}'::jsonb,
    canvas_background character varying(50) DEFAULT '#ffffff'::character varying,
    canvas_width integer DEFAULT 1080,
    canvas_height integer DEFAULT 1920,
    display_order integer DEFAULT 999
);


ALTER TABLE public.frames OWNER TO fremio_user;

--
-- Name: page_views; Type: TABLE; Schema: public; Owner: fremio_user
--

CREATE TABLE public.page_views (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    session_id character varying(100) NOT NULL,
    user_id uuid,
    page_path character varying(500) NOT NULL,
    page_title character varying(255),
    referrer text,
    device_type character varying(20),
    browser character varying(50),
    browser_version character varying(20),
    os character varying(50),
    os_version character varying(20),
    screen_width integer,
    screen_height integer,
    country character varying(100),
    city character varying(100),
    ip_address inet,
    time_on_page integer,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.page_views OWNER TO fremio_user;

--
-- Name: payment_transactions; Type: TABLE; Schema: public; Owner: fremio_user
--

CREATE TABLE public.payment_transactions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    subscription_id uuid,
    transaction_type character varying(20) NOT NULL,
    amount numeric(12,2) NOT NULL,
    currency character varying(3) DEFAULT 'IDR'::character varying,
    status character varying(20) DEFAULT 'pending'::character varying,
    gateway character varying(50) NOT NULL,
    gateway_transaction_id character varying(255),
    gateway_response jsonb,
    invoice_number character varying(50),
    invoice_url text,
    receipt_url text,
    payment_method character varying(50),
    payment_method_details jsonb,
    paid_at timestamp with time zone,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT payment_transactions_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying, 'refunded'::character varying, 'expired'::character varying])::text[]))),
    CONSTRAINT payment_transactions_transaction_type_check CHECK (((transaction_type)::text = ANY ((ARRAY['subscription'::character varying, 'one_time'::character varying, 'refund'::character varying, 'credit'::character varying])::text[])))
);


ALTER TABLE public.payment_transactions OWNER TO fremio_user;

--
-- Name: revenue_summary; Type: VIEW; Schema: public; Owner: fremio_user
--

CREATE VIEW public.revenue_summary AS
 SELECT date_trunc('month'::text, pt.paid_at) AS month,
    count(*) AS transaction_count,
    sum(pt.amount) AS total_revenue,
    pt.gateway,
    ( SELECT sp.name
           FROM (public.subscription_plans sp
             JOIN public.user_subscriptions us ON (((sp.id)::text = (us.plan_id)::text)))
          WHERE (us.id = pt.subscription_id)
         LIMIT 1) AS plan_name
   FROM public.payment_transactions pt
  WHERE ((pt.status)::text = 'completed'::text)
  GROUP BY (date_trunc('month'::text, pt.paid_at)), pt.gateway, pt.subscription_id
  ORDER BY (date_trunc('month'::text, pt.paid_at)) DESC;


ALTER VIEW public.revenue_summary OWNER TO fremio_user;

--
-- Name: user_cohorts; Type: TABLE; Schema: public; Owner: fremio_user
--

CREATE TABLE public.user_cohorts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    cohort_date date NOT NULL,
    cohort_type character varying(20) DEFAULT 'weekly'::character varying,
    day_0_active boolean DEFAULT true,
    day_1_active boolean DEFAULT false,
    day_7_active boolean DEFAULT false,
    day_14_active boolean DEFAULT false,
    day_30_active boolean DEFAULT false,
    day_60_active boolean DEFAULT false,
    day_90_active boolean DEFAULT false,
    activated boolean DEFAULT false,
    activation_date timestamp with time zone,
    last_active_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.user_cohorts OWNER TO fremio_user;

--
-- Name: user_events; Type: TABLE; Schema: public; Owner: fremio_user
--

CREATE TABLE public.user_events (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    session_id character varying(100),
    user_id uuid,
    event_name character varying(100) NOT NULL,
    event_category character varying(50),
    event_data jsonb DEFAULT '{}'::jsonb,
    page_path character varying(500),
    element_id character varying(100),
    element_class character varying(255),
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.user_events OWNER TO fremio_user;

--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: fremio_user
--

CREATE TABLE public.user_sessions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    session_id character varying(100) NOT NULL,
    user_id uuid,
    started_at timestamp with time zone DEFAULT now(),
    ended_at timestamp with time zone,
    duration_seconds integer,
    page_count integer DEFAULT 0,
    entry_page character varying(500),
    exit_page character varying(500),
    utm_source character varying(100),
    utm_medium character varying(100),
    utm_campaign character varying(100),
    referrer_domain character varying(255),
    device_type character varying(20),
    browser character varying(50),
    os character varying(50),
    country character varying(100),
    is_bounce boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.user_sessions OWNER TO fremio_user;

--
-- Name: user_usage; Type: TABLE; Schema: public; Owner: fremio_user
--

CREATE TABLE public.user_usage (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    downloads_count integer DEFAULT 0,
    frames_created integer DEFAULT 0,
    storage_used_mb numeric(10,2) DEFAULT 0,
    api_calls integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.user_usage OWNER TO fremio_user;

--
-- Data for Name: audit_log; Type: TABLE DATA; Schema: public; Owner: fremio_user
--

COPY public.audit_log (id, user_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent, created_at) FROM stdin;
\.


--
-- Data for Name: contact_messages; Type: TABLE DATA; Schema: public; Owner: fremio_user
--

COPY public.contact_messages (id, name, email, subject, message, is_read, created_at) FROM stdin;
\.


--
-- Data for Name: daily_stats; Type: TABLE DATA; Schema: public; Owner: fremio_user
--

COPY public.daily_stats (id, stat_date, new_users, active_users, returning_users, total_sessions, unique_visitors, total_page_views, avg_session_duration, bounce_rate, total_downloads, unique_downloaders, new_subscriptions, cancelled_subscriptions, total_revenue, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: download_logs; Type: TABLE DATA; Schema: public; Owner: fremio_user
--

COPY public.download_logs (id, user_id, session_id, frame_id, frame_name, file_format, file_size_kb, download_source, user_plan, created_at) FROM stdin;
\.


--
-- Data for Name: drafts; Type: TABLE DATA; Schema: public; Owner: fremio_user
--

COPY public.drafts (id, user_id, name, elements, settings, thumbnail_path, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: frames; Type: TABLE DATA; Schema: public; Owner: fremio_user
--

COPY public.frames (id, name, description, category, image_path, thumbnail_path, slots, max_captures, is_premium, required_plan, is_active, view_count, download_count, created_by, created_at, updated_at, layout, canvas_background, canvas_width, canvas_height, display_order) FROM stdin;
frame_1764844997245_xttj0oy0p	YIPIE	Warna pastel dan karakter mata lucu yang memberi kesan hangat dan friendly. Cocok untuk acara keluarga atau brand youthful.	Fremio Series	/uploads/frames/597ea428-be6d-4130-94ef-1b656c3f8d78.webp	\N	[{"id": "0b2fc7d3-78c0-4a8e-8055-25a8bb6e5d34", "top": 0.0375, "left": 0.05277777777777778, "width": 0.42777777777777776, "height": 0.28541666666666665, "zIndex": 1, "photoIndex": 0, "borderRadius": 0}, {"id": "4201360d-a724-48f8-90a7-0733143bc6ac", "top": 0.03958333333333333, "left": 0.5194444444444445, "width": 0.42777777777777776, "height": 0.28541666666666665, "zIndex": 1, "photoIndex": 1, "borderRadius": 0}, {"id": "126fd09f-9d57-4a1f-b8df-a98a2fd22439", "top": 0.33125, "left": 0.04537037037037037, "width": 0.45, "height": 0.35625, "zIndex": 1, "photoIndex": 2, "borderRadius": 0}, {"id": "3f29703b-7eba-4035-ad6c-639206c13bd5", "top": 0.32916666666666666, "left": 0.5157407407407407, "width": 0.45, "height": 0.35625, "zIndex": 1, "photoIndex": 3, "borderRadius": 0}]	4	f	free	t	0	0	6c249429-4c20-4516-8d62-385986482709	2025-12-04 17:43:17.266206+07	2025-12-05 02:10:38.067271+07	{"elements": [{"x": 0, "y": 0, "id": "upload_1764844964495_xfy2o4p0e", "data": {"image": "https://ik.imagekit.io/y6rewkryo/frame-overlays/1764844994330_tss3ic_overlay_upload_1_png.jpg", "label": "Unggahan", "objectFit": "contain", "__isOverlay": true, "borderRadius": 0, "imageAspectRatio": 0.5625}, "type": "upload", "width": 1080, "xNorm": 0, "yNorm": 0, "height": 1920, "locked": false, "zIndex": 500, "widthNorm": 1, "heightNorm": 1}], "aspectRatio": "9:16", "orientation": "portrait", "backgroundColor": "#000000"}	#ffffff	1080	1920	8
frame_1764843166485_lrxjrz5zz	Cek 6		Fremio Series	/uploads/frames/adf9ffd1-9404-4163-8cb0-062da3a145e9.webp	\N	[{"id": "7eef6e5a-b5c6-43db-bf61-69128d05687b", "top": 0.07291666666666667, "left": 0.06018518518518518, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 0, "borderRadius": 54}, {"id": "36d4b5ed-d91c-4c09-916c-85c20c4fae3e", "top": 0.07291666666666667, "left": 0.5138888888888888, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 1, "borderRadius": 54}, {"id": "87540a49-f84f-4c51-b689-d564ac003d73", "top": 0.3625, "left": 0.06018518518518518, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 2, "borderRadius": 54}, {"id": "a31c7b6b-acff-47c3-a390-6eeebe21c268", "top": 0.3625, "left": 0.5138888888888888, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 3, "borderRadius": 54}, {"id": "90691d20-94b8-49dd-a109-a81a0fed380b", "top": 0.6520833333333333, "left": 0.06018518518518518, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 4, "borderRadius": 54}, {"id": "2327283e-0a3e-4061-a03a-999555f4d2ef", "top": 0.6520833333333333, "left": 0.5138888888888888, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 5, "borderRadius": 54}]	6	f	free	f	0	0	6c249429-4c20-4516-8d62-385986482709	2025-12-04 17:12:46.493706+07	2025-12-04 17:39:19.437073+07	{"elements": [{"x": 0, "y": 0, "id": "upload_1764843158443_ci1cjo2p9", "data": {"image": "https://ik.imagekit.io/y6rewkryo/frame-overlays/1764843163449_etcud9_overlay_upload_1_png.jpg", "label": "Unggahan", "objectFit": "contain", "__isOverlay": true, "borderRadius": 0, "imageAspectRatio": 0.5625}, "type": "upload", "width": 1077, "xNorm": 0, "yNorm": 0, "height": 1915, "locked": false, "zIndex": 500, "widthNorm": 0.9972222222222222, "heightNorm": 0.9973958333333334}], "aspectRatio": "9:16", "orientation": "portrait", "backgroundColor": "#f7f1ed"}	#ffffff	1080	1920	999
frame_1764846262052_nft9zi2r8	Vintage Candy Booth	Nuansa retro pastel ala photobooth klasik yang hangat dan nostalgic.	Fremio Series	/uploads/frames/b2c45556-56cf-4a81-88f9-973897572b66.webp	\N	[{"id": "f39e99a1-5b24-4ce2-b476-1d114ca01b93", "top": 0.075, "left": 0.03796296296296296, "width": 0.43148148148148147, "height": 0.25416666666666665, "zIndex": 1, "photoIndex": 0, "borderRadius": 0}, {"id": "1e45b8d0-0de3-4d85-93e7-1adf322c222a", "top": 0.075, "left": 0.5305555555555556, "width": 0.43148148148148147, "height": 0.25416666666666665, "zIndex": 1, "photoIndex": 1, "borderRadius": 0}, {"id": "73987fd8-43ba-40c1-8588-abe03ee87cff", "top": 0.35833333333333334, "left": 0.03796296296296296, "width": 0.43148148148148147, "height": 0.25416666666666665, "zIndex": 1, "photoIndex": 2, "borderRadius": 0}, {"id": "55eedf18-0165-4727-8e37-c452e70e04b1", "top": 0.36041666666666666, "left": 0.5268518518518519, "width": 0.43148148148148147, "height": 0.25416666666666665, "zIndex": 1, "photoIndex": 3, "borderRadius": 0}, {"id": "7f42a454-b350-46f8-9243-66a75f8d237f", "top": 0.6291666666666667, "left": 0.041666666666666664, "width": 0.43148148148148147, "height": 0.25416666666666665, "zIndex": 1, "photoIndex": 4, "borderRadius": 0}, {"id": "9f579a31-ba7d-4109-8c35-9aeba2ca9be8", "top": 0.63125, "left": 0.5268518518518519, "width": 0.43148148148148147, "height": 0.25416666666666665, "zIndex": 1, "photoIndex": 5, "borderRadius": 0}]	6	f	free	t	0	0	6c249429-4c20-4516-8d62-385986482709	2025-12-04 18:04:22.068261+07	2025-12-05 02:10:38.062623+07	{"elements": [{"x": 0, "y": 0, "id": "upload_1764846239176_jdc4cikvj", "data": {"image": "https://ik.imagekit.io/y6rewkryo/frame-overlays/1764846258808_3drogl_overlay_upload_1_png.jpg", "label": "Unggahan", "objectFit": "contain", "__isOverlay": true, "borderRadius": 0, "imageAspectRatio": 0.5625}, "type": "upload", "width": 1080, "xNorm": 0, "yNorm": 0, "height": 1920, "locked": false, "zIndex": 500, "widthNorm": 1, "heightNorm": 1}], "aspectRatio": "9:16", "orientation": "portrait", "backgroundColor": "#f7f1ed"}	#ffffff	1080	1920	1
frame_1764839073043_kiuyahj17	tes 2		Fremio Series	/uploads/frames/00881b27-140e-45bb-969e-6746af025291.webp	\N	[{"id": "el-1764839057422-h7alhp", "top": 0.07291666666666667, "left": 0.06018518518518518, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 0, "borderRadius": 54}, {"id": "el-1764839057423-jybujs", "top": 0.07291666666666667, "left": 0.5138888888888888, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 1, "borderRadius": 54}, {"id": "el-1764839057423-4z7vcj", "top": 0.3625, "left": 0.06018518518518518, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 2, "borderRadius": 54}, {"id": "el-1764839057423-wtqico", "top": 0.3625, "left": 0.5138888888888888, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 3, "borderRadius": 54}, {"id": "el-1764839057423-085682", "top": 0.6520833333333333, "left": 0.06018518518518518, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 4, "borderRadius": 54}, {"id": "el-1764839057423-81b6l5", "top": 0.6520833333333333, "left": 0.5138888888888888, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 5, "borderRadius": 54}]	6	f	free	f	2	0	6c249429-4c20-4516-8d62-385986482709	2025-12-04 16:04:33.051674+07	2025-12-04 16:05:33.168904+07	{"elements": [{"x": 0, "y": 0, "id": "upload_1764839061145_awci43ot5", "data": {"image": "https://ik.imagekit.io/y6rewkryo/frame-overlays/1764839070034_xms7j4_overlay_upload_1_png.jpg", "label": "Unggahan", "objectFit": "contain", "borderRadius": 0, "imageAspectRatio": 0.5625}, "type": "upload", "width": 1077, "xNorm": 0, "yNorm": 0, "height": 1915, "locked": false, "zIndex": 2, "widthNorm": 0.9972222222222222, "heightNorm": 0.9973958333333334}], "aspectRatio": "9:16", "orientation": "portrait", "backgroundColor": "#f7f1ed"}	#ffffff	1080	1920	999
frame_1764875584567_053l45x0r	Inspired by Hindia – “Lagipula Hidup Akan Berakhir”	Frame ini mengambil inspirasi dari album Lagipula Hidup Akan Berakhir, menggunakan elemen cahaya minimalis, atmosfer tenang, dan palet warna malam yang redup. Kesan hening dan kontemplatif menjadi fokus utama. Template ini dapat digunakan tanpa biaya tambahan.	Music	/uploads/frames/7ded030e-0883-46b5-adef-206bada5c418.webp	\N	[{"id": "ad6e5489-a426-4053-9f98-f62f54f7f987", "top": 0.1354166587193807, "left": 0.04537037037037037, "width": 0.4203703703703704, "height": 0.23333333333333334, "zIndex": 1, "photoIndex": 0, "borderRadius": 0}, {"id": "5d9a8938-9640-401a-b9ff-64b3d4cdbf44", "top": 0.1354166587193807, "left": 0.5305555555555556, "width": 0.4203703703703704, "height": 0.23333333333333334, "zIndex": 1, "photoIndex": 1, "borderRadius": 0}, {"id": "e8d448da-f9cf-4843-a7b7-cb20b808aed6", "top": 0.399999992052714, "left": 0.049074074074074076, "width": 0.4203703703703704, "height": 0.23333333333333334, "zIndex": 1, "photoIndex": 2, "borderRadius": 0}, {"id": "26b3784b-ba67-4ddf-9fb0-4336b230b5e8", "top": 0.3979166587193807, "left": 0.5342592592592592, "width": 0.4203703703703704, "height": 0.23333333333333334, "zIndex": 1, "photoIndex": 3, "borderRadius": 0}, {"id": "07e99a5a-691e-4139-a351-23abc7d32ce1", "top": 0.6645833253860474, "left": 0.041666666666666664, "width": 0.4203703703703704, "height": 0.23333333333333334, "zIndex": 1, "photoIndex": 4, "borderRadius": 0}, {"id": "2f007533-0e63-470f-be96-19cb8ee79d84", "top": 0.662499992052714, "left": 0.5342592592592592, "width": 0.4203703703703704, "height": 0.23333333333333334, "zIndex": 1, "photoIndex": 5, "borderRadius": 0}]	6	f	free	t	0	0	6c249429-4c20-4516-8d62-385986482709	2025-12-05 02:13:04.609521+07	2025-12-05 02:13:04.609521+07	{"elements": [{"x": 0.0000457763671875, "y": 0, "id": "upload_1764875553601_0ppfofy2j", "data": {"image": "https://ik.imagekit.io/y6rewkryo/frame-overlays/1764875580814_67sb6j_overlay_upload_1_png.jpg", "label": "Unggahan", "objectFit": "contain", "__isOverlay": true, "borderRadius": 0, "imageAspectRatio": 0.5625}, "type": "upload", "width": 1080, "xNorm": 0.00000004238552517361111, "yNorm": 0, "height": 1920, "locked": false, "zIndex": 500, "widthNorm": 1, "heightNorm": 1}], "aspectRatio": "9:16", "orientation": "portrait", "backgroundColor": "#f7f1ed"}	#ffffff	1080	1920	999
frame_1764845475974_eaw7jkybw	Minimal Red – Strike a Pose	Desain merah minimalis dan modern, cocok untuk foto bergaya elegan.	Fremio Series	/uploads/frames/bd722663-417e-4a40-96ad-a5d9e3eb7024.webp	\N	[{"id": "94dd1297-9713-4b85-9c9d-92c2da0c93aa", "top": 0.00625, "left": 0, "width": 0.37962962962962965, "height": 0.20208333333333334, "zIndex": 1, "photoIndex": 0, "borderRadius": 0}, {"id": "762498d5-c231-4472-8dc5-7c85413ea7db", "top": 0.00625, "left": 0.4962962962962963, "width": 0.37962962962962965, "height": 0.20208333333333334, "zIndex": 1, "photoIndex": 1, "borderRadius": 0}, {"id": "2ab2b1aa-a043-4378-b1e4-4ad709f0208d", "top": 0.2125, "left": 0, "width": 0.37962962962962965, "height": 0.19583333333333333, "zIndex": 1, "photoIndex": 2, "borderRadius": 0}, {"id": "25e68944-60a1-436c-bc4a-1282f296e3c4", "top": 0.2125, "left": 0.49629625391077115, "width": 0.37962962962962965, "height": 0.19583333333333333, "zIndex": 1, "photoIndex": 3, "borderRadius": 0}, {"id": "7787ef7c-7346-4ae8-872e-e4a96e49b101", "top": 0.41458333333333336, "left": 0, "width": 0.37962962962962965, "height": 0.19791666666666666, "zIndex": 1, "photoIndex": 4, "borderRadius": 0}, {"id": "391c02a3-e85f-40c4-9670-ee2c7a92c0c0", "top": 0.41458333333333336, "left": 0.5, "width": 0.37962962962962965, "height": 0.19791666666666666, "zIndex": 1, "photoIndex": 5, "borderRadius": 0}, {"id": "3461660a-631d-4449-8321-53120e5db845", "top": 0.6166666666666667, "left": 0, "width": 0.37962962962962965, "height": 0.19791666666666666, "zIndex": 1, "photoIndex": 6, "borderRadius": 0}, {"id": "29556373-4b2c-4d18-bdd0-091400776d1d", "top": 0.6166666666666667, "left": 0.5, "width": 0.37962962962962965, "height": 0.19791666666666666, "zIndex": 1, "photoIndex": 7, "borderRadius": 0}, {"id": "56d5d45a-c8c6-4035-bc69-5c202cb7aa93", "top": 0.81875, "left": 0, "width": 0.37962962962962965, "height": 0.175, "zIndex": 1, "photoIndex": 8, "borderRadius": 0}, {"id": "fced2d8f-ea3d-4f53-8dd4-267eeebce7d8", "top": 0.81875, "left": 0.5, "width": 0.37962962962962965, "height": 0.175, "zIndex": 1, "photoIndex": 9, "borderRadius": 0}]	10	f	free	t	0	0	6c249429-4c20-4516-8d62-385986482709	2025-12-04 17:51:16.002955+07	2025-12-05 02:10:38.068862+07	{"elements": [{"x": 0, "y": 0, "id": "upload_1764845426088_npo83lt9o", "data": {"image": "https://ik.imagekit.io/y6rewkryo/frame-overlays/1764845473358_qzcea7_overlay_upload_1_png.jpg", "label": "Unggahan", "objectFit": "contain", "__isOverlay": true, "borderRadius": 0, "imageAspectRatio": 0.5625}, "type": "upload", "width": 1080, "xNorm": 0, "yNorm": 0, "height": 1920, "locked": false, "zIndex": 500, "widthNorm": 1, "heightNorm": 1}], "aspectRatio": "9:16", "orientation": "portrait", "backgroundColor": "#000000"}	#ffffff	1080	1920	6
frame_1764845592850_qeae9p1tf	Pixel Fun Adventure	Tema pixel-art playful yang cocok untuk gamer dan event pop culture.	Fremio Series	/uploads/frames/e8412305-f33a-4a27-a1b9-d1c4c13704bc.webp	\N	[{"id": "39d5f5ee-0eee-48fe-8a8f-14247e30c610", "top": 0.039583335320154824, "left": 0.0453703138563368, "width": 0.4425925925925926, "height": 0.24791666666666667, "zIndex": 1, "photoIndex": 0, "borderRadius": 0}, {"id": "833e9f9d-568c-48d7-8594-763e24b87b98", "top": 0.041666668653488156, "left": 0.5194443879304109, "width": 0.4425925925925926, "height": 0.24791666666666667, "zIndex": 1, "photoIndex": 1, "borderRadius": 0}, {"id": "5ad51bca-4cdc-4329-8491-42f6e263a237", "top": 0.29166666852931183, "left": 0.04166659955625181, "width": 0.4425925925925926, "height": 0.275, "zIndex": 1, "photoIndex": 2, "borderRadius": 0}, {"id": "1909062e-ff6b-4f62-90eb-58113f6fb8bc", "top": 0.29375000186264516, "left": 0.5194443773340296, "width": 0.4425925925925926, "height": 0.275, "zIndex": 1, "photoIndex": 3, "borderRadius": 0}, {"id": "573502a7-1361-42b0-8946-0a54de1beb51", "top": 0.5729166685293118, "left": 0.04907400696365922, "width": 0.4425925925925926, "height": 0.275, "zIndex": 1, "photoIndex": 4, "borderRadius": 0}, {"id": "02ad194d-b29e-4ebb-8a97-6411cf9d4793", "top": 0.5708333351959785, "left": 0.5194443773340296, "width": 0.4425925925925926, "height": 0.275, "zIndex": 1, "photoIndex": 5, "borderRadius": 0}]	6	f	free	t	0	0	6c249429-4c20-4516-8d62-385986482709	2025-12-04 17:53:12.871763+07	2025-12-05 02:10:38.072696+07	{"elements": [{"x": 0.00002288818359375, "y": -0.0000057220458984375, "id": "upload_1764845562634_y65e7jy1j", "data": {"image": "https://ik.imagekit.io/y6rewkryo/frame-overlays/1764845590224_0c4f0k_overlay_upload_1_png.jpg", "label": "Unggahan", "objectFit": "contain", "__isOverlay": true, "borderRadius": 0, "imageAspectRatio": 0.5625}, "type": "upload", "width": 1080, "xNorm": 0.000000021192762586805556, "yNorm": -0.0000000029802322387695314, "height": 1920, "locked": false, "zIndex": 500, "widthNorm": 1, "heightNorm": 1}], "aspectRatio": "9:16", "orientation": "portrait", "backgroundColor": "#000000"}	#ffffff	1080	1920	5
frame_1764875728519_km4yfzmpe	Inspired by .Feast – “Membangun & Menghancurkan”	Frame ini terinspirasi dari energi album .Feast, menonjolkan elemen dramatis, garis tegas, serta warna gelap dengan aksen kontras untuk menghadirkan suasana intens dan penuh ketegangan. Template ini dapat digunakan tanpa biaya tambahan.	Music	/uploads/frames/fa51b7d0-3e3e-43e7-98db-bedc90a4e423.webp	\N	[{"id": "3a050f65-4245-4b11-9f9a-38fe4e4e783b", "top": 0.15000000794728596, "left": 0.041666666666666664, "width": 0.4166666666666667, "height": 0.225, "zIndex": 1, "photoIndex": 0, "borderRadius": 0}, {"id": "9eb419e3-5b08-487e-9ac4-11c6125cd482", "top": 0.14791667461395264, "left": 0.5416666666666666, "width": 0.4166666666666667, "height": 0.225, "zIndex": 1, "photoIndex": 1, "borderRadius": 0}, {"id": "b22bb461-6a48-41c2-8c92-eef4b07b0a6c", "top": 0.41041667461395265, "left": 0.041666666666666664, "width": 0.4166666666666667, "height": 0.225, "zIndex": 1, "photoIndex": 2, "borderRadius": 0}, {"id": "e965af30-90ce-4928-84da-d257b8f53925", "top": 0.4083333412806193, "left": 0.537962962962963, "width": 0.4166666666666667, "height": 0.225, "zIndex": 1, "photoIndex": 3, "borderRadius": 0}, {"id": "918d4c65-fde2-4047-b2fb-e0e7d2bd7e06", "top": 0.6666666746139527, "left": 0.049074074074074076, "width": 0.4166666666666667, "height": 0.225, "zIndex": 1, "photoIndex": 4, "borderRadius": 0}, {"id": "e1acc4bc-bc4d-40cb-996e-3677a29b3cf0", "top": 0.6625000079472859, "left": 0.537962962962963, "width": 0.4166666666666667, "height": 0.225, "zIndex": 1, "photoIndex": 5, "borderRadius": 0}]	6	f	free	t	2	0	6c249429-4c20-4516-8d62-385986482709	2025-12-05 02:15:28.536589+07	2025-12-05 02:15:40.132745+07	{"elements": [{"x": 0.0000457763671875, "y": 0, "id": "upload_1764875698030_0zbd6kq5r", "data": {"image": "https://ik.imagekit.io/y6rewkryo/frame-overlays/1764875725077_rm8cvl_overlay_upload_1_png.jpg", "label": "Unggahan", "objectFit": "contain", "__isOverlay": true, "borderRadius": 0, "imageAspectRatio": 0.5625}, "type": "upload", "width": 1080, "xNorm": 0.00000004238552517361111, "yNorm": 0, "height": 1920, "locked": false, "zIndex": 500, "widthNorm": 1, "heightNorm": 1}], "aspectRatio": "9:16", "orientation": "portrait", "backgroundColor": "#f7f1ed"}	#ffffff	1080	1920	999
frame_1764752547621_zfgszprkj	tes 2		Fremio Series	/uploads/frames/e14921df-9c16-492e-a55c-dae6bc7cb7b9.webp	\N	[{"id": "2add4fdb-4d70-4ef1-ab42-721bf39138d1", "top": 0.016666666666666666, "left": 0.049074074074074076, "width": 0.4444444444444444, "height": 0.3109375, "zIndex": 1, "photoIndex": 0, "borderRadius": 0}, {"id": "a5e18696-1645-4c79-87ae-0d29386e0a66", "top": 0.016666666666666666, "left": 0.5268518518518519, "width": 0.4444444444444444, "height": 0.3109375, "zIndex": 1, "photoIndex": 1, "borderRadius": 0}, {"id": "85aa9030-016e-4c9d-8006-5ca389d556cb", "top": 0.33125, "left": 0.049074074074074076, "width": 0.4444444444444444, "height": 0.35885416666666664, "zIndex": 1, "photoIndex": 2, "borderRadius": 0}, {"id": "4e299cbb-66d4-42b7-a41b-bdb47cfc42e3", "top": 0.33125, "left": 0.5268518518518519, "width": 0.4444444444444444, "height": 0.35885416666666664, "zIndex": 1, "photoIndex": 3, "borderRadius": 0}]	4	f	free	f	8	0	6c249429-4c20-4516-8d62-385986482709	2025-12-03 16:02:27.636224+07	2025-12-04 14:48:25.284228+07	{}	#ffffff	1080	1920	999
frame_1764834498424_ktzd5sbt5	tes 3		Fremio Series	/uploads/frames/04e989b1-2d1d-4746-8a6b-8811e869a732.webp	\N	[{"id": "e41eb117-06c8-4390-a7a5-bfc9094b2a1b", "top": 0.07291666666666667, "left": 0.06018518518518518, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 0, "borderRadius": 54}, {"id": "8e17a28c-eef1-442a-a122-dd1f3791c2bd", "top": 0.07291666666666667, "left": 0.5138888888888888, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 1, "borderRadius": 54}, {"id": "a043e878-d22e-476b-9afd-b7529d11d61f", "top": 0.3625, "left": 0.06018518518518518, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 2, "borderRadius": 54}, {"id": "019e6997-0e84-495f-8bee-7a4ce2fd2e38", "top": 0.3625, "left": 0.5138888888888888, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 3, "borderRadius": 54}, {"id": "49550485-294f-474a-a48f-584696924c29", "top": 0.6520833333333333, "left": 0.06018518518518518, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 4, "borderRadius": 54}, {"id": "9211c401-abf5-4666-846f-c54fb0277500", "top": 0.6520833333333333, "left": 0.5138888888888888, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 5, "borderRadius": 54}]	6	f	free	f	4	0	6c249429-4c20-4516-8d62-385986482709	2025-12-04 14:48:18.431831+07	2025-12-04 14:54:29.034496+07	{}	#ffffff	1080	1920	999
frame_1764843734460_htozlj5k9	Smile & Celebrate	Tema ceria dengan elemen ilustrasi mata dan ledakan warna. Memberikan vibe fun, playful, dan penuh energi.	Fremio Series	/uploads/frames/4478e404-9350-432a-b739-6ca78d5e9657.webp	\N	[{"id": "aa9bd3e3-f2a6-4e57-ac88-0cfe1fd9023d", "top": 0.05, "left": 0.041666666666666664, "width": 0.45, "height": 0.24166666666666667, "zIndex": 1, "photoIndex": 0, "borderRadius": 0}, {"id": "bf016e63-c0d9-4b15-a349-e248f5826998", "top": 0.05, "left": 0.5157407407407407, "width": 0.45, "height": 0.24166666666666667, "zIndex": 1, "photoIndex": 1, "borderRadius": 0}, {"id": "1a9d5f4b-2abd-49f0-baed-63060c5619a1", "top": 0.29375, "left": 0.04537037037037037, "width": 0.45, "height": 0.27291666666666664, "zIndex": 1, "photoIndex": 2, "borderRadius": 0}, {"id": "7e8c9919-0039-4723-81b9-b007ad6416de", "top": 0.29375, "left": 0.5157407407407407, "width": 0.45, "height": 0.27291666666666664, "zIndex": 1, "photoIndex": 3, "borderRadius": 0}, {"id": "118fd8f5-e0f6-4531-b634-e935c2488f85", "top": 0.5708333333333333, "left": 0.04537037037037037, "width": 0.45, "height": 0.27291666666666664, "zIndex": 1, "photoIndex": 4, "borderRadius": 0}, {"id": "e250c643-42ef-4d5f-a04f-2b159b1f6f2c", "top": 0.5729166666666666, "left": 0.5046296296296297, "width": 0.45, "height": 0.27291666666666664, "zIndex": 1, "photoIndex": 5, "borderRadius": 0}]	6	f	free	t	6	0	6c249429-4c20-4516-8d62-385986482709	2025-12-04 17:22:14.47675+07	2025-12-05 02:10:38.070499+07	{"elements": [{"x": 0, "y": 0, "id": "upload_1764843720806_6i137m53h", "data": {"image": "https://ik.imagekit.io/y6rewkryo/frame-overlays/1764843731526_dcaags_overlay_upload_1_png.jpg", "label": "Unggahan", "objectFit": "contain", "__isOverlay": true, "borderRadius": 0, "imageAspectRatio": 0.5625}, "type": "upload", "width": 1080, "xNorm": 0, "yNorm": 0, "height": 1920, "locked": false, "zIndex": 500, "widthNorm": 1, "heightNorm": 1}], "aspectRatio": "9:16", "orientation": "portrait", "backgroundColor": "#000000"}	#ffffff	1080	1920	9
frame_1764841364670_kljvrija6	cek 2		Fremio Series	/uploads/frames/6bee7e07-0351-4f3c-8c85-4bb43b1eb184.webp	\N	[{"id": "4476864b-acef-4258-ba96-b86aebfe7368", "top": 0.07291666666666667, "left": 0.06018518518518518, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 0, "borderRadius": 54}, {"id": "67b31293-712b-4f97-bf27-0a11747e310a", "top": 0.07291666666666667, "left": 0.5138888888888888, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 1, "borderRadius": 54}, {"id": "791e4e26-1c0d-4734-aa89-b8254f32e7fd", "top": 0.3625, "left": 0.06018518518518518, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 2, "borderRadius": 54}, {"id": "174faf49-230c-4dd7-8854-c74ed0793228", "top": 0.3625, "left": 0.5138888888888888, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 3, "borderRadius": 54}, {"id": "ade2554d-96c4-49ca-9bd7-dcb58458a7de", "top": 0.6520833333333333, "left": 0.06018518518518518, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 4, "borderRadius": 54}, {"id": "75dde6e6-ab39-4785-b12d-74e2d52e2225", "top": 0.6520833333333333, "left": 0.5138888888888888, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 5, "borderRadius": 54}]	6	f	free	f	0	0	6c249429-4c20-4516-8d62-385986482709	2025-12-04 16:42:44.677521+07	2025-12-04 17:39:27.288461+07	{"elements": [{"x": 0, "y": 0, "id": "upload_1764841354953_te6wapbnp", "data": {"image": "https://ik.imagekit.io/y6rewkryo/frame-overlays/1764841361328_ervma7_overlay_upload_1_png.jpg", "label": "Unggahan", "objectFit": "contain", "__isOverlay": true, "borderRadius": 0, "imageAspectRatio": 0.5625}, "type": "upload", "width": 1077, "xNorm": 0, "yNorm": 0, "height": 1915, "locked": false, "zIndex": 500, "widthNorm": 0.9972222222222222, "heightNorm": 0.9973958333333334}], "aspectRatio": "9:16", "orientation": "portrait", "backgroundColor": "#f7f1ed"}	#ffffff	1080	1920	999
frame_1764841291770_hgt0g5yct	cek 1		Fremio Series	/uploads/frames/44503dbe-c79f-4448-a666-e526c45945d3.webp	\N	[{"id": "d180f604-bf60-4eea-9f8a-ae3d86e2d7d1", "top": 0.07291666666666667, "left": 0.06018518518518518, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 0, "borderRadius": 54}, {"id": "0161d80f-5eb7-464d-918d-a622ccfa2a2c", "top": 0.07291666666666667, "left": 0.5138888888888888, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 1, "borderRadius": 54}, {"id": "44045aa3-c09d-473b-892d-40b5e8cb4552", "top": 0.3625, "left": 0.06018518518518518, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 2, "borderRadius": 54}, {"id": "a68847d6-b024-4dd5-9e66-43423ac53e2f", "top": 0.3625, "left": 0.5138888888888888, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 3, "borderRadius": 54}, {"id": "e7e2336a-e937-41d8-b76d-99691adc4548", "top": 0.6520833333333333, "left": 0.06018518518518518, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 4, "borderRadius": 54}, {"id": "5d5e0995-2b5d-4aee-ae7b-93faddd86b98", "top": 0.6520833333333333, "left": 0.5138888888888888, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 5, "borderRadius": 54}]	6	f	free	f	0	0	6c249429-4c20-4516-8d62-385986482709	2025-12-04 16:41:31.778646+07	2025-12-04 17:39:30.084048+07	{"elements": [{"x": 0, "y": 0, "id": "upload_1764841281136_wi9vi3o9a", "data": {"image": "https://ik.imagekit.io/y6rewkryo/frame-overlays/1764841288548_s7b8x7_overlay_upload_1_png.jpg", "label": "Unggahan", "objectFit": "contain", "__isOverlay": true, "borderRadius": 0, "imageAspectRatio": 0.5625}, "type": "upload", "width": 1077, "xNorm": 0, "yNorm": 0, "height": 1915, "locked": false, "zIndex": 500, "widthNorm": 0.9972222222222222, "heightNorm": 0.9973958333333334}], "aspectRatio": "9:16", "orientation": "portrait", "backgroundColor": "#f7f1ed"}	#ffffff	1080	1920	999
frame_1764875824032_o82s0lstk	Inspired by Paul Partohap – “P.S. I LOVE YOU”	Frame ini mengambil inspirasi dari estetika romantis Paul Partohap, dengan elemen hangat, tipografi lembut, dan warna pastel yang menenangkan. Cocok untuk momen personal dan penuh kehangatan. Template ini dapat digunakan tanpa biaya tambahan.	Music	/uploads/frames/8dc0387d-aee4-4cb5-8e70-e0d97a0e5273.webp	\N	[{"id": "45e4f766-f93c-4a4d-b006-524f451391ec", "top": 0.09999999205271402, "left": 0.049074074074074076, "width": 0.4203703703703704, "height": 0.225, "zIndex": 1, "photoIndex": 0, "borderRadius": 0}, {"id": "80c858de-d0dc-43ba-9251-5fd1adb368c3", "top": 0.1041666587193807, "left": 0.5342592592592592, "width": 0.4203703703703704, "height": 0.225, "zIndex": 1, "photoIndex": 1, "borderRadius": 0}, {"id": "8809cfa7-87ce-4dfd-ba57-4a5b228e02e8", "top": 0.3458333253860474, "left": 0.049074074074074076, "width": 0.4203703703703704, "height": 0.225, "zIndex": 1, "photoIndex": 2, "borderRadius": 0}, {"id": "123aaa02-3eec-41a1-8b42-11c873c5e467", "top": 0.3458333253860474, "left": 0.537962962962963, "width": 0.4203703703703704, "height": 0.225, "zIndex": 1, "photoIndex": 3, "borderRadius": 0}, {"id": "08f8184b-adf2-4f70-a405-a443cd251656", "top": 0.5854166587193806, "left": 0.06388888888888888, "width": 0.4203703703703704, "height": 0.225, "zIndex": 1, "photoIndex": 4, "borderRadius": 0}, {"id": "b7aeeb28-608c-4d3d-85b9-cd04ab572638", "top": 0.581249992052714, "left": 0.537962962962963, "width": 0.4203703703703704, "height": 0.225, "zIndex": 1, "photoIndex": 5, "borderRadius": 0}]	6	f	free	t	0	0	6c249429-4c20-4516-8d62-385986482709	2025-12-05 02:17:04.047531+07	2025-12-05 02:17:04.047531+07	{"elements": [{"x": 0.0000457763671875, "y": 0, "id": "upload_1764875798668_qeg7dlaln", "data": {"image": "https://ik.imagekit.io/y6rewkryo/frame-overlays/1764875821361_eqdqd6_overlay_upload_1_png.jpg", "label": "Unggahan", "objectFit": "contain", "__isOverlay": true, "borderRadius": 0, "imageAspectRatio": 0.5625}, "type": "upload", "width": 1080, "xNorm": 0.00000004238552517361111, "yNorm": 0, "height": 1920, "locked": false, "zIndex": 500, "widthNorm": 1, "heightNorm": 1}], "aspectRatio": "9:16", "orientation": "portrait", "backgroundColor": "#000000"}	#ffffff	1080	1920	999
frame_1764871642733_itvbvht5d	Inspired by Hindia – “Menari dengan Bayangan”	Frame ini terinspirasi dari album Menari dengan Bayangan, dengan elemen visual bernuansa gelap, kontras tinggi, dan mood introspektif. Warna-warna lembut dan shadowed tone menonjolkan kesan reflektif. Template ini dapat digunakan tanpa biaya tambahan.	Music	/uploads/frames/88e9fef2-2261-4d93-9c3a-0cb874b27c01.webp	\N	[{"id": "f24174b9-19a8-41e6-b4be-5c2b74a426c4", "top": 0.11666666666666667, "left": 0.04537037037037037, "width": 0.4203703703703704, "height": 0.22708333333333333, "zIndex": 1, "photoIndex": 0, "borderRadius": 0}, {"id": "4b2014c3-e026-4cbc-b936-592e37e807f3", "top": 0.11666666666666667, "left": 0.5342592592592592, "width": 0.4203703703703704, "height": 0.22708333333333333, "zIndex": 1, "photoIndex": 1, "borderRadius": 0}, {"id": "7d56d1bb-2211-489f-a405-eb77b0566e3f", "top": 0.3770833333333333, "left": 0.041666666666666664, "width": 0.4203703703703704, "height": 0.22708333333333333, "zIndex": 1, "photoIndex": 2, "borderRadius": 0}, {"id": "2f8e1ac2-bfb3-4e9a-9003-c83460b89a65", "top": 0.3729166666666667, "left": 0.5342592592592592, "width": 0.4203703703703704, "height": 0.22708333333333333, "zIndex": 1, "photoIndex": 3, "borderRadius": 0}, {"id": "14138328-5ac2-4596-b25c-e172e0164755", "top": 0.6333333333333333, "left": 0.041666666666666664, "width": 0.4203703703703704, "height": 0.22708333333333333, "zIndex": 1, "photoIndex": 4, "borderRadius": 0}, {"id": "37dfa58d-852b-4b82-a5ba-66cecf1895b5", "top": 0.6375, "left": 0.5268518518518519, "width": 0.4203703703703704, "height": 0.22708333333333333, "zIndex": 1, "photoIndex": 5, "borderRadius": 0}]	6	f	free	t	2	0	6c249429-4c20-4516-8d62-385986482709	2025-12-05 01:07:22.767095+07	2025-12-05 02:10:38.066646+07	{"elements": [{"x": 0, "y": 0, "id": "upload_1764871617248_c5mj1qszj", "data": {"image": "https://ik.imagekit.io/y6rewkryo/frame-overlays/1764871638914_1ifdia_overlay_upload_1_png.jpg", "label": "Unggahan", "objectFit": "contain", "__isOverlay": true, "borderRadius": 0, "imageAspectRatio": 0.5625}, "type": "upload", "width": 1080, "xNorm": 0, "yNorm": 0, "height": 1920, "locked": false, "zIndex": 500, "widthNorm": 1, "heightNorm": 1}], "aspectRatio": "9:16", "orientation": "portrait", "backgroundColor": "#f7f1ed"}	#ffffff	1080	1920	10
frame_1764875900546_5q0iruy4z	Inspired by Sal Priadi – “Markers and Such Pens Flashdisks”	Frame ini terinspirasi dari gaya visual Sal Priadi yang raw dan personal, dengan sentuhan tekstur, kesederhanaan grafis, dan warna earthy yang lembut. Memunculkan kesan jujur dan apa adanya. Template ini dapat digunakan tanpa biaya tambahan.	Music	/uploads/frames/80270dd9-00ab-4fb1-87cb-c6a4d830fc78.webp	\N	[{"id": "235aca5b-1c5e-4473-aee7-de1cecb8a0d6", "top": 0.12083334724108379, "left": 0.05277777777777778, "width": 0.4166666666666667, "height": 0.23958333333333334, "zIndex": 1, "photoIndex": 0, "borderRadius": 0}, {"id": "723bbd5d-07d1-4f3b-97fb-21154a7642ca", "top": 0.12291668057441711, "left": 0.5453703703703704, "width": 0.4166666666666667, "height": 0.23958333333333334, "zIndex": 1, "photoIndex": 1, "borderRadius": 0}, {"id": "7ded05ff-06d3-4900-8533-cc2f4e3d3d43", "top": 0.3729166805744171, "left": 0.04537037037037037, "width": 0.4166666666666667, "height": 0.23958333333333334, "zIndex": 1, "photoIndex": 2, "borderRadius": 0}, {"id": "cd7e74fd-ee04-4a5a-b90c-e7ebba1f54b4", "top": 0.37500001390775045, "left": 0.5416666666666666, "width": 0.4166666666666667, "height": 0.23958333333333334, "zIndex": 1, "photoIndex": 3, "borderRadius": 0}, {"id": "3d0aa0be-c334-42aa-a1a5-1985bfa3bf7a", "top": 0.6208333472410837, "left": 0.05277777777777778, "width": 0.4166666666666667, "height": 0.23958333333333334, "zIndex": 1, "photoIndex": 4, "borderRadius": 0}, {"id": "978e0779-96b9-4b8f-a8fa-666b003c5472", "top": 0.6229166805744171, "left": 0.5453703703703704, "width": 0.4166666666666667, "height": 0.23958333333333334, "zIndex": 1, "photoIndex": 5, "borderRadius": 0}]	6	f	free	t	0	0	6c249429-4c20-4516-8d62-385986482709	2025-12-05 02:18:20.563542+07	2025-12-05 02:18:20.563542+07	{"elements": [{"x": 0.0000457763671875, "y": 0, "id": "upload_1764875869859_t44papk9c", "data": {"image": "https://ik.imagekit.io/y6rewkryo/frame-overlays/1764875895494_wzxcee_overlay_upload_1_png.jpg", "label": "Unggahan", "objectFit": "contain", "__isOverlay": true, "borderRadius": 0, "imageAspectRatio": 0.5625}, "type": "upload", "width": 1080, "xNorm": 0.00000004238552517361111, "yNorm": 0, "height": 1920, "locked": false, "zIndex": 500, "widthNorm": 1, "heightNorm": 1}], "aspectRatio": "9:16", "orientation": "portrait", "backgroundColor": "#f7f1ed"}	#ffffff	1080	1920	999
frame_1764846143644_u73oz69nj	Cherish Pink Elegance	Warna pink lembut yang manis dan elegan untuk momen spesial.	Fremio Series	/uploads/frames/736ca7ff-ca97-4a6e-8b6b-37fedc68db47.webp	\N	[{"id": "dcc3f476-3ccd-42a4-b621-c239e2c1832d", "top": 0.03125, "left": 0.041666666666666664, "width": 0.40925925925925927, "height": 0.26666666666666666, "zIndex": 1, "photoIndex": 0, "borderRadius": 0}, {"id": "9cd79b81-93c1-4d79-a92d-06cd1819c7ec", "top": 0.03125, "left": 0.5675925925925925, "width": 0.40925925925925927, "height": 0.26666666666666666, "zIndex": 1, "photoIndex": 1, "borderRadius": 0}, {"id": "d6aac7a8-fc6f-4448-ad37-56c6caea6969", "top": 0.32083333333333336, "left": 0.03796296296296296, "width": 0.40925925925925927, "height": 0.24791666666666667, "zIndex": 1, "photoIndex": 2, "borderRadius": 0}, {"id": "988da163-b2b3-4f3b-8701-e88f575332b4", "top": 0.31875, "left": 0.5527777777777778, "width": 0.40925925925925927, "height": 0.24791666666666667, "zIndex": 1, "photoIndex": 3, "borderRadius": 0}, {"id": "5a4d81ca-f063-48cf-9095-044448816542", "top": 0.5833333333333334, "left": 0.03425925925925926, "width": 0.40925925925925927, "height": 0.24791666666666667, "zIndex": 1, "photoIndex": 4, "borderRadius": 0}, {"id": "6a0b8233-5ec7-43c9-aad9-9458cb84b39d", "top": 0.5916666666666667, "left": 0.5416666666666666, "width": 0.40925925925925927, "height": 0.24791666666666667, "zIndex": 1, "photoIndex": 5, "borderRadius": 0}]	6	f	free	t	0	0	6c249429-4c20-4516-8d62-385986482709	2025-12-04 18:02:23.660588+07	2025-12-05 02:10:38.072158+07	{"elements": [{"x": 0, "y": 0, "id": "upload_1764846112010_6xqjpctz1", "data": {"image": "https://ik.imagekit.io/y6rewkryo/frame-overlays/1764846140511_t5sc21_overlay_upload_1_png.jpg", "label": "Unggahan", "objectFit": "contain", "__isOverlay": true, "borderRadius": 0, "imageAspectRatio": 0.5625}, "type": "upload", "width": 1080, "xNorm": 0, "yNorm": 0, "height": 1920, "locked": false, "zIndex": 500, "widthNorm": 1, "heightNorm": 1}], "aspectRatio": "9:16", "orientation": "portrait", "backgroundColor": "#f7f1ed"}	#ffffff	1080	1920	2
frame_1764841593122_vi869129a	cek 3		Fremio Series	/uploads/frames/fca3de6d-6c28-497f-b279-818eac02c831.webp	\N	[{"id": "9a0da874-deb6-4708-8369-7059cacc4386", "top": 0.07291666666666667, "left": 0.06018518518518518, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 0, "borderRadius": 54}, {"id": "3ef731ae-ce39-4acb-9a54-86cc9cfc3f16", "top": 0.07291666666666667, "left": 0.5138888888888888, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 1, "borderRadius": 54}, {"id": "7b3e3bba-2b33-4df7-8a81-f1e544e143db", "top": 0.3625, "left": 0.06018518518518518, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 2, "borderRadius": 54}, {"id": "e739a692-bc64-43c4-a316-6343f5236cc4", "top": 0.3625, "left": 0.5138888888888888, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 3, "borderRadius": 54}, {"id": "349aa532-15d4-42a5-83ff-71574c160cc7", "top": 0.6520833333333333, "left": 0.06018518518518518, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 4, "borderRadius": 54}, {"id": "2ac4caa4-022c-4ac1-bfc9-0f13013796e7", "top": 0.6520833333333333, "left": 0.5138888888888888, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 5, "borderRadius": 54}]	6	f	free	f	0	0	6c249429-4c20-4516-8d62-385986482709	2025-12-04 16:46:33.128825+07	2025-12-04 17:39:25.299443+07	{"elements": [{"x": 0, "y": 0, "id": "upload_1764841581119_4r3lla0i1", "data": {"image": "https://ik.imagekit.io/y6rewkryo/frame-overlays/1764841589241_jw486n_overlay_upload_1_png.jpg", "label": "Unggahan", "objectFit": "contain", "__isOverlay": true, "borderRadius": 0, "imageAspectRatio": 0.5625}, "type": "upload", "width": 1077, "xNorm": 0, "yNorm": 0, "height": 1915, "locked": false, "zIndex": 500, "widthNorm": 0.9972222222222222, "heightNorm": 0.9973958333333334}], "aspectRatio": "9:16", "orientation": "portrait", "backgroundColor": "#f7f1ed"}	#ffffff	1080	1920	999
frame_1764841811186_idgz4ubyt	Cek 4		Fremio Series	/uploads/frames/67393ece-d841-4476-84c2-f69d7a20c6ed.webp	\N	[{"id": "d126454b-81a2-4ccd-9048-6338656b296d", "top": 0.07291666666666667, "left": 0.06018518518518518, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 0, "borderRadius": 54}, {"id": "0155e960-ca32-47b2-b28b-da25a1a77de2", "top": 0.07291666666666667, "left": 0.5138888888888888, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 1, "borderRadius": 54}, {"id": "16741cac-93ed-4b0e-8289-c784135e032c", "top": 0.3625, "left": 0.06018518518518518, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 2, "borderRadius": 54}, {"id": "a84c4e01-d4be-40b9-a72e-21352f4565dc", "top": 0.3625, "left": 0.5138888888888888, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 3, "borderRadius": 54}, {"id": "07bbd662-95e8-4ba3-8fa2-aeb8323033f5", "top": 0.6520833333333333, "left": 0.06018518518518518, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 4, "borderRadius": 54}, {"id": "706f04d3-65ec-4f60-8cf7-bc8c5e9beca3", "top": 0.6520833333333333, "left": 0.5138888888888888, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 5, "borderRadius": 54}]	6	f	free	f	2	0	6c249429-4c20-4516-8d62-385986482709	2025-12-04 16:50:11.202529+07	2025-12-04 17:39:23.39945+07	{"elements": [{"x": 0, "y": 0, "id": "upload_1764841797190_z0mo0f0h1", "data": {"image": "https://ik.imagekit.io/y6rewkryo/frame-overlays/1764841807963_1smlop_overlay_upload_1_png.jpg", "label": "Unggahan", "objectFit": "contain", "__isOverlay": true, "borderRadius": 0, "imageAspectRatio": 0.5625}, "type": "upload", "width": 1077, "xNorm": 0, "yNorm": 0, "height": 1915, "locked": false, "zIndex": 500, "widthNorm": 0.9972222222222222, "heightNorm": 0.9973958333333334}], "aspectRatio": "9:16", "orientation": "portrait", "backgroundColor": "#f7f1ed"}	#ffffff	1080	1920	999
frame_1764835701554_d8zzvppht	tes		Fremio Series	/uploads/frames/050289aa-5296-45f0-956a-1c73cd1f21ad.webp	\N	[{"id": "af1e4f6c-4382-4b4c-8678-40f8c9e8173f", "top": 0.07291666666666667, "left": 0.06018518518518518, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 0, "borderRadius": 54}, {"id": "b8d06102-54e7-48fa-8c4c-238fe9317cb1", "top": 0.07291666666666667, "left": 0.5138888888888888, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 1, "borderRadius": 54}, {"id": "f725db6c-c09d-4445-8d27-bbf2b1f68da1", "top": 0.3625, "left": 0.06018518518518518, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 2, "borderRadius": 54}, {"id": "27a17f87-62e8-4729-8352-e0961e09c592", "top": 0.3625, "left": 0.5138888888888888, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 3, "borderRadius": 54}, {"id": "07f2e31b-8d73-443f-9d42-2a8a150e5f09", "top": 0.6520833333333333, "left": 0.06018518518518518, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 4, "borderRadius": 54}, {"id": "affc26c2-3826-4860-88f6-f8bc978278f8", "top": 0.6520833333333333, "left": 0.5138888888888888, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 5, "borderRadius": 54}]	6	f	free	f	5	0	6c249429-4c20-4516-8d62-385986482709	2025-12-04 15:08:21.570339+07	2025-12-04 15:34:11.530331+07	{}	#ffffff	1080	1920	999
frame_1764845824727_0ukwpx1zu	Our Love Memory	Desain klasik dan romantis dengan tone merah-maroon, pas untuk wedding, anniversary, atau acara berkonsep intimate & timeless.	Fremio Series	/uploads/frames/98358c07-74fc-45df-b2ff-78d1dcf4b5f2.webp	\N	[{"id": "49b1c3bf-cf74-4625-964c-921a0a005822", "top": 0.1395833412806193, "left": 0.0416666101526331, "width": 0.4388888888888889, "height": 0.28541666666666665, "zIndex": 1, "photoIndex": 0, "borderRadius": 0}, {"id": "ad3c585e-88e1-4792-8f4a-4dc6613336a6", "top": 0.1395833412806193, "left": 0.5120369805230035, "width": 0.4388888888888889, "height": 0.28541666666666665, "zIndex": 1, "photoIndex": 1, "borderRadius": 0}, {"id": "16804e87-e613-4aa4-a54f-1529200c91ae", "top": 0.4270833407839139, "left": 0.04537028206719292, "width": 0.4388888888888889, "height": 0.27708333333333335, "zIndex": 1, "photoIndex": 2, "borderRadius": 0}, {"id": "6c8875b8-3c6a-4c4e-a097-c57dff920447", "top": 0.4270833407839139, "left": 0.5120369487338596, "width": 0.4388888888888889, "height": 0.27708333333333335, "zIndex": 1, "photoIndex": 3, "borderRadius": 0}, {"id": "b99b93c1-4b4f-4558-be31-33c9bf7dffd0", "top": 0.708333340783914, "left": 0.04537028206719292, "width": 0.4388888888888889, "height": 0.27708333333333335, "zIndex": 1, "photoIndex": 4, "borderRadius": 0}, {"id": "ed4dbfbe-574e-4fa3-882b-b3f720d786ef", "top": 0.7062500074505806, "left": 0.5157406524375633, "width": 0.4388888888888889, "height": 0.27708333333333335, "zIndex": 1, "photoIndex": 5, "borderRadius": 0}]	6	f	free	t	0	0	6c249429-4c20-4516-8d62-385986482709	2025-12-04 17:57:04.743592+07	2025-12-05 02:10:38.071516+07	{"elements": [{"x": 0.0000457763671875, "y": 0.00002002716064453125, "id": "upload_1764845781569_i8gmv6qkq", "data": {"image": "https://ik.imagekit.io/y6rewkryo/frame-overlays/1764845822096_r4lw2v_overlay_upload_1_png.jpg", "label": "Unggahan", "objectFit": "contain", "__isOverlay": true, "borderRadius": 0, "imageAspectRatio": 0.5625}, "type": "upload", "width": 1080, "xNorm": 0.00000004238552517361111, "yNorm": 0.000000010430812835693359, "height": 1920, "locked": false, "zIndex": 500, "widthNorm": 1, "heightNorm": 1}], "aspectRatio": "9:16", "orientation": "portrait", "backgroundColor": "#FF6D0C"}	#ffffff	1080	1920	4
frame_1764837273281_0vp12w400	tes		Fremio Series	/uploads/frames/c96fd60e-34d7-45bb-90ee-508c3c0dcc17.webp	\N	[{"id": "el-1764837257030-hbrdek", "top": 0.07291666666666667, "left": 0.06018518518518518, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 0, "borderRadius": 54}, {"id": "el-1764837257031-zq4ivo", "top": 0.07291666666666667, "left": 0.5138888888888888, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 1, "borderRadius": 54}, {"id": "el-1764837257031-bkdf2n", "top": 0.3625, "left": 0.06018518518518518, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 2, "borderRadius": 54}, {"id": "el-1764837257031-118pv3", "top": 0.3625, "left": 0.5138888888888888, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 3, "borderRadius": 54}, {"id": "el-1764837257031-f14rfp", "top": 0.6520833333333333, "left": 0.06018518518518518, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 4, "borderRadius": 54}, {"id": "el-1764837257031-x57j37", "top": 0.6520833333333333, "left": 0.5138888888888888, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 5, "borderRadius": 54}]	6	f	free	f	14	0	6c249429-4c20-4516-8d62-385986482709	2025-12-04 15:34:33.288269+07	2025-12-04 16:05:45.167649+07	\N	#ffffff	1080	1920	999
frame_1764838078893_zm6qa2cp4	Cek		Fremio Series	/uploads/frames/2e2ad573-7016-41f6-aac5-6ad30fa8ee47.webp	\N	[{"id": "el-1764838065181-vnbys1", "top": 0.07291666666666667, "left": 0.06018518518518518, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 0, "borderRadius": 54}, {"id": "el-1764838065181-cgam8q", "top": 0.07291666666666667, "left": 0.5138888888888888, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 1, "borderRadius": 54}, {"id": "el-1764838065181-e2g5ze", "top": 0.3625, "left": 0.06018518518518518, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 2, "borderRadius": 54}, {"id": "el-1764838065181-r2zqmx", "top": 0.3625, "left": 0.5138888888888888, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 3, "borderRadius": 54}, {"id": "el-1764838065181-wfky8r", "top": 0.6520833333333333, "left": 0.06018518518518518, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 4, "borderRadius": 54}, {"id": "el-1764838065181-znq7gy", "top": 0.6520833333333333, "left": 0.5138888888888888, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 5, "borderRadius": 54}]	6	f	free	f	8	0	6c249429-4c20-4516-8d62-385986482709	2025-12-04 15:47:58.904759+07	2025-12-04 15:50:49.472377+07	\N	#ffffff	1080	1920	999
frame_1764838271895_v4ddwytgn	cek		Fremio Series	/uploads/frames/3404de7f-dd0f-4e56-b0f1-dc4abda6e987.webp	\N	[{"id": "el-1764838255467-mt16dx", "top": 0.07291666666666667, "left": 0.06018518518518518, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 0, "borderRadius": 54}, {"id": "el-1764838255467-3jrj40", "top": 0.07291666666666667, "left": 0.5138888888888888, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 1, "borderRadius": 54}, {"id": "el-1764838255467-x04xgq", "top": 0.3625, "left": 0.06018518518518518, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 2, "borderRadius": 54}, {"id": "el-1764838255467-lslxgu", "top": 0.3625, "left": 0.5138888888888888, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 3, "borderRadius": 54}, {"id": "el-1764838255467-pt2a75", "top": 0.6520833333333333, "left": 0.06018518518518518, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 4, "borderRadius": 54}, {"id": "el-1764838255467-yk99oi", "top": 0.6520833333333333, "left": 0.5138888888888888, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 5, "borderRadius": 54}]	6	f	free	f	2	0	6c249429-4c20-4516-8d62-385986482709	2025-12-04 15:51:11.902746+07	2025-12-04 16:05:42.636894+07	\N	#ffffff	1080	1920	999
frame_1764838423535_u673p72ex	Check		Fremio Series	/uploads/frames/8e9fab89-ab7f-49ce-994f-ea8beab1c7b6.webp	\N	[{"id": "el-1764838387699-c4trkk", "top": 0.07291666666666667, "left": 0.06018518518518518, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 0, "borderRadius": 54}, {"id": "el-1764838387699-htt1xk", "top": 0.07291666666666667, "left": 0.5138888888888888, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 1, "borderRadius": 54}, {"id": "el-1764838387699-wi33uv", "top": 0.3625, "left": 0.06018518518518518, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 2, "borderRadius": 54}, {"id": "el-1764838387700-ir10a8", "top": 0.3625, "left": 0.5138888888888888, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 3, "borderRadius": 54}, {"id": "el-1764838387700-vgsmw5", "top": 0.6520833333333333, "left": 0.06018518518518518, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 4, "borderRadius": 54}, {"id": "el-1764838387700-a35tod", "top": 0.6520833333333333, "left": 0.5138888888888888, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 5, "borderRadius": 54}]	6	f	free	f	0	0	6c249429-4c20-4516-8d62-385986482709	2025-12-04 15:53:43.548484+07	2025-12-04 16:05:39.279962+07	\N	#ffffff	1080	1920	999
frame_1764838329621_ubheuvtz6	tesss		Fremio Series	/uploads/frames/7a66c810-96bc-4323-b6ed-75177e946672.webp	\N	[{"id": "el-1764838316217-b6bi6g", "top": 0.07291666666666667, "left": 0.06018518518518518, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 0, "borderRadius": 54}, {"id": "el-1764838316217-vwnqul", "top": 0.07291666666666667, "left": 0.5138888888888888, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 1, "borderRadius": 54}, {"id": "el-1764838316217-36h1xp", "top": 0.3625, "left": 0.06018518518518518, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 2, "borderRadius": 54}, {"id": "el-1764838316217-b86mie", "top": 0.3625, "left": 0.5138888888888888, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 3, "borderRadius": 54}, {"id": "el-1764838316218-z92vxv", "top": 0.6520833333333333, "left": 0.06018518518518518, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 4, "borderRadius": 54}, {"id": "el-1764838316218-9lkbyc", "top": 0.6520833333333333, "left": 0.5138888888888888, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 5, "borderRadius": 54}]	6	f	free	f	4	0	6c249429-4c20-4516-8d62-385986482709	2025-12-04 15:52:09.627358+07	2025-12-04 16:05:40.972052+07	\N	#ffffff	1080	1920	999
frame_1764842810239_mtqh42lky	cek 5		Fremio Series	/uploads/frames/5a1ee4b8-e96e-4b00-a039-b9863d1439f3.webp	\N	[{"id": "f08ea358-9fc9-45f1-a15f-8416dcbfa182", "top": 0.07291666666666667, "left": 0.06018518518518518, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 0, "borderRadius": 54}, {"id": "9e17d07c-f537-4306-9f1a-88585cf1b80e", "top": 0.07291666666666667, "left": 0.5138888888888888, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 1, "borderRadius": 54}, {"id": "f86cd1f0-24e4-48f1-8a6f-9a711315a56a", "top": 0.3625, "left": 0.06018518518518518, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 2, "borderRadius": 54}, {"id": "8fee8994-2a1b-4dff-91b3-332f36451f8a", "top": 0.3625, "left": 0.5138888888888888, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 3, "borderRadius": 54}, {"id": "964d71ff-dd12-49a9-8829-bc3e37ad3553", "top": 0.6520833333333333, "left": 0.06018518518518518, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 4, "borderRadius": 54}, {"id": "274695d0-5bd8-4ae5-9414-8f3007bee938", "top": 0.6520833333333333, "left": 0.5138888888888888, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 5, "borderRadius": 54}]	6	f	free	f	2	0	6c249429-4c20-4516-8d62-385986482709	2025-12-04 17:06:50.246662+07	2025-12-04 17:39:21.591112+07	{"elements": [{"x": 0, "y": 0, "id": "upload_1764842799780_n5ojl7niv", "data": {"image": "https://ik.imagekit.io/y6rewkryo/frame-overlays/1764842806779_4tefdg_overlay_upload_1_png.jpg", "label": "Unggahan", "objectFit": "contain", "__isOverlay": true, "borderRadius": 0, "imageAspectRatio": 0.5625}, "type": "upload", "width": 1077, "xNorm": 0, "yNorm": 0, "height": 1915, "locked": false, "zIndex": 500, "widthNorm": 0.9972222222222222, "heightNorm": 0.9973958333333334}], "aspectRatio": "9:16", "orientation": "portrait", "backgroundColor": "#f7f1ed"}	#ffffff	1080	1920	999
frame_1764838659987_kc9s5whug	Testtt		Fremio Series	/uploads/frames/953b3093-c857-4b66-b913-5bb10939d0f9.webp	\N	[{"id": "el-1764838641968-niyeu9", "top": 0.07291666666666667, "left": 0.06018518518518518, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 0, "borderRadius": 54}, {"id": "el-1764838641969-g9stl5", "top": 0.07291666666666667, "left": 0.5138888888888888, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 1, "borderRadius": 54}, {"id": "el-1764838641969-xxepok", "top": 0.3625, "left": 0.06018518518518518, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 2, "borderRadius": 54}, {"id": "el-1764838641969-5iiwpu", "top": 0.3625, "left": 0.5138888888888888, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 3, "borderRadius": 54}, {"id": "el-1764838641969-iqpvxl", "top": 0.6520833333333333, "left": 0.06018518518518518, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 4, "borderRadius": 54}, {"id": "el-1764838641969-043pc0", "top": 0.6520833333333333, "left": 0.5138888888888888, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 5, "borderRadius": 54}]	6	f	free	f	4	0	6c249429-4c20-4516-8d62-385986482709	2025-12-04 15:57:40.011952+07	2025-12-04 16:05:37.20465+07	{"elements": [], "aspectRatio": "9:16", "orientation": "portrait", "backgroundColor": "#f7f1ed"}	#ffffff	1080	1920	999
frame_1764838911498_w3zaacdsz	Tes 1		Fremio Series	/uploads/frames/ac542a84-d394-496e-adce-54b6183baf86.webp	\N	[{"id": "el-1764838897694-3pvrts", "top": 0.07291666666666667, "left": 0.06018518518518518, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 0, "borderRadius": 54}, {"id": "el-1764838897694-oqmtwr", "top": 0.07291666666666667, "left": 0.5138888888888888, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 1, "borderRadius": 54}, {"id": "el-1764838897695-pwxd0q", "top": 0.3625, "left": 0.06018518518518518, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 2, "borderRadius": 54}, {"id": "el-1764838897695-903qtk", "top": 0.3625, "left": 0.5138888888888888, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 3, "borderRadius": 54}, {"id": "el-1764838897695-v2gihx", "top": 0.6520833333333333, "left": 0.06018518518518518, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 4, "borderRadius": 54}, {"id": "el-1764838897695-jm474l", "top": 0.6520833333333333, "left": 0.5138888888888888, "width": 0.42592592592592593, "height": 0.27395833333333336, "zIndex": 1, "photoIndex": 5, "borderRadius": 54}]	6	f	free	f	2	0	6c249429-4c20-4516-8d62-385986482709	2025-12-04 16:01:51.505719+07	2025-12-04 16:05:47.240217+07	{"elements": []}	#ffffff	1080	1920	999
frame_1764841029090_zv7zgorm3	Cek		Fremio Series	/uploads/frames/828b558f-281e-4f56-9c87-51d0426a18cb.webp	\N	[{"id": "6cf24f24-3b14-4102-8cb3-29bb12d1ea59", "top": 0.04791666666666667, "left": 0.03425925925925926, "width": 0.45, "height": 0.24166666666666667, "zIndex": 1, "photoIndex": 0, "borderRadius": 0}, {"id": "d38570df-e5e3-452b-a88c-28de5c24c02d", "top": 0.05, "left": 0.5157407407407407, "width": 0.45, "height": 0.24166666666666667, "zIndex": 1, "photoIndex": 1, "borderRadius": 0}, {"id": "c4aa15db-cc37-4cd9-b812-8d7771804988", "top": 0.2916666666666667, "left": 0.03425925925925926, "width": 0.45, "height": 0.27291666666666664, "zIndex": 1, "photoIndex": 2, "borderRadius": 0}, {"id": "f5b6c4e4-946d-4b6b-a803-df5f7b79f91e", "top": 0.29375, "left": 0.5157407407407407, "width": 0.45, "height": 0.2708333333333333, "zIndex": 1, "photoIndex": 3, "borderRadius": 0}, {"id": "4e5d63b2-93ea-4bdf-b8ae-68552ef10227", "top": 0.5708333253860474, "left": 0.041666666666666664, "width": 0.45, "height": 0.2791666666666667, "zIndex": 1, "photoIndex": 4, "borderRadius": 0}, {"id": "2926af9c-ea78-46d0-8d08-f0de45df686a", "top": 0.56875, "left": 0.5083333333333333, "width": 0.4537037037037037, "height": 0.2833333333333333, "zIndex": 1, "photoIndex": 5, "borderRadius": 0}]	6	f	free	f	0	0	6c249429-4c20-4516-8d62-385986482709	2025-12-04 16:37:09.105012+07	2025-12-04 17:39:32.416532+07	{"elements": [{"x": 0.00002288818359375, "y": 0.000011444091796875, "id": "upload_1764841014213_yungi80jx", "data": {"image": "https://ik.imagekit.io/y6rewkryo/frame-overlays/1764841024921_akt1i5_overlay_upload_1_png.jpg", "label": "Unggahan", "objectFit": "contain", "__isOverlay": true, "borderRadius": 0, "imageAspectRatio": 0.5625}, "type": "upload", "width": 1077, "xNorm": 0.000000021192762586805556, "yNorm": 0.000000005960464477539063, "height": 1915, "locked": false, "zIndex": 500, "widthNorm": 0.9972222222222222, "heightNorm": 0.9973958333333334}], "aspectRatio": "9:16", "orientation": "portrait", "backgroundColor": "#0D1CFF"}	#ffffff	1080	1920	999
frame_1764839304284_zma4vb95w	Smile & Celebrate	Tema ceria dengan elemen ilustrasi mata dan ledakan warna. Memberikan vibe fun, playful, dan penuh energi.	Fremio Series	/uploads/frames/357913ab-8c08-48f9-8178-40001350768a.webp	\N	[{"id": "el-1764839196688-9fm6h9", "top": 0.05416666666666667, "left": 0.041666666666666664, "width": 0.4462962962962963, "height": 0.23333333333333334, "zIndex": 1, "photoIndex": 0, "borderRadius": 0}, {"id": "el-1764839211005-24npag", "top": 0.05416666666666667, "left": 0.5157407407407407, "width": 0.4462962962962963, "height": 0.23333333333333334, "zIndex": 1, "photoIndex": 1, "borderRadius": 0}, {"id": "el-1764839217021-26r6gx", "top": 0.2916666666666667, "left": 0.041666666666666664, "width": 0.4462962962962963, "height": 0.275, "zIndex": 1, "photoIndex": 2, "borderRadius": 0}, {"id": "el-1764839223755-b6buof", "top": 0.2916666666666667, "left": 0.5120370370370371, "width": 0.4462962962962963, "height": 0.275, "zIndex": 1, "photoIndex": 3, "borderRadius": 0}, {"id": "el-1764839227754-9etyb3", "top": 0.5729166666666666, "left": 0.04537037037037037, "width": 0.4462962962962963, "height": 0.275, "zIndex": 1, "photoIndex": 4, "borderRadius": 0}, {"id": "el-1764839232321-uqbvlc", "top": 0.5708333333333333, "left": 0.5083333333333333, "width": 0.4462962962962963, "height": 0.275, "zIndex": 1, "photoIndex": 5, "borderRadius": 0}]	6	f	free	f	2	0	6c249429-4c20-4516-8d62-385986482709	2025-12-04 16:08:24.302023+07	2025-12-04 17:39:34.633979+07	{"elements": [{"x": 0, "y": 0, "id": "upload_1764839238629_9xu17xink", "data": {"image": "https://ik.imagekit.io/y6rewkryo/frame-overlays/1764839301104_hokulq_overlay_upload_1_png.jpg", "label": "Unggahan", "objectFit": "contain", "borderRadius": 0, "imageAspectRatio": 0.5625}, "type": "upload", "width": 1077, "xNorm": 0, "yNorm": 0, "height": 1915, "locked": false, "zIndex": 2, "widthNorm": 0.9972222222222222, "heightNorm": 0.9973958333333334}], "aspectRatio": "9:16", "orientation": "portrait", "backgroundColor": "#f7f1ed"}	#ffffff	1080	1920	999
frame_1764845156274_ps1va7254	Strike a Pose	Nuansa minimalis modern dengan aksen tipografi yang tegas. Cocok untuk event bergaya elegan dan futuristik.	Fremio Series	/uploads/frames/7b0beadf-9bb3-43c0-9f1a-7d17cd6d9c25.webp	\N	[{"id": "180f1e2a-2d19-4d33-b013-383a9541b550", "top": 0.00625, "left": 0, "width": 0.37592592592592594, "height": 0.20416666666666666, "zIndex": 1, "photoIndex": 0, "borderRadius": 0}, {"id": "c37ec2e2-55c6-4dab-b6d5-f50d0fc80567", "top": 0.00625, "left": 0.4888888888888889, "width": 0.37592592592592594, "height": 0.20416666666666666, "zIndex": 1, "photoIndex": 1, "borderRadius": 0}, {"id": "10b212ee-61ff-44c7-9200-90532bfeef2a", "top": 0.21458333333333332, "left": 0, "width": 0.37592592592592594, "height": 0.19375, "zIndex": 1, "photoIndex": 2, "borderRadius": 0}, {"id": "6f98d4ff-033d-403b-b900-a829356e2f73", "top": 0.21249998410542806, "left": 0.4888888323748553, "width": 0.37592592592592594, "height": 0.19583333333333333, "zIndex": 1, "photoIndex": 3, "borderRadius": 0}, {"id": "5e5baa63-ede8-4e4c-ba35-09193d67b469", "top": 0.4125, "left": 0, "width": 0.37592592592592594, "height": 0.20416666666666666, "zIndex": 1, "photoIndex": 4, "borderRadius": 0}, {"id": "79ad8daf-ac10-4239-ada2-338533e0f35e", "top": 0.4125, "left": 0.4925925925925926, "width": 0.37592592592592594, "height": 0.20416666666666666, "zIndex": 1, "photoIndex": 5, "borderRadius": 0}, {"id": "093f1ba9-0e1a-4f65-a9a3-443ecc4cc2fd", "top": 0.61875, "left": 0.00000004238552517361111, "width": 0.37592592592592594, "height": 0.19375, "zIndex": 1, "photoIndex": 6, "borderRadius": 0}, {"id": "b288c688-e0ad-4481-a9f2-e03f43075921", "top": 0.6187500119209289, "left": 0.4962962962962963, "width": 0.37592592592592594, "height": 0.19583333333333333, "zIndex": 1, "photoIndex": 7, "borderRadius": 0}, {"id": "6c77540e-cefd-48ee-8c51-67f4fadfdce9", "top": 0.8187500198682149, "left": 0, "width": 0.37592592592592594, "height": 0.175, "zIndex": 1, "photoIndex": 8, "borderRadius": 0}, {"id": "366f1575-a013-4829-972c-aa505e008a8b", "top": 0.8187500198682149, "left": 0.4925925925925926, "width": 0.37592592592592594, "height": 0.175, "zIndex": 1, "photoIndex": 9, "borderRadius": 0}]	10	f	free	t	0	0	6c249429-4c20-4516-8d62-385986482709	2025-12-04 17:45:56.295585+07	2025-12-05 02:10:38.055196+07	{"elements": [{"x": 0.0000457763671875, "y": -0.00002288818359375, "id": "upload_1764845125469_f340507ys", "data": {"image": "https://ik.imagekit.io/y6rewkryo/frame-overlays/1764845153447_sgf3t6_overlay_upload_1_png.jpg", "label": "Unggahan", "objectFit": "contain", "__isOverlay": true, "borderRadius": 0, "imageAspectRatio": 0.5625}, "type": "upload", "width": 1080, "xNorm": 0.00000004238552517361111, "yNorm": -0.000000011920928955078126, "height": 1920, "locked": false, "zIndex": 500, "widthNorm": 1, "heightNorm": 1}], "aspectRatio": "9:16", "orientation": "portrait", "backgroundColor": "#FF6600"}	#ffffff	1080	1920	7
frame_1764846025386_f8ggnhbk5	Snap Your Joy	Sentuhan retro dengan pola kotak-kotak dan warna hijau cerah, ideal untuk event santai, festival, atau pesta tematik.	Fremio Series	/uploads/frames/69538b1e-d2c5-4de8-a5c2-8fae90403af0.webp	\N	[{"id": "0d293b8f-ba46-4a63-96b3-a13d47f460f0", "top": 0.000000007450580596923828, "left": 0.0379629064489294, "width": 0.45, "height": 0.34791666666666665, "zIndex": 1, "photoIndex": 0, "borderRadius": 0}, {"id": "0ad70cce-c9f4-427c-b5c8-0b7602f117b2", "top": 0, "left": 0.5046295731155961, "width": 0.45, "height": 0.34791666666666665, "zIndex": 1, "photoIndex": 1, "borderRadius": 0}, {"id": "7ffc198f-43e0-4ed2-b700-96e30140ec7d", "top": 0.3541666666666667, "left": 0.0416666136847602, "width": 0.45, "height": 0.35208333333333336, "zIndex": 1, "photoIndex": 2, "borderRadius": 0}, {"id": "73e5a40e-e242-4c9b-9fc0-4af3bc096225", "top": 0.3541666666666667, "left": 0.5083332803514269, "width": 0.45, "height": 0.35208333333333336, "zIndex": 1, "photoIndex": 3, "borderRadius": 0}]	4	f	free	t	0	0	6c249429-4c20-4516-8d62-385986482709	2025-12-04 18:00:25.400254+07	2025-12-05 02:10:38.068466+07	{"elements": [{"x": 0, "y": -0.00002288818359375, "id": "upload_1764845990600_51n6mcvy2", "data": {"image": "https://ik.imagekit.io/y6rewkryo/frame-overlays/1764846022663_0zn6il_overlay_upload_1_png.jpg", "label": "Unggahan", "objectFit": "contain", "__isOverlay": true, "borderRadius": 0, "imageAspectRatio": 0.5625}, "type": "upload", "width": 1080, "xNorm": 0, "yNorm": -0.000000011920928955078126, "height": 1920, "locked": false, "zIndex": 500, "widthNorm": 1, "heightNorm": 1}], "aspectRatio": "9:16", "orientation": "portrait", "backgroundColor": "#000000"}	#ffffff	1080	1920	3
frame_1764846351206_lzwvyh5yh	Blue Picnic Vibes	Frame biru kotak-kotak yang fun dan casual untuk suasana santai.	Fremio Series	/uploads/frames/3ffb1cec-9d93-4b3a-b45e-6c7e2ad81a7c.webp	\N	[{"id": "1182f849-5dff-4f91-b082-833bb05c0d75", "top": 0.010416666666666666, "left": 0.03333333333333333, "width": 0.45, "height": 0.3375, "zIndex": 1, "photoIndex": 0, "borderRadius": 0}, {"id": "f38e228b-2a72-49ba-8bd8-7531eba5d372", "top": 0.008333333333333333, "left": 0.5148148148148148, "width": 0.45, "height": 0.33958333333333335, "zIndex": 1, "photoIndex": 1, "borderRadius": 0}, {"id": "60edfa02-821d-47a8-877b-8daa4c5467f0", "top": 0.3541666666666667, "left": 0.03333333333333333, "width": 0.45, "height": 0.35625, "zIndex": 1, "photoIndex": 2, "borderRadius": 0}, {"id": "f1e7cec6-0cb6-4e5c-a0b7-6c7fdc1aac57", "top": 0.35625, "left": 0.5074074074074074, "width": 0.45, "height": 0.35625, "zIndex": 1, "photoIndex": 3, "borderRadius": 0}]	4	f	free	t	1	0	6c249429-4c20-4516-8d62-385986482709	2025-12-04 18:05:51.222297+07	2025-12-05 02:38:49.61627+07	{"elements": [{"x": 0, "y": 0, "id": "upload_1764846325381_ta4vop2uc", "data": {"image": "https://ik.imagekit.io/y6rewkryo/frame-overlays/1764846346498_jb9ain_overlay_upload_1_png.jpg", "label": "Unggahan", "objectFit": "contain", "__isOverlay": true, "borderRadius": 0, "imageAspectRatio": 0.5625}, "type": "upload", "width": 1080, "xNorm": 0, "yNorm": 0, "height": 1920, "locked": false, "zIndex": 500, "widthNorm": 1, "heightNorm": 1}], "aspectRatio": "9:16", "orientation": "portrait", "backgroundColor": "#000000"}	#ffffff	1080	1920	0
frame_1764876246494_s91cxbdd7	Inspired by Sheila On 7 – 7 Des	Frame ini menghadirkan suasana energik dan youthful lewat latar merah bertekstur yang menyerupai percikan dan cahaya dinamis. Estetika ini menangkap karakter musik SO7 yang hangat, penuh emosi, namun tetap santai. Kotak foto dengan sudut lembut membuatnya terasa modern dan fun. Frame ini dapat digunakan tanpa biaya apapun.	Music	/uploads/frames/98a49b80-8c29-4cd5-a34d-c90db4e6e272.webp	\N	[{"id": "a38fcebf-1c17-4af2-a495-4a4d6217b390", "top": 0.1, "left": 0.05277777777777778, "width": 0.40555555555555556, "height": 0.20625, "zIndex": 1, "photoIndex": 0, "borderRadius": 0}, {"id": "68baffa4-1627-43cf-838c-a94677c6c39b", "top": 0.1, "left": 0.5453703138563368, "width": 0.40555555555555556, "height": 0.20625, "zIndex": 1, "photoIndex": 1, "borderRadius": 0}, {"id": "456b16f8-34a2-413e-9ba5-05e8cb71360d", "top": 0.3104166666666667, "left": 0.056481424967447916, "width": 0.40555555555555556, "height": 0.20625, "zIndex": 1, "photoIndex": 2, "borderRadius": 0}, {"id": "302454b6-255c-4325-8fa6-bb2b6a8b175d", "top": 0.3104166666666667, "left": 0.5416666101526331, "width": 0.40555555555555556, "height": 0.20625, "zIndex": 1, "photoIndex": 3, "borderRadius": 0}, {"id": "49e17abd-9bd5-40f6-8ef6-3f0d23dfca1d", "top": 0.5208333333333334, "left": 0.052777721263744214, "width": 0.40555555555555556, "height": 0.20625, "zIndex": 1, "photoIndex": 4, "borderRadius": 0}, {"id": "55cd5241-dfc5-46c4-9ab2-18abc179c1af", "top": 0.5208333333333334, "left": 0.5416666101526331, "width": 0.40555555555555556, "height": 0.20625, "zIndex": 1, "photoIndex": 5, "borderRadius": 0}, {"id": "a202a0bf-04c8-4a41-90d1-e818e6020c40", "top": 0.73125, "left": 0.056481424967447916, "width": 0.40555555555555556, "height": 0.20625, "zIndex": 1, "photoIndex": 6, "borderRadius": 0}, {"id": "07bd95dd-0765-467f-a2a0-20700622562f", "top": 0.73125, "left": 0.5416666101526331, "width": 0.40555555555555556, "height": 0.20625, "zIndex": 1, "photoIndex": 7, "borderRadius": 0}]	8	f	free	t	2	0	6c249429-4c20-4516-8d62-385986482709	2025-12-05 02:24:06.515274+07	2025-12-05 02:24:14.076571+07	{"elements": [{"x": 0, "y": 0, "id": "upload_1764876216276_gz1r9u82v", "data": {"image": "https://ik.imagekit.io/y6rewkryo/frame-overlays/1764876243573_irmlkp_overlay_upload_1_png.jpg", "label": "Unggahan", "objectFit": "contain", "__isOverlay": true, "borderRadius": 0, "imageAspectRatio": 0.5625}, "type": "upload", "width": 1080, "xNorm": 0, "yNorm": 0, "height": 1920, "locked": false, "zIndex": 500, "widthNorm": 1, "heightNorm": 1}], "aspectRatio": "9:16", "orientation": "portrait", "backgroundColor": "#f7f1ed"}	#ffffff	1080	1920	999
frame_1764876114414_sx7a8kift	Inspired by The Beatles – Abbey Road	Frame ini memanfaatkan nuansa jalanan yang ikonik dari Abbey Road, menonjolkan warna lembut, kabut tipis, dan cahaya matahari yang memberi kesan nostalgia serta vintage. Komposisi kotak foto yang simetris menciptakan ruang bercerita seperti momen perjalanan dan kebersamaan.Template ini dapat digunakan tanpa biaya apapun.	Music	/uploads/frames/88922700-7a03-4baf-9d4c-b785b3ae5a47.webp	\N	[{"id": "72ccc09e-1558-41a3-8cf8-0890081267ff", "top": 0.12083334227403005, "left": 0.049074074074074076, "width": 0.4203703703703704, "height": 0.18125, "zIndex": 1, "photoIndex": 0, "borderRadius": 0}, {"id": "1564e155-3976-46f6-b3a7-67f45486ca8b", "top": 0.11875000894069672, "left": 0.5305555555555556, "width": 0.4203703703703704, "height": 0.18125, "zIndex": 1, "photoIndex": 1, "borderRadius": 0}, {"id": "b87af4f7-5a90-41b4-bbcc-f7fd3643cde6", "top": 0.31250000894069674, "left": 0.041666666666666664, "width": 0.4203703703703704, "height": 0.18125, "zIndex": 1, "photoIndex": 2, "borderRadius": 0}, {"id": "dddcedfc-fa36-4b24-b342-6f9362e63d64", "top": 0.31250000894069674, "left": 0.5342592592592592, "width": 0.4203703703703704, "height": 0.18125, "zIndex": 1, "photoIndex": 3, "borderRadius": 0}, {"id": "13fcdc7a-d20a-41f8-b5fa-3c1c12797baf", "top": 0.5041666756073634, "left": 0.03796296296296296, "width": 0.4203703703703704, "height": 0.18125, "zIndex": 1, "photoIndex": 4, "borderRadius": 0}, {"id": "21ca011f-9fee-499e-beae-8d3f6a2f5ae6", "top": 0.5062500089406967, "left": 0.537962962962963, "width": 0.4203703703703704, "height": 0.18125, "zIndex": 1, "photoIndex": 5, "borderRadius": 0}, {"id": "1da2f537-99c1-4791-9e4d-8d02fbd99ee3", "top": 0.70208334227403, "left": 0.04537037037037037, "width": 0.4203703703703704, "height": 0.18125, "zIndex": 1, "photoIndex": 6, "borderRadius": 0}, {"id": "5d433a10-16ab-4982-831c-576bbb96ffec", "top": 0.70208334227403, "left": 0.537962962962963, "width": 0.4203703703703704, "height": 0.18125, "zIndex": 1, "photoIndex": 7, "borderRadius": 0}]	8	f	free	t	2	0	6c249429-4c20-4516-8d62-385986482709	2025-12-05 02:21:54.429485+07	2025-12-05 02:22:12.755521+07	{"elements": [{"x": 0, "y": 0, "id": "upload_1764875996145_7vhi31rp6", "data": {"image": "https://ik.imagekit.io/y6rewkryo/frame-overlays/1764876110463_0ytu4i_overlay_upload_1_png.jpg", "label": "Unggahan", "objectFit": "contain", "__isOverlay": true, "borderRadius": 0, "imageAspectRatio": 0.5625}, "type": "upload", "width": 1080, "xNorm": 0, "yNorm": 0, "height": 1920, "locked": false, "zIndex": 500, "widthNorm": 1, "heightNorm": 1}], "aspectRatio": "9:16", "orientation": "portrait", "backgroundColor": "#000000"}	#ffffff	1080	1920	999
frame_1764876461743_3ai3t0w7l	Inspired by Perunggu – Memorandum	Frame ini memakai palet warna coklat pudar dan tekstur kertas arsip yang memberi mood vintage, raw, dan penuh memori. Ornamen kecil seperti bunga kering memperkuat nuansa dokumenter dan sentimental khas album Memorandum. Layoutnya terasa hangat dan personal. Frame ini dapat digunakan tanpa biaya apapun.	Music	/uploads/frames/fe596184-5da8-4f09-b0db-89bd2584dfc0.webp	\N	[{"id": "1bcc8501-7a9e-4f52-953c-d8e8bcf931ce", "top": 0.11458333333333333, "left": 0.041666666666666664, "width": 0.42407407407407405, "height": 0.24375, "zIndex": 1, "photoIndex": 0, "borderRadius": 0}, {"id": "f64002e2-cf63-4da6-9024-20eb83429b3c", "top": 0.11875, "left": 0.5342592592592592, "width": 0.42407407407407405, "height": 0.24375, "zIndex": 1, "photoIndex": 1, "borderRadius": 0}, {"id": "d9374d06-9058-475f-a19b-df0454a33902", "top": 0.37083333333333335, "left": 0.04537037037037037, "width": 0.42407407407407405, "height": 0.24375, "zIndex": 1, "photoIndex": 2, "borderRadius": 0}, {"id": "cab0f5ca-2ea1-46c3-81e0-d8331e8a5c6e", "top": 0.37083333333333335, "left": 0.5342592592592592, "width": 0.42407407407407405, "height": 0.24375, "zIndex": 1, "photoIndex": 3, "borderRadius": 0}, {"id": "d935a8a1-77c3-4e25-aeee-d4462f8941e9", "top": 0.6375, "left": 0.04537037037037037, "width": 0.42407407407407405, "height": 0.24375, "zIndex": 1, "photoIndex": 4, "borderRadius": 0}, {"id": "7d2cfa0c-fca8-4903-bab4-dff2ca6070d1", "top": 0.6395833333333333, "left": 0.5342592592592592, "width": 0.42407407407407405, "height": 0.24375, "zIndex": 1, "photoIndex": 5, "borderRadius": 0}]	6	f	free	t	0	0	6c249429-4c20-4516-8d62-385986482709	2025-12-05 02:27:41.75976+07	2025-12-05 02:27:41.75976+07	{"elements": [{"x": 0, "y": 0, "id": "upload_1764876436341_tdlgurrk4", "data": {"image": "https://ik.imagekit.io/y6rewkryo/frame-overlays/1764876458685_rub45f_overlay_upload_1_png.jpg", "label": "Unggahan", "objectFit": "contain", "__isOverlay": true, "borderRadius": 0, "imageAspectRatio": 0.5625}, "type": "upload", "width": 1080, "xNorm": 0, "yNorm": 0, "height": 1920, "locked": false, "zIndex": 500, "widthNorm": 1, "heightNorm": 1}], "aspectRatio": "9:16", "orientation": "portrait", "backgroundColor": "#000000"}	#ffffff	1080	1920	999
frame_1764876361505_a7dpzoa8n	Inspired by Lomba Sihir – Obrolan Jam 3 Pagi	Frame ini mengusung vibe malam hari yang quirky dan playful, dengan aksen bintang kecil yang terasa dreamy. Warna merah marun memberikan atmosfer intim namun tetap penuh karakter, mencerminkan gaya visual Lomba Sihir yang eksperimental dan artsy. Frame ini dapat digunakan tanpa biaya apapun.	Music	/uploads/frames/6c43d32a-5a1d-4dc9-b1cb-7439d9da826e.webp	\N	[{"id": "70c6ef8e-823c-46ff-bbe6-94bad02d4256", "top": 0.13333333333333333, "left": 0.041666666666666664, "width": 0.412962962962963, "height": 0.175, "zIndex": 1, "photoIndex": 0, "borderRadius": 0}, {"id": "f699d7d3-7629-4e42-bd37-f1d418d51c12", "top": 0.13541666666666666, "left": 0.5305555555555556, "width": 0.412962962962963, "height": 0.175, "zIndex": 1, "photoIndex": 1, "borderRadius": 0}, {"id": "2f55996b-d1a5-4e5d-bd4a-31b59d3a4939", "top": 0.33541666666666664, "left": 0.04537037037037037, "width": 0.412962962962963, "height": 0.175, "zIndex": 1, "photoIndex": 2, "borderRadius": 0}, {"id": "0589dd4a-ff3c-44a7-8e51-4e45f62ffc14", "top": 0.3333333333333333, "left": 0.537962962962963, "width": 0.412962962962963, "height": 0.175, "zIndex": 1, "photoIndex": 3, "borderRadius": 0}, {"id": "a375e40a-fd12-4fe3-8d88-6ddbc593367d", "top": 0.5395833333333333, "left": 0.049074074074074076, "width": 0.412962962962963, "height": 0.175, "zIndex": 1, "photoIndex": 4, "borderRadius": 0}, {"id": "f5c09220-6387-4c86-9d6e-72c39a3f4ab8", "top": 0.5354166666666667, "left": 0.537962962962963, "width": 0.412962962962963, "height": 0.175, "zIndex": 1, "photoIndex": 5, "borderRadius": 0}, {"id": "92d6b670-ad3b-448d-a1e3-aa7edbaea8bc", "top": 0.74375, "left": 0.049074074074074076, "width": 0.412962962962963, "height": 0.175, "zIndex": 1, "photoIndex": 6, "borderRadius": 0}, {"id": "c84306a0-122c-4f2f-8334-9ef26454b9ef", "top": 0.74375, "left": 0.5342592592592592, "width": 0.412962962962963, "height": 0.175, "zIndex": 1, "photoIndex": 7, "borderRadius": 0}]	8	f	free	t	0	0	6c249429-4c20-4516-8d62-385986482709	2025-12-05 02:26:01.51976+07	2025-12-05 02:26:01.51976+07	{"elements": [{"x": 0.0000457763671875, "y": 0.00000286102294921875, "id": "upload_1764876325287_dkftgfy84", "data": {"image": "https://ik.imagekit.io/y6rewkryo/frame-overlays/1764876359416_7cmj2r_overlay_upload_1_png.jpg", "label": "Unggahan", "objectFit": "contain", "__isOverlay": true, "borderRadius": 0, "imageAspectRatio": 0.5625}, "type": "upload", "width": 1080, "xNorm": 0.00000004238552517361111, "yNorm": 0.0000000014901161193847657, "height": 1920, "locked": false, "zIndex": 500, "widthNorm": 1, "heightNorm": 1}], "aspectRatio": "9:16", "orientation": "portrait", "backgroundColor": "#f7f1ed"}	#ffffff	1080	1920	999
frame_1764876564966_lw5rn2t6h	Inspired by The Beatles – Revolver	Frame ini didominasi sketsa garis hitam tipis khas ilustrasi album Revolver. Kesannya artistik, abstrak, dan penuh detail halus. Background putih-keabuannya menonjolkan kesederhanaan namun tetap terasa kuat secara visual. Cocok untuk konten yang ingin tampil artsy dan klasik. Frame ini dapat digunakan tanpa biaya apapun.	Music	/uploads/frames/5dd3010e-12d2-4c66-aa16-bd876a37629f.webp	\N	[{"id": "c26c35eb-58c6-4442-944d-1b7291e740d3", "top": 0.1125, "left": 0.041666666666666664, "width": 0.42407407407407405, "height": 0.18958333333333333, "zIndex": 1, "photoIndex": 0, "borderRadius": 0}, {"id": "9104a555-b348-4adb-933f-f7b1afd5afdc", "top": 0.11041666666666666, "left": 0.5342592592592592, "width": 0.42407407407407405, "height": 0.18958333333333333, "zIndex": 1, "photoIndex": 1, "borderRadius": 0}, {"id": "9eacc4a9-7618-40d9-902f-fb93cc30b995", "top": 0.325, "left": 0.03796296296296296, "width": 0.42407407407407405, "height": 0.18958333333333333, "zIndex": 1, "photoIndex": 2, "borderRadius": 0}, {"id": "1416f5b9-2812-43af-b1f5-901cb212ac85", "top": 0.325, "left": 0.5342592592592592, "width": 0.42407407407407405, "height": 0.18958333333333333, "zIndex": 1, "photoIndex": 3, "borderRadius": 0}, {"id": "d64a37ad-1dc1-43c7-926b-643ea6c697da", "top": 0.5354166666666667, "left": 0.04537037037037037, "width": 0.42407407407407405, "height": 0.18958333333333333, "zIndex": 1, "photoIndex": 4, "borderRadius": 0}, {"id": "ea72eb0f-c2a3-40ed-8418-9a928653c8af", "top": 0.5354166666666667, "left": 0.537962962962963, "width": 0.42407407407407405, "height": 0.18958333333333333, "zIndex": 1, "photoIndex": 5, "borderRadius": 0}, {"id": "0f2ec772-7d94-4097-92cf-5c67580e3db7", "top": 0.7479166666666667, "left": 0.04537037037037037, "width": 0.42407407407407405, "height": 0.18958333333333333, "zIndex": 1, "photoIndex": 6, "borderRadius": 0}, {"id": "52a66e88-02d0-4deb-9f3f-7a098d4dd8ef", "top": 0.7479166666666667, "left": 0.5342592592592592, "width": 0.42407407407407405, "height": 0.18958333333333333, "zIndex": 1, "photoIndex": 7, "borderRadius": 0}]	8	f	free	t	0	0	6c249429-4c20-4516-8d62-385986482709	2025-12-05 02:29:24.997127+07	2025-12-05 02:29:24.997127+07	{"elements": [{"x": 0.00002288818359375, "y": 0, "id": "upload_1764876539877_v2jtfrrzd", "data": {"image": "https://ik.imagekit.io/y6rewkryo/frame-overlays/1764876562346_yyn39s_overlay_upload_1_png.jpg", "label": "Unggahan", "objectFit": "contain", "__isOverlay": true, "borderRadius": 0, "imageAspectRatio": 0.5625}, "type": "upload", "width": 1080, "xNorm": 0.000000021192762586805556, "yNorm": 0, "height": 1920, "locked": false, "zIndex": 500, "widthNorm": 1, "heightNorm": 1}], "aspectRatio": "9:16", "orientation": "portrait", "backgroundColor": "#000000"}	#ffffff	1080	1920	999
\.


--
-- Data for Name: page_views; Type: TABLE DATA; Schema: public; Owner: fremio_user
--

COPY public.page_views (id, session_id, user_id, page_path, page_title, referrer, device_type, browser, browser_version, os, os_version, screen_width, screen_height, country, city, ip_address, time_on_page, created_at) FROM stdin;
5d35275c-d65f-4c69-9fc9-cbd1b6affb56	test123	\N	/test	\N	\N	desktop	Unknown		Unknown		\N	\N	\N	\N	::1	0	2025-12-02 22:46:26.147628+07
57ce20e9-4262-4226-a674-4deb6276be6a	test123	\N	/test	\N	\N	desktop	Unknown		Unknown		\N	\N	\N	\N	::1	0	2025-12-02 22:46:31.112508+07
\.


--
-- Data for Name: payment_transactions; Type: TABLE DATA; Schema: public; Owner: fremio_user
--

COPY public.payment_transactions (id, user_id, subscription_id, transaction_type, amount, currency, status, gateway, gateway_transaction_id, gateway_response, invoice_number, invoice_url, receipt_url, payment_method, payment_method_details, paid_at, expires_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: subscription_plans; Type: TABLE DATA; Schema: public; Owner: fremio_user
--

COPY public.subscription_plans (id, name, description, price_monthly, price_yearly, currency, features, limits, is_active, created_at) FROM stdin;
free	Free	Fitur dasar untuk pengguna biasa	0.00	0.00	IDR	["5 downloads/bulan", "Frame basic", "Watermark"]	{"watermark": true, "storage_mb": 100, "downloads_per_month": 5}	t	2025-12-02 21:30:41.863249+07
pro	Pro	Untuk content creator	49000.00	490000.00	IDR	["Unlimited downloads", "Semua frame premium", "Tanpa watermark", "Priority support"]	{"watermark": false, "storage_mb": 5000, "downloads_per_month": -1}	t	2025-12-02 21:30:41.863249+07
business	Business	Untuk bisnis dan agency	149000.00	1490000.00	IDR	["Semua fitur Pro", "Custom branding", "API access", "Team members", "Analytics"]	{"watermark": false, "storage_mb": 50000, "team_members": 5, "downloads_per_month": -1}	t	2025-12-02 21:30:41.863249+07
\.


--
-- Data for Name: user_cohorts; Type: TABLE DATA; Schema: public; Owner: fremio_user
--

COPY public.user_cohorts (id, user_id, cohort_date, cohort_type, day_0_active, day_1_active, day_7_active, day_14_active, day_30_active, day_60_active, day_90_active, activated, activation_date, last_active_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: user_events; Type: TABLE DATA; Schema: public; Owner: fremio_user
--

COPY public.user_events (id, session_id, user_id, event_name, event_category, event_data, page_path, element_id, element_class, created_at) FROM stdin;
d7e66206-c461-4460-9476-66466139d3fa	\N	\N	frame_view	frame	{"frameId": "test1"}	\N	\N	\N	2025-12-02 22:46:39.694848+07
0e599ae1-9fe9-4f97-b0c5-0b4d1f2a4aba	1764834342548-icm2rcef5	\N	visit	funnel	{"userId": "anon_1764722339889_wm7xtlwkv"}	\N	\N	\N	2025-12-04 14:45:47.566051+07
922b20a7-4091-4d10-bf1f-1f007b68b5f5	1764834342548-icm2rcef5	\N	visit	funnel	{"userId": "anon_1764722339889_wm7xtlwkv"}	\N	\N	\N	2025-12-04 14:45:47.573663+07
54f2e5a9-7bcc-400d-99a7-ea1cb913546c	1764834387836-avuui8zum	\N	visit	funnel	{"userId": "fremioid@admin.com"}	\N	\N	\N	2025-12-04 14:46:32.853413+07
cc318f7b-79aa-4df2-95b3-8353f74eb714	1764834387836-avuui8zum	\N	visit	funnel	{"userId": "fremioid@admin.com"}	\N	\N	\N	2025-12-04 14:46:32.867327+07
d83fd966-6dad-441a-bf41-14c2af4290e4	1764837120159-lyhg4lb5c	\N	visit	funnel	{"userId": "fremioid@admin.com"}	\N	\N	\N	2025-12-04 15:32:05.166767+07
3965d400-9238-406d-975c-4a125b324621	1764837120159-lyhg4lb5c	\N	visit	funnel	{"userId": "fremioid@admin.com"}	\N	\N	\N	2025-12-04 15:32:05.175787+07
e6a31005-f1e5-4df9-99b4-70c45a2e0620	1764839322549-kieoop2js	\N	visit	funnel	{"userId": "fremioid@admin.com"}	\N	\N	\N	2025-12-04 16:08:47.564345+07
37e87d0d-1612-402e-af22-9c3647c19558	1764839322549-kieoop2js	\N	visit	funnel	{"userId": "fremioid@admin.com"}	\N	\N	\N	2025-12-04 16:08:47.572318+07
88640e33-733c-456d-bc8d-a0038f211a26	1764839322549-kieoop2js	\N	frame_view	frame	{"frameId": "frame_1764839304284_zma4vb95w", "frameName": null}	\N	\N	\N	2025-12-04 16:09:04.367386+07
5bdafa81-451e-4040-8347-fc30f0a4eca8	1764840002356-44dtcska9	\N	visit	funnel	{"userId": "fremioid@admin.com"}	\N	\N	\N	2025-12-04 16:20:07.371299+07
ec25a418-d615-4aab-bdab-46a6770dd41f	1764840002356-44dtcska9	\N	visit	funnel	{"userId": "fremioid@admin.com"}	\N	\N	\N	2025-12-04 16:20:07.38068+07
ee34eaee-8e59-42c2-ba01-5ee3d6676c98	1764840002356-44dtcska9	\N	frame_view	frame	{"frameId": "frame_1764839304284_zma4vb95w", "frameName": null}	\N	\N	\N	2025-12-04 16:20:13.782372+07
1ef8e81b-118e-40e8-80d3-844da67576c6	1764840528674-ot36pp0oa	\N	frame_view	frame	{"frameId": "frame_1764839304284_zma4vb95w", "frameName": null}	\N	\N	\N	2025-12-04 16:28:53.687008+07
85a29289-4975-4155-9a01-204e25c80da1	1764840528674-ot36pp0oa	\N	frame_view	frame	{"frameId": "frame_1764839304284_zma4vb95w", "frameName": null}	\N	\N	\N	2025-12-04 16:29:26.271797+07
051a4a77-9975-481f-83f9-0d961d1e4ba7	1764840528674-ot36pp0oa	\N	visit	funnel	{"userId": "anon_1764840273970_hl1vk6q7d"}	\N	\N	\N	2025-12-04 16:29:26.276987+07
7660c622-dfdf-4df8-a0d2-b5e0906db53f	1764840528674-ot36pp0oa	\N	visit	funnel	{"userId": "anon_1764840273970_hl1vk6q7d"}	\N	\N	\N	2025-12-04 16:29:26.282668+07
68bb452a-b77e-41bd-b420-337f7ddbad9e	1764840528674-ot36pp0oa	\N	frame_view	frame	{"frameId": "frame_1764839304284_zma4vb95w", "frameName": null}	\N	\N	\N	2025-12-04 16:29:38.243382+07
085e34f1-006b-4eb0-a2f8-d19cc8e8219f	1764840528674-ot36pp0oa	\N	photo_taken	funnel	{"userId": "anon_1764840273970_hl1vk6q7d"}	\N	\N	\N	2025-12-04 16:29:43.619748+07
d48fd7d2-a063-4bd6-8597-c93776faeb45	1764840528674-ot36pp0oa	\N	photo_taken	funnel	{"userId": "anon_1764840273970_hl1vk6q7d"}	\N	\N	\N	2025-12-04 16:29:43.626447+07
c1e26fb6-8c9e-4889-933d-f16d252dfa6d	1764840528674-ot36pp0oa	\N	photo_taken	funnel	{"userId": "anon_1764840273970_hl1vk6q7d"}	\N	\N	\N	2025-12-04 16:29:51.075673+07
a366d375-c672-477d-897d-5c4cbe8440e0	1764840528674-ot36pp0oa	\N	photo_taken	funnel	{"userId": "anon_1764840273970_hl1vk6q7d"}	\N	\N	\N	2025-12-04 16:29:51.080494+07
2a0835f5-52d9-408e-b619-a4e9c54a84fa	1764840528674-ot36pp0oa	\N	photo_taken	funnel	{"userId": "anon_1764840273970_hl1vk6q7d"}	\N	\N	\N	2025-12-04 16:29:58.745461+07
1d3f09d5-5c1d-4df6-91b9-c79cce8aa63e	1764840528674-ot36pp0oa	\N	photo_taken	funnel	{"userId": "anon_1764840273970_hl1vk6q7d"}	\N	\N	\N	2025-12-04 16:29:58.751356+07
ccdbf5cc-0a33-461f-b34d-c517ae098063	1764841037677-bzik4glxm	\N	frame_view	frame	{"frameId": "frame_1764841029090_zv7zgorm3", "frameName": null}	\N	\N	\N	2025-12-04 16:37:22.686978+07
06c6b1c6-7888-425f-9aff-c75b6c695473	1764841305846-vnbdt4cse	\N	visit	funnel	{"userId": "anon_1764841305848_vdefasjax"}	\N	\N	\N	2025-12-04 16:41:50.861444+07
53e76e0a-180a-4863-8443-1a5f13b8af15	1764841305846-vnbdt4cse	\N	visit	funnel	{"userId": "anon_1764841305848_vdefasjax"}	\N	\N	\N	2025-12-04 16:41:50.875892+07
950e5303-c3d4-4eb4-baf1-b44f67eda0f8	1764841305846-vnbdt4cse	\N	frame_view	frame	{"frameId": "frame_1764841291770_hgt0g5yct", "frameName": null}	\N	\N	\N	2025-12-04 16:41:50.881058+07
e57f3f2c-971e-454a-a759-4e776a33eff0	1764841333283-y51fs0jjy	\N	visit	funnel	{"userId": "anon_1764841305848_vdefasjax"}	\N	\N	\N	2025-12-04 16:42:18.295156+07
b492cb57-5179-4ff6-a4f1-f8e18dd0d50b	1764841333283-y51fs0jjy	\N	visit	funnel	{"userId": "anon_1764841305848_vdefasjax"}	\N	\N	\N	2025-12-04 16:42:18.300701+07
cc7ba669-4001-4125-af5c-a7d3c41455c9	1764841370310-pp1katykj	\N	frame_view	frame	{"frameId": "frame_1764841364670_kljvrija6", "frameName": null}	\N	\N	\N	2025-12-04 16:42:55.324748+07
dc2b17cf-6e54-42a3-a6f8-2e9407d60d61	1764841599747-usnjs530m	\N	frame_view	frame	{"frameId": "frame_1764841593122_vi869129a", "frameName": null}	\N	\N	\N	2025-12-04 16:46:44.758608+07
dee48b2a-32ed-45b5-818c-526cb8741c82	1764841827781-e03ya5qk9	\N	frame_view	frame	{"frameId": "frame_1764841811186_idgz4ubyt", "frameName": null}	\N	\N	\N	2025-12-04 16:50:32.792394+07
bd010f5a-f17f-4e17-9ee7-5633aff93c4e	1764842772520-wj0uvujxd	\N	frame_view	frame	{"frameId": "frame_1764841811186_idgz4ubyt", "frameName": null}	\N	\N	\N	2025-12-04 17:06:17.534283+07
41c4ba86-3f77-4b2e-a7b8-51ae3ac9f2f9	1764842772520-wj0uvujxd	\N	frame_view	frame	{"frameId": "frame_1764842810239_mtqh42lky", "frameName": null}	\N	\N	\N	2025-12-04 17:06:59.114032+07
29a43bd3-f664-458c-a1d5-7259ce2df59f	1764843183300-emdv8poj3	\N	frame_view	frame	{"frameId": "frame_1764843166485_lrxjrz5zz", "frameName": null}	\N	\N	\N	2025-12-04 17:13:08.315527+07
12e4dfde-2258-4bb4-8adc-84a930db96bf	1764843202966-1okv903zx	\N	frame_view	frame	{"frameId": "frame_1764843166485_lrxjrz5zz", "frameName": null}	\N	\N	\N	2025-12-04 17:13:27.976975+07
f470a6bc-ed4e-411e-9a24-5e76ffe76d0b	1764843202966-1okv903zx	\N	frame_view	frame	{"frameId": "frame_1764843166485_lrxjrz5zz", "frameName": null}	\N	\N	\N	2025-12-04 17:13:50.66401+07
9bebe32a-b2fe-4a69-9bef-758db25c9f9d	1764843202966-1okv903zx	\N	photo_taken	funnel	{"userId": "fremioid@admin.com"}	\N	\N	\N	2025-12-04 17:13:57.517274+07
08a1a8d9-d0ed-42b9-b533-922626ec649c	1764843202966-1okv903zx	\N	photo_taken	funnel	{"userId": "fremioid@admin.com"}	\N	\N	\N	2025-12-04 17:13:57.522429+07
0c5c7e9c-0972-4541-8f53-4950a0e4b1ef	1764843202966-1okv903zx	\N	photo_taken	funnel	{"userId": "fremioid@admin.com"}	\N	\N	\N	2025-12-04 17:14:31.014847+07
48be48c1-9fa8-486c-98e6-e3ac66e95080	1764843202966-1okv903zx	\N	photo_taken	funnel	{"userId": "fremioid@admin.com"}	\N	\N	\N	2025-12-04 17:14:31.025611+07
1c7a4ecc-67e3-47ac-ada3-cc3e79db7c18	1764843202966-1okv903zx	\N	photo_taken	funnel	{"userId": "fremioid@admin.com"}	\N	\N	\N	2025-12-04 17:14:43.64823+07
860c5e05-c9d9-4750-b5cb-6b26e3a873ef	1764843202966-1okv903zx	\N	photo_taken	funnel	{"userId": "fremioid@admin.com"}	\N	\N	\N	2025-12-04 17:14:43.652493+07
532e61f6-2a10-44f6-a420-4b6ebe6a1d88	1764843202966-1okv903zx	\N	frame_view	frame	{"frameId": "frame_1764843166485_lrxjrz5zz", "frameName": null}	\N	\N	\N	2025-12-04 17:20:20.891626+07
878011e2-d26c-49be-bc96-71296066d6b3	1764843739600-pq86jbfbt	\N	frame_view	frame	{"frameId": "frame_1764843734460_htozlj5k9", "frameName": null}	\N	\N	\N	2025-12-04 17:22:24.614646+07
479d5ab7-4d56-4470-ae83-60ca2a3e9831	1764844245132-vopt9q7sd	\N	frame_view	frame	{"frameId": "frame_1764843734460_htozlj5k9", "frameName": null}	\N	\N	\N	2025-12-04 17:30:50.145946+07
91c95555-2ef1-4fb5-8abb-207533467a05	1764844262564-m5k8lx3db	\N	frame_view	frame	{"frameId": "frame_1764843734460_htozlj5k9", "frameName": null}	\N	\N	\N	2025-12-04 17:31:07.57564+07
39898f57-106b-40a0-b2d9-3f686f2b6e06	1764845185280-mn5ykde9k	\N	frame_view	frame	{"frameId": "frame_1764845156274_ps1va7254", "frameName": null}	\N	\N	\N	2025-12-04 17:46:30.294846+07
b7110e78-8497-4731-8fbc-ca6a4c86e8e2	1764845485768-lx49finkn	\N	frame_view	frame	{"frameId": "frame_1764844997245_xttj0oy0p", "frameName": null}	\N	\N	\N	2025-12-04 17:51:30.785739+07
02e5e358-1539-4a3e-ae20-adb0892da460	1764846262935-pr00vx6a7	\N	frame_view	frame	{"frameId": "frame_1764845824727_0ukwpx1zu", "frameName": null}	\N	\N	\N	2025-12-04 18:04:27.952207+07
eb1ae89f-c79a-4b7b-811c-e21ea20961c7	1764846383879-p3r4oh5mh	\N	visit	funnel	{"userId": "fremioid@admin.com"}	\N	\N	\N	2025-12-04 18:06:28.88969+07
05eb5612-703c-4250-a62e-13e081bc32dd	1764846383879-p3r4oh5mh	\N	visit	funnel	{"userId": "fremioid@admin.com"}	\N	\N	\N	2025-12-04 18:06:28.895909+07
5dc7b45a-a95b-450b-9454-2d2d371eda49	1764846383879-p3r4oh5mh	\N	frame_view	frame	{"frameId": "frame_1764846025386_f8ggnhbk5", "frameName": null}	\N	\N	\N	2025-12-04 18:09:35.465849+07
e1cfa372-09f8-44ec-931f-c10bbb7792a1	1764846383879-p3r4oh5mh	\N	photo_taken	funnel	{"userId": "fremioid@admin.com"}	\N	\N	\N	2025-12-04 18:14:35.296307+07
fe2b2198-914b-45ff-8c17-850a799de3be	1764846383879-p3r4oh5mh	\N	photo_taken	funnel	{"userId": "fremioid@admin.com"}	\N	\N	\N	2025-12-04 18:14:35.305992+07
da2e316c-f50c-4548-b07b-c8fe36b5b435	1764846383879-p3r4oh5mh	\N	photo_taken	funnel	{"userId": "fremioid@admin.com"}	\N	\N	\N	2025-12-04 18:14:44.593754+07
e814bef7-1d88-4ebe-a07a-be884b8b4cf6	1764846383879-p3r4oh5mh	\N	photo_taken	funnel	{"userId": "fremioid@admin.com"}	\N	\N	\N	2025-12-04 18:14:44.600295+07
75e5207d-a385-4151-8316-9d0b9a4354c4	1764846383879-p3r4oh5mh	\N	photo_taken	funnel	{"userId": "fremioid@admin.com"}	\N	\N	\N	2025-12-04 18:14:57.390848+07
c34d6882-b251-477c-9425-c9ab4e3aa177	1764846383879-p3r4oh5mh	\N	photo_taken	funnel	{"userId": "fremioid@admin.com"}	\N	\N	\N	2025-12-04 18:14:57.394757+07
990aacb5-8df6-406e-ae19-b5b4ebafe0cb	1764846383879-p3r4oh5mh	\N	photo_taken	funnel	{"userId": "fremioid@admin.com"}	\N	\N	\N	2025-12-04 18:15:05.22652+07
d322e03e-90c9-4e73-a3a1-fb053302bb41	1764846383879-p3r4oh5mh	\N	photo_taken	funnel	{"userId": "fremioid@admin.com"}	\N	\N	\N	2025-12-04 18:15:05.523418+07
2b2c27b0-81bc-4ca2-b527-5ceafd876907	1764875584668-3xbir24t8	\N	frame_view	frame	{"frameId": "frame_1764871642733_itvbvht5d", "frameName": null}	\N	\N	\N	2025-12-05 02:13:09.691325+07
ce2f3dc0-5e14-408a-9c11-d92e484f920b	1764875584668-3xbir24t8	\N	frame_view	frame	{"frameId": "frame_1764875584567_053l45x0r", "frameName": null}	\N	\N	\N	2025-12-05 02:13:17.506121+07
1e243164-c07d-4380-aaa9-098bfe92487d	1764875584668-3xbir24t8	\N	visit	funnel	{"userId": "fremioid@admin.com"}	\N	\N	\N	2025-12-05 02:13:44.174155+07
34b76160-c6ba-4e99-ae69-08f8d6a67a5f	1764875584668-3xbir24t8	\N	visit	funnel	{"userId": "fremioid@admin.com"}	\N	\N	\N	2025-12-05 02:13:44.178835+07
9c0c9832-2566-4657-943e-4deb159d6d21	1764876580798-v8hcrphss	\N	visit	funnel	{"userId": "fremioid@admin.com"}	\N	\N	\N	2025-12-05 02:29:45.813006+07
e7eabf3a-42c2-4c2f-8af5-b704af42bc3a	1764876580798-v8hcrphss	\N	visit	funnel	{"userId": "fremioid@admin.com"}	\N	\N	\N	2025-12-05 02:29:45.822277+07
44132317-db34-4658-bb77-9ab5574e8b09	1764876580798-v8hcrphss	\N	visit	funnel	{"userId": "fremioid@admin.com"}	\N	\N	\N	2025-12-05 02:30:13.446265+07
1f6d98ef-6d7e-43ef-b618-01c1e01bbeed	1764876580798-v8hcrphss	\N	visit	funnel	{"userId": "fremioid@admin.com"}	\N	\N	\N	2025-12-05 02:30:13.4753+07
\.


--
-- Data for Name: user_sessions; Type: TABLE DATA; Schema: public; Owner: fremio_user
--

COPY public.user_sessions (id, session_id, user_id, started_at, ended_at, duration_seconds, page_count, entry_page, exit_page, utm_source, utm_medium, utm_campaign, referrer_domain, device_type, browser, os, country, is_bounce, created_at) FROM stdin;
bae65dfe-5556-4a1e-94ec-39eae1927ba8	1764834342548-icm2rcef5	\N	2025-12-04 14:45:42.606312+07	\N	\N	0	\N	\N	\N	\N	\N	\N	desktop	Safari	macOS	\N	f	2025-12-04 14:45:42.606312+07
923a2139-9184-496f-a151-9ee2a318bfbe	1764834387836-avuui8zum	\N	2025-12-04 14:46:28.024681+07	\N	\N	0	\N	\N	\N	\N	\N	\N	desktop	Safari	macOS	\N	f	2025-12-04 14:46:28.024681+07
1bc3a647-9fba-42b5-bb7c-ef9064d18c41	1764837120159-lyhg4lb5c	\N	2025-12-04 15:32:00.178481+07	\N	\N	0	\N	\N	\N	\N	\N	\N	desktop	Safari	macOS	\N	f	2025-12-04 15:32:00.178481+07
dd863702-d20b-4964-8f72-f4d0bc1e488c	1764839322549-kieoop2js	\N	2025-12-04 16:08:42.557649+07	\N	\N	0	\N	\N	\N	\N	\N	\N	desktop	Safari	macOS	\N	f	2025-12-04 16:08:42.557649+07
99e0f6a7-6d30-4242-b423-8e0c1e4c7779	1764840002356-44dtcska9	\N	2025-12-04 16:20:02.403638+07	\N	\N	0	\N	\N	\N	\N	\N	\N	desktop	Safari	macOS	\N	f	2025-12-04 16:20:02.403638+07
742990ab-162f-4ce4-8da3-647aac02864f	1764840528674-ot36pp0oa	\N	2025-12-04 16:28:48.707228+07	\N	\N	0	\N	\N	\N	\N	\N	192.168.100.160	desktop	Safari	macOS	\N	f	2025-12-04 16:28:48.707228+07
54bb35b4-db2e-4769-9fba-6882418128c4	1764840613997-efupjze2n	\N	2025-12-04 16:30:14.00096+07	\N	\N	0	\N	\N	\N	\N	\N	\N	desktop	Safari	macOS	\N	f	2025-12-04 16:30:14.00096+07
571d86ea-62af-4f1a-bd4a-90e83806ccbc	1764841037677-bzik4glxm	\N	2025-12-04 16:37:17.686966+07	\N	\N	0	\N	\N	\N	\N	\N	192.168.100.160	desktop	Safari	macOS	\N	f	2025-12-04 16:37:17.686966+07
ae374845-2e1a-4bed-af3d-388488fa30f3	1764841305846-vnbdt4cse	\N	2025-12-04 16:41:45.863998+07	\N	\N	0	\N	\N	\N	\N	\N	\N	desktop	Safari	macOS	\N	f	2025-12-04 16:41:45.863998+07
6372de23-8cf0-46e2-a049-f718379d6d75	1764841333283-y51fs0jjy	\N	2025-12-04 16:42:13.324112+07	\N	\N	0	\N	\N	\N	\N	\N	\N	desktop	Safari	macOS	\N	f	2025-12-04 16:42:13.324112+07
706632ed-260c-40f7-a6c2-fa5ded965689	1764841370310-pp1katykj	\N	2025-12-04 16:42:50.319773+07	\N	\N	0	\N	\N	\N	\N	\N	\N	desktop	Safari	macOS	\N	f	2025-12-04 16:42:50.319773+07
028f2302-404e-4e36-944f-c6320bf2fc8a	1764841599747-usnjs530m	\N	2025-12-04 16:46:39.758417+07	\N	\N	0	\N	\N	\N	\N	\N	\N	desktop	Safari	macOS	\N	f	2025-12-04 16:46:39.758417+07
792fd473-6bcc-42d4-a29e-516d345a73a7	1764841827781-e03ya5qk9	\N	2025-12-04 16:50:27.789699+07	\N	\N	0	\N	\N	\N	\N	\N	\N	desktop	Safari	macOS	\N	f	2025-12-04 16:50:27.789699+07
ad54455e-2754-4d05-ab42-c0a89591ea9c	1764842754760-goz4rba4v	\N	2025-12-04 17:05:54.803497+07	\N	\N	0	\N	\N	\N	\N	\N	\N	desktop	Safari	macOS	\N	f	2025-12-04 17:05:54.803497+07
3f5ebcba-afd1-41a8-aa13-21ee06e16307	1764842772520-wj0uvujxd	\N	2025-12-04 17:06:12.530241+07	\N	\N	0	\N	\N	\N	\N	\N	\N	desktop	Safari	macOS	\N	f	2025-12-04 17:06:12.530241+07
47ca6215-aef1-4e14-bf2b-bec07fc88d96	1764843183300-emdv8poj3	\N	2025-12-04 17:13:03.307512+07	\N	\N	0	\N	\N	\N	\N	\N	\N	desktop	Safari	macOS	\N	f	2025-12-04 17:13:03.307512+07
f0ed9b51-7d12-471e-bb3a-702f9bacda8f	1764843202966-1okv903zx	\N	2025-12-04 17:13:22.973025+07	\N	\N	0	\N	\N	\N	\N	\N	\N	desktop	Safari	macOS	\N	f	2025-12-04 17:13:22.973025+07
33994245-11da-4e78-8621-2072443ca848	1764843739600-pq86jbfbt	\N	2025-12-04 17:22:19.61123+07	\N	\N	0	\N	\N	\N	\N	\N	\N	desktop	Safari	macOS	\N	f	2025-12-04 17:22:19.61123+07
fdc64639-4e75-488f-a1fd-ed04af85bc5f	1764844245132-vopt9q7sd	\N	2025-12-04 17:30:45.14328+07	\N	\N	0	\N	\N	\N	\N	\N	\N	desktop	Safari	macOS	\N	f	2025-12-04 17:30:45.14328+07
d29494ca-6d40-4795-8033-05f13ee08cd7	1764844262564-m5k8lx3db	\N	2025-12-04 17:31:02.573621+07	\N	\N	0	\N	\N	\N	\N	\N	\N	desktop	Safari	macOS	\N	f	2025-12-04 17:31:02.573621+07
6c61361c-e777-499f-a123-0f0880780a43	1764845185280-mn5ykde9k	\N	2025-12-04 17:46:25.298362+07	\N	\N	0	\N	\N	\N	\N	\N	\N	desktop	Safari	macOS	\N	f	2025-12-04 17:46:25.298362+07
5834250a-9b4f-4daa-b196-4a0e587043f1	1764845485768-lx49finkn	\N	2025-12-04 17:51:25.793417+07	\N	\N	0	\N	\N	\N	\N	\N	\N	desktop	Safari	macOS	\N	f	2025-12-04 17:51:25.793417+07
6da25481-f0bd-4bb0-bec6-26d273d2adc7	1764846262935-pr00vx6a7	\N	2025-12-04 18:04:22.953836+07	\N	\N	0	\N	\N	\N	\N	\N	\N	desktop	Safari	macOS	\N	f	2025-12-04 18:04:22.953836+07
16a2b9b2-4c25-4f1a-9362-35b8ff6beee9	1764846383879-p3r4oh5mh	\N	2025-12-04 18:06:23.891782+07	\N	\N	0	\N	\N	\N	\N	\N	\N	desktop	Safari	macOS	\N	f	2025-12-04 18:06:23.891782+07
265d1c2c-bd2c-4996-ad6e-9f757af19151	1764874771345-t2n64iqqy	\N	2025-12-05 01:59:31.527154+07	\N	\N	0	\N	\N	\N	\N	\N	\N	desktop	Safari	macOS	\N	f	2025-12-05 01:59:31.527154+07
7fa5bc13-f975-43e5-96c7-7d752e5a63c4	1764875584668-3xbir24t8	\N	2025-12-05 02:13:04.686541+07	\N	\N	0	\N	\N	\N	\N	\N	localhost	desktop	Safari	macOS	\N	f	2025-12-05 02:13:04.686541+07
86779ef2-ce55-4695-b50a-ab1c9aba20c3	1764876580798-v8hcrphss	\N	2025-12-05 02:29:40.824114+07	\N	\N	0	\N	\N	\N	\N	\N	localhost	desktop	Safari	macOS	\N	f	2025-12-05 02:29:40.824114+07
\.


--
-- Data for Name: user_subscriptions; Type: TABLE DATA; Schema: public; Owner: fremio_user
--

COPY public.user_subscriptions (id, user_id, plan_id, status, billing_cycle, current_period_start, current_period_end, cancel_at_period_end, cancelled_at, gateway, gateway_subscription_id, gateway_customer_id, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: user_usage; Type: TABLE DATA; Schema: public; Owner: fremio_user
--

COPY public.user_usage (id, user_id, period_start, period_end, downloads_count, frames_created, storage_used_mb, api_calls, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: fremio_user
--

COPY public.users (id, email, password_hash, display_name, photo_url, role, is_active, email_verified, created_at, updated_at) FROM stdin;
d6156105-6412-4175-998e-d184a3a15223	admin@fremio.com	$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.M5nwZvvGNHhHxm	Admin Fremio	\N	admin	t	f	2025-12-02 21:30:41.863915+07	2025-12-02 21:30:41.863915+07
6c249429-4c20-4516-8d62-385986482709	fremioid@admin.com	$2a$12$5CrLeOKS.B8qsf6RsndUfOlelRbnnt0h/.34UCmQ7a5bIupgxagY2	Admin Fremio	\N	admin	t	f	2025-12-02 23:27:45.563293+07	2025-12-05 02:09:59.081503+07
\.


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: fremio_user
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: contact_messages contact_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: fremio_user
--

ALTER TABLE ONLY public.contact_messages
    ADD CONSTRAINT contact_messages_pkey PRIMARY KEY (id);


--
-- Name: daily_stats daily_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: fremio_user
--

ALTER TABLE ONLY public.daily_stats
    ADD CONSTRAINT daily_stats_pkey PRIMARY KEY (id);


--
-- Name: daily_stats daily_stats_stat_date_key; Type: CONSTRAINT; Schema: public; Owner: fremio_user
--

ALTER TABLE ONLY public.daily_stats
    ADD CONSTRAINT daily_stats_stat_date_key UNIQUE (stat_date);


--
-- Name: download_logs download_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: fremio_user
--

ALTER TABLE ONLY public.download_logs
    ADD CONSTRAINT download_logs_pkey PRIMARY KEY (id);


--
-- Name: drafts drafts_pkey; Type: CONSTRAINT; Schema: public; Owner: fremio_user
--

ALTER TABLE ONLY public.drafts
    ADD CONSTRAINT drafts_pkey PRIMARY KEY (id);


--
-- Name: frames frames_pkey; Type: CONSTRAINT; Schema: public; Owner: fremio_user
--

ALTER TABLE ONLY public.frames
    ADD CONSTRAINT frames_pkey PRIMARY KEY (id);


--
-- Name: page_views page_views_pkey; Type: CONSTRAINT; Schema: public; Owner: fremio_user
--

ALTER TABLE ONLY public.page_views
    ADD CONSTRAINT page_views_pkey PRIMARY KEY (id);


--
-- Name: payment_transactions payment_transactions_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: fremio_user
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_invoice_number_key UNIQUE (invoice_number);


--
-- Name: payment_transactions payment_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: fremio_user
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_pkey PRIMARY KEY (id);


--
-- Name: subscription_plans subscription_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: fremio_user
--

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT subscription_plans_pkey PRIMARY KEY (id);


--
-- Name: user_cohorts user_cohorts_pkey; Type: CONSTRAINT; Schema: public; Owner: fremio_user
--

ALTER TABLE ONLY public.user_cohorts
    ADD CONSTRAINT user_cohorts_pkey PRIMARY KEY (id);


--
-- Name: user_cohorts user_cohorts_user_id_cohort_type_key; Type: CONSTRAINT; Schema: public; Owner: fremio_user
--

ALTER TABLE ONLY public.user_cohorts
    ADD CONSTRAINT user_cohorts_user_id_cohort_type_key UNIQUE (user_id, cohort_type);


--
-- Name: user_events user_events_pkey; Type: CONSTRAINT; Schema: public; Owner: fremio_user
--

ALTER TABLE ONLY public.user_events
    ADD CONSTRAINT user_events_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: fremio_user
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_session_id_key; Type: CONSTRAINT; Schema: public; Owner: fremio_user
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_session_id_key UNIQUE (session_id);


--
-- Name: user_subscriptions user_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: fremio_user
--

ALTER TABLE ONLY public.user_subscriptions
    ADD CONSTRAINT user_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: user_usage user_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: fremio_user
--

ALTER TABLE ONLY public.user_usage
    ADD CONSTRAINT user_usage_pkey PRIMARY KEY (id);


--
-- Name: user_usage user_usage_user_id_period_start_key; Type: CONSTRAINT; Schema: public; Owner: fremio_user
--

ALTER TABLE ONLY public.user_usage
    ADD CONSTRAINT user_usage_user_id_period_start_key UNIQUE (user_id, period_start);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: fremio_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: fremio_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_audit_action; Type: INDEX; Schema: public; Owner: fremio_user
--

CREATE INDEX idx_audit_action ON public.audit_log USING btree (action);


--
-- Name: idx_audit_table; Type: INDEX; Schema: public; Owner: fremio_user
--

CREATE INDEX idx_audit_table ON public.audit_log USING btree (table_name, record_id);


--
-- Name: idx_audit_user; Type: INDEX; Schema: public; Owner: fremio_user
--

CREATE INDEX idx_audit_user ON public.audit_log USING btree (user_id);


--
-- Name: idx_cohorts_date; Type: INDEX; Schema: public; Owner: fremio_user
--

CREATE INDEX idx_cohorts_date ON public.user_cohorts USING btree (cohort_date);


--
-- Name: idx_cohorts_user; Type: INDEX; Schema: public; Owner: fremio_user
--

CREATE INDEX idx_cohorts_user ON public.user_cohorts USING btree (user_id);


--
-- Name: idx_contact_read; Type: INDEX; Schema: public; Owner: fremio_user
--

CREATE INDEX idx_contact_read ON public.contact_messages USING btree (is_read);


--
-- Name: idx_daily_stats_date; Type: INDEX; Schema: public; Owner: fremio_user
--

CREATE INDEX idx_daily_stats_date ON public.daily_stats USING btree (stat_date);


--
-- Name: idx_downloads_date; Type: INDEX; Schema: public; Owner: fremio_user
--

CREATE INDEX idx_downloads_date ON public.download_logs USING btree (created_at);


--
-- Name: idx_downloads_frame; Type: INDEX; Schema: public; Owner: fremio_user
--

CREATE INDEX idx_downloads_frame ON public.download_logs USING btree (frame_id);


--
-- Name: idx_downloads_user; Type: INDEX; Schema: public; Owner: fremio_user
--

CREATE INDEX idx_downloads_user ON public.download_logs USING btree (user_id);


--
-- Name: idx_drafts_status; Type: INDEX; Schema: public; Owner: fremio_user
--

CREATE INDEX idx_drafts_status ON public.drafts USING btree (status);


--
-- Name: idx_drafts_updated; Type: INDEX; Schema: public; Owner: fremio_user
--

CREATE INDEX idx_drafts_updated ON public.drafts USING btree (updated_at DESC);


--
-- Name: idx_drafts_user; Type: INDEX; Schema: public; Owner: fremio_user
--

CREATE INDEX idx_drafts_user ON public.drafts USING btree (user_id);


--
-- Name: idx_events_date; Type: INDEX; Schema: public; Owner: fremio_user
--

CREATE INDEX idx_events_date ON public.user_events USING btree (created_at);


--
-- Name: idx_events_name; Type: INDEX; Schema: public; Owner: fremio_user
--

CREATE INDEX idx_events_name ON public.user_events USING btree (event_name);


--
-- Name: idx_events_session; Type: INDEX; Schema: public; Owner: fremio_user
--

CREATE INDEX idx_events_session ON public.user_events USING btree (session_id);


--
-- Name: idx_events_user; Type: INDEX; Schema: public; Owner: fremio_user
--

CREATE INDEX idx_events_user ON public.user_events USING btree (user_id);


--
-- Name: idx_frames_active; Type: INDEX; Schema: public; Owner: fremio_user
--

CREATE INDEX idx_frames_active ON public.frames USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_frames_category; Type: INDEX; Schema: public; Owner: fremio_user
--

CREATE INDEX idx_frames_category ON public.frames USING btree (category);


--
-- Name: idx_frames_created; Type: INDEX; Schema: public; Owner: fremio_user
--

CREATE INDEX idx_frames_created ON public.frames USING btree (created_at DESC);


--
-- Name: idx_frames_display_order; Type: INDEX; Schema: public; Owner: fremio_user
--

CREATE INDEX idx_frames_display_order ON public.frames USING btree (display_order);


--
-- Name: idx_frames_premium; Type: INDEX; Schema: public; Owner: fremio_user
--

CREATE INDEX idx_frames_premium ON public.frames USING btree (is_premium);


--
-- Name: idx_page_views_date; Type: INDEX; Schema: public; Owner: fremio_user
--

CREATE INDEX idx_page_views_date ON public.page_views USING btree (created_at);


--
-- Name: idx_page_views_path; Type: INDEX; Schema: public; Owner: fremio_user
--

CREATE INDEX idx_page_views_path ON public.page_views USING btree (page_path);


--
-- Name: idx_page_views_session; Type: INDEX; Schema: public; Owner: fremio_user
--

CREATE INDEX idx_page_views_session ON public.page_views USING btree (session_id);


--
-- Name: idx_page_views_user; Type: INDEX; Schema: public; Owner: fremio_user
--

CREATE INDEX idx_page_views_user ON public.page_views USING btree (user_id);


--
-- Name: idx_sessions_date; Type: INDEX; Schema: public; Owner: fremio_user
--

CREATE INDEX idx_sessions_date ON public.user_sessions USING btree (started_at);


--
-- Name: idx_sessions_session_id; Type: INDEX; Schema: public; Owner: fremio_user
--

CREATE INDEX idx_sessions_session_id ON public.user_sessions USING btree (session_id);


--
-- Name: idx_sessions_user; Type: INDEX; Schema: public; Owner: fremio_user
--

CREATE INDEX idx_sessions_user ON public.user_sessions USING btree (user_id);


--
-- Name: idx_subscriptions_period_end; Type: INDEX; Schema: public; Owner: fremio_user
--

CREATE INDEX idx_subscriptions_period_end ON public.user_subscriptions USING btree (current_period_end);


--
-- Name: idx_subscriptions_status; Type: INDEX; Schema: public; Owner: fremio_user
--

CREATE INDEX idx_subscriptions_status ON public.user_subscriptions USING btree (status);


--
-- Name: idx_subscriptions_user; Type: INDEX; Schema: public; Owner: fremio_user
--

CREATE INDEX idx_subscriptions_user ON public.user_subscriptions USING btree (user_id);


--
-- Name: idx_transactions_gateway; Type: INDEX; Schema: public; Owner: fremio_user
--

CREATE INDEX idx_transactions_gateway ON public.payment_transactions USING btree (gateway, gateway_transaction_id);


--
-- Name: idx_transactions_invoice; Type: INDEX; Schema: public; Owner: fremio_user
--

CREATE INDEX idx_transactions_invoice ON public.payment_transactions USING btree (invoice_number);


--
-- Name: idx_transactions_status; Type: INDEX; Schema: public; Owner: fremio_user
--

CREATE INDEX idx_transactions_status ON public.payment_transactions USING btree (status);


--
-- Name: idx_transactions_user; Type: INDEX; Schema: public; Owner: fremio_user
--

CREATE INDEX idx_transactions_user ON public.payment_transactions USING btree (user_id);


--
-- Name: idx_usage_user_period; Type: INDEX; Schema: public; Owner: fremio_user
--

CREATE INDEX idx_usage_user_period ON public.user_usage USING btree (user_id, period_start);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: fremio_user
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: fremio_user
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: payment_transactions audit_payment_changes; Type: TRIGGER; Schema: public; Owner: fremio_user
--

CREATE TRIGGER audit_payment_changes AFTER INSERT OR DELETE OR UPDATE ON public.payment_transactions FOR EACH ROW EXECUTE FUNCTION public.log_payment_changes();


--
-- Name: user_subscriptions audit_subscription_changes; Type: TRIGGER; Schema: public; Owner: fremio_user
--

CREATE TRIGGER audit_subscription_changes AFTER INSERT OR DELETE OR UPDATE ON public.user_subscriptions FOR EACH ROW EXECUTE FUNCTION public.log_subscription_changes();


--
-- Name: drafts update_drafts_updated_at; Type: TRIGGER; Schema: public; Owner: fremio_user
--

CREATE TRIGGER update_drafts_updated_at BEFORE UPDATE ON public.drafts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: frames update_frames_updated_at; Type: TRIGGER; Schema: public; Owner: fremio_user
--

CREATE TRIGGER update_frames_updated_at BEFORE UPDATE ON public.frames FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_subscriptions update_subscriptions_updated_at; Type: TRIGGER; Schema: public; Owner: fremio_user
--

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.user_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: payment_transactions update_transactions_updated_at; Type: TRIGGER; Schema: public; Owner: fremio_user
--

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.payment_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: fremio_user
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: audit_log audit_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fremio_user
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: download_logs download_logs_frame_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fremio_user
--

ALTER TABLE ONLY public.download_logs
    ADD CONSTRAINT download_logs_frame_id_fkey FOREIGN KEY (frame_id) REFERENCES public.frames(id) ON DELETE SET NULL;


--
-- Name: download_logs download_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fremio_user
--

ALTER TABLE ONLY public.download_logs
    ADD CONSTRAINT download_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: drafts drafts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fremio_user
--

ALTER TABLE ONLY public.drafts
    ADD CONSTRAINT drafts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: frames frames_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fremio_user
--

ALTER TABLE ONLY public.frames
    ADD CONSTRAINT frames_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: page_views page_views_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fremio_user
--

ALTER TABLE ONLY public.page_views
    ADD CONSTRAINT page_views_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: payment_transactions payment_transactions_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fremio_user
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.user_subscriptions(id);


--
-- Name: payment_transactions payment_transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fremio_user
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_cohorts user_cohorts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fremio_user
--

ALTER TABLE ONLY public.user_cohorts
    ADD CONSTRAINT user_cohorts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_events user_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fremio_user
--

ALTER TABLE ONLY public.user_events
    ADD CONSTRAINT user_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: user_sessions user_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fremio_user
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: user_subscriptions user_subscriptions_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fremio_user
--

ALTER TABLE ONLY public.user_subscriptions
    ADD CONSTRAINT user_subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id);


--
-- Name: user_subscriptions user_subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fremio_user
--

ALTER TABLE ONLY public.user_subscriptions
    ADD CONSTRAINT user_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_usage user_usage_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fremio_user
--

ALTER TABLE ONLY public.user_usage
    ADD CONSTRAINT user_usage_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 5riRYZUatoHjBzTnOJJRpvaUCm5SW33BIzooJR8S5B8ukMYxmVn2ZCchYYu4RBQ

