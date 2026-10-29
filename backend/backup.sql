--
-- PostgreSQL database dump
--

\restrict BLSJZWybEocHNAVxteSOGuH08Pd8XliIr16OGvXu4sfqT8FnuB2LGndK8OBmjdB

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alert_preferences; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.alert_preferences (
    id bigint NOT NULL,
    area_id bigint NOT NULL,
    minutes_before integer DEFAULT 30 NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT alert_preferences_minutes_before_check CHECK ((minutes_before >= 0))
);


ALTER TABLE public.alert_preferences OWNER TO postgres;

--
-- Name: alert_preferences_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.alert_preferences_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.alert_preferences_id_seq OWNER TO postgres;

--
-- Name: alert_preferences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.alert_preferences_id_seq OWNED BY public.alert_preferences.id;


--
-- Name: areas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.areas (
    id bigint NOT NULL,
    name character varying(150) NOT NULL,
    esp_area_id character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.areas OWNER TO postgres;

--
-- Name: areas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.areas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.areas_id_seq OWNER TO postgres;

--
-- Name: areas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.areas_id_seq OWNED BY public.areas.id;


--
-- Name: schedules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.schedules (
    id bigint NOT NULL,
    area_id bigint NOT NULL,
    stage integer,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    source character varying(50) DEFAULT 'manual'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT schedules_check CHECK ((end_time > start_time))
);


ALTER TABLE public.schedules OWNER TO postgres;

--
-- Name: schedules_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.schedules_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.schedules_id_seq OWNER TO postgres;

--
-- Name: schedules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.schedules_id_seq OWNED BY public.schedules.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    full_name character varying(150) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash text NOT NULL,
    area_id bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: alert_preferences id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alert_preferences ALTER COLUMN id SET DEFAULT nextval('public.alert_preferences_id_seq'::regclass);


--
-- Name: areas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.areas ALTER COLUMN id SET DEFAULT nextval('public.areas_id_seq'::regclass);


--
-- Name: schedules id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schedules ALTER COLUMN id SET DEFAULT nextval('public.schedules_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: alert_preferences; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.alert_preferences (id, area_id, minutes_before, enabled, created_at) FROM stdin;
\.


--
-- Data for Name: areas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.areas (id, name, esp_area_id, created_at) FROM stdin;
1	Soshanguve	\N	2026-10-13 09:49:57.243777+02
2	Pretoria	\N	2026-10-13 09:49:57.243777+02
3	Johannesburg	\N	2026-10-13 09:49:57.243777+02
5	QWA QWA	\N	2026-10-14 09:35:47.174929+02
8	Cape_Town	\N	2026-10-14 11:19:36.015433+02
10	Durban	\N	2026-10-14 11:20:18.47797+02
9	Soweto	\N	2026-10-14 11:19:46.309658+02
12	Makwane	\N	2026-10-15 12:42:06.62304+02
13	Thabong	\N	2026-10-15 12:42:17.043637+02
14	Thibella	\N	2026-10-15 12:42:22.386182+02
16	Lejwaneng	\N	2026-10-28 10:10:58.486555+02
\.


--
-- Data for Name: schedules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.schedules (id, area_id, stage, start_time, end_time, source, created_at) FROM stdin;
101	1	7	2026-10-29 18:00:00+02	2026-10-29 20:00:00+02	SIMULATED TEST DATA - NOT REAL	2026-10-28 10:11:12.387385+02
102	1	1	2026-10-30 19:00:00+02	2026-10-30 21:00:00+02	SIMULATED TEST DATA - NOT REAL	2026-10-28 10:11:12.387385+02
103	1	4	2026-10-31 21:00:00+02	2026-10-31 23:00:00+02	SIMULATED TEST DATA - NOT REAL	2026-10-28 10:11:12.387385+02
104	1	5	2026-11-02 12:00:00+02	2026-11-02 14:00:00+02	SIMULATED TEST DATA - NOT REAL	2026-10-28 10:11:12.387385+02
105	2	6	2026-10-30 21:00:00+02	2026-10-30 23:00:00+02	SIMULATED TEST DATA - NOT REAL	2026-10-28 10:11:12.387385+02
106	2	8	2026-11-01 15:00:00+02	2026-11-01 17:00:00+02	SIMULATED TEST DATA - NOT REAL	2026-10-28 10:11:12.387385+02
107	2	2	2026-11-01 22:00:00+02	2026-11-02 00:00:00+02	SIMULATED TEST DATA - NOT REAL	2026-10-28 10:11:12.387385+02
108	3	2	2026-10-30 17:00:00+02	2026-10-30 19:00:00+02	SIMULATED TEST DATA - NOT REAL	2026-10-28 10:11:12.387385+02
109	3	5	2026-10-30 18:00:00+02	2026-10-30 20:00:00+02	SIMULATED TEST DATA - NOT REAL	2026-10-28 10:11:12.387385+02
110	3	4	2026-11-01 17:00:00+02	2026-11-01 19:00:00+02	SIMULATED TEST DATA - NOT REAL	2026-10-28 10:11:12.387385+02
111	5	7	2026-11-04 22:00:00+02	2026-11-05 00:00:00+02	SIMULATED TEST DATA - NOT REAL	2026-10-28 10:11:12.387385+02
112	8	2	2026-11-01 22:00:00+02	2026-11-02 00:00:00+02	SIMULATED TEST DATA - NOT REAL	2026-10-28 10:11:12.387385+02
113	8	1	2026-11-01 15:00:00+02	2026-11-01 17:00:00+02	SIMULATED TEST DATA - NOT REAL	2026-10-28 10:11:12.387385+02
114	8	4	2026-11-04 20:00:00+02	2026-11-04 22:00:00+02	SIMULATED TEST DATA - NOT REAL	2026-10-28 10:11:12.387385+02
115	9	4	2026-11-02 10:00:00+02	2026-11-02 12:00:00+02	SIMULATED TEST DATA - NOT REAL	2026-10-28 10:11:12.387385+02
116	9	4	2026-11-03 14:00:00+02	2026-11-03 16:00:00+02	SIMULATED TEST DATA - NOT REAL	2026-10-28 10:11:12.387385+02
117	9	2	2026-11-04 18:00:00+02	2026-11-04 20:00:00+02	SIMULATED TEST DATA - NOT REAL	2026-10-28 10:11:12.387385+02
118	9	6	2026-11-04 13:00:00+02	2026-11-04 15:00:00+02	SIMULATED TEST DATA - NOT REAL	2026-10-28 10:11:12.387385+02
119	10	4	2026-10-31 22:00:00+02	2026-11-01 00:00:00+02	SIMULATED TEST DATA - NOT REAL	2026-10-28 10:11:12.387385+02
120	10	7	2026-11-01 10:00:00+02	2026-11-01 12:00:00+02	SIMULATED TEST DATA - NOT REAL	2026-10-28 10:11:12.387385+02
121	12	4	2026-10-30 16:00:00+02	2026-10-30 18:00:00+02	SIMULATED TEST DATA - NOT REAL	2026-10-28 10:11:12.387385+02
122	12	4	2026-10-30 08:00:00+02	2026-10-30 10:00:00+02	SIMULATED TEST DATA - NOT REAL	2026-10-28 10:11:12.387385+02
123	12	4	2026-10-31 19:00:00+02	2026-10-31 21:00:00+02	SIMULATED TEST DATA - NOT REAL	2026-10-28 10:11:12.387385+02
124	12	5	2026-11-01 12:00:00+02	2026-11-01 14:00:00+02	SIMULATED TEST DATA - NOT REAL	2026-10-28 10:11:12.387385+02
125	12	8	2026-11-01 17:00:00+02	2026-11-01 19:00:00+02	SIMULATED TEST DATA - NOT REAL	2026-10-28 10:11:12.387385+02
126	12	2	2026-11-02 20:00:00+02	2026-11-02 22:00:00+02	SIMULATED TEST DATA - NOT REAL	2026-10-28 10:11:12.387385+02
127	12	3	2026-11-03 21:00:00+02	2026-11-03 23:00:00+02	SIMULATED TEST DATA - NOT REAL	2026-10-28 10:11:12.387385+02
128	13	4	2026-10-30 22:00:00+02	2026-10-31 00:00:00+02	SIMULATED TEST DATA - NOT REAL	2026-10-28 10:11:12.387385+02
129	13	4	2026-10-31 19:00:00+02	2026-10-31 21:00:00+02	SIMULATED TEST DATA - NOT REAL	2026-10-28 10:11:12.387385+02
130	13	8	2026-10-31 16:00:00+02	2026-10-31 18:00:00+02	SIMULATED TEST DATA - NOT REAL	2026-10-28 10:11:12.387385+02
131	13	5	2026-11-01 08:00:00+02	2026-11-01 10:00:00+02	SIMULATED TEST DATA - NOT REAL	2026-10-28 10:11:12.387385+02
132	13	8	2026-11-02 13:00:00+02	2026-11-02 15:00:00+02	SIMULATED TEST DATA - NOT REAL	2026-10-28 10:11:12.387385+02
133	14	7	2026-10-29 09:00:00+02	2026-10-29 11:00:00+02	SIMULATED TEST DATA - NOT REAL	2026-10-28 10:11:12.387385+02
134	14	8	2026-11-04 12:00:00+02	2026-11-04 14:00:00+02	SIMULATED TEST DATA - NOT REAL	2026-10-28 10:11:12.387385+02
135	16	3	2026-11-02 09:00:00+02	2026-11-02 11:00:00+02	SIMULATED TEST DATA - NOT REAL	2026-10-28 10:11:12.387385+02
136	16	5	2026-11-03 16:00:00+02	2026-11-03 18:00:00+02	SIMULATED TEST DATA - NOT REAL	2026-10-28 10:11:12.387385+02
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, full_name, email, password_hash, area_id, created_at) FROM stdin;
2	Paseka ERIC Mohale	paseka18.pe@gmail.com	$2b$12$AgCYjQR22feYzmzp496rU.RtRzGizUVQyMU/jDU3rBbhCkxrz.Mdu	3	2026-10-13 11:37:29.662769+02
4	Paseka	sukazi17.pe@gmail.com	$2b$12$mvkTDKYVOVumtYYync51cufrx1Ks.ktnUoaE.yG6gCWT5zx0OErPC	8	2026-10-15 12:01:05.468924+02
3	Eric	eric17.pe@gmail.com	$2b$12$Vrfbmt3mJGlZZd.Ne8RgHetgjS.G7Tr3oDV23iXeTmBvziyajdX.K	13	2026-10-13 22:31:16.815396+02
5	Paseka	paseka14.pe@gmail.com	$2b$12$N8.Pxl/eRPWhiufxsYZXs.L1DQTnJBc9U.oFn7O/NgQfZ4Rs5fqaK	10	2026-10-15 20:47:01.164824+02
1	Paseka ERIC Mohale	paseka17.pe@gmail.com	$2b$12$267TtL7NxF7aegfn2nN08usXVIbQ/Cs9/9GyS7g6koiB7qXUwjVNe	8	2026-10-13 11:14:01.38647+02
6	Thabo  Moleke	thabo13.pe@gail.com	$2b$12$Vq2GwMNxzQ0OMrLpEQyRpOS3spc9zhifehghsbHZQ2LXKF0OEbJvq	8	2026-10-28 10:16:41.344738+02
\.


--
-- Name: alert_preferences_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.alert_preferences_id_seq', 1, false);


--
-- Name: areas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.areas_id_seq', 16, true);


--
-- Name: schedules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.schedules_id_seq', 136, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 6, true);


--
-- Name: alert_preferences alert_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alert_preferences
    ADD CONSTRAINT alert_preferences_pkey PRIMARY KEY (id);


--
-- Name: areas areas_esp_area_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.areas
    ADD CONSTRAINT areas_esp_area_id_key UNIQUE (esp_area_id);


--
-- Name: areas areas_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.areas
    ADD CONSTRAINT areas_name_key UNIQUE (name);


--
-- Name: areas areas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.areas
    ADD CONSTRAINT areas_pkey PRIMARY KEY (id);


--
-- Name: schedules schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schedules
    ADD CONSTRAINT schedules_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: alert_preferences alert_preferences_area_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alert_preferences
    ADD CONSTRAINT alert_preferences_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.areas(id) ON DELETE CASCADE;


--
-- Name: schedules schedules_area_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schedules
    ADD CONSTRAINT schedules_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.areas(id) ON DELETE CASCADE;


--
-- Name: users users_area_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.areas(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict BLSJZWybEocHNAVxteSOGuH08Pd8XliIr16OGvXu4sfqT8FnuB2LGndK8OBmjdB

