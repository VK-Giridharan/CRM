--
-- PostgreSQL database dump
--

\restrict hPoIL7cXSWflQFKxeB5VpoDxdtQjKJpY0pxcj462i38yKYRrcwoqdBLw6pVVnTq

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

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
-- Name: user_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_role AS ENUM (
    'Admin',
    'Manager',
    'Team Lead',
    'Employee',
    'Intern'
);


ALTER TYPE public.user_role OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: companies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.companies (
    id integer NOT NULL,
    company_name character varying(150) NOT NULL,
    company_code character varying(50) NOT NULL,
    email character varying(150),
    phone character varying(20),
    address text,
    city character varying(100),
    state character varying(100),
    country character varying(100),
    pincode character varying(20),
    logo character varying(255),
    status boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer
);


ALTER TABLE public.companies OWNER TO postgres;

--
-- Name: companies_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.companies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.companies_id_seq OWNER TO postgres;

--
-- Name: companies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.companies_id_seq OWNED BY public.companies.id;


--
-- Name: customers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customers (
    id integer NOT NULL,
    company_id integer NOT NULL,
    manager_id integer NOT NULL,
    customer_name character varying(150) NOT NULL,
    company_name character varying(150),
    email character varying(120),
    phone character varying(20),
    alternate_phone character varying(20),
    gst_number character varying(30),
    website character varying(150),
    address text,
    city character varying(100),
    state character varying(100),
    country character varying(100),
    pincode character varying(15),
    status boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp without time zone
);


ALTER TABLE public.customers OWNER TO postgres;

--
-- Name: customers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.customers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.customers_id_seq OWNER TO postgres;

--
-- Name: customers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.customers_id_seq OWNED BY public.customers.id;


--
-- Name: leads; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.leads (
    id integer NOT NULL,
    company_id integer,
    manager_id integer,
    lead_name character varying(150) NOT NULL,
    company_name character varying(150),
    email character varying(150),
    phone character varying(20) NOT NULL,
    source character varying(100),
    address text,
    city character varying(100),
    state character varying(100),
    country character varying(100),
    pincode character varying(20),
    status character varying(30) DEFAULT 'Pending'::character varying,
    remarks text,
    created_by integer,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    requirement text
);


ALTER TABLE public.leads OWNER TO postgres;

--
-- Name: leads_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.leads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.leads_id_seq OWNER TO postgres;

--
-- Name: leads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.leads_id_seq OWNED BY public.leads.id;


--
-- Name: meetings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.meetings (
    id integer NOT NULL,
    lead_id integer,
    company_id integer,
    manager_id integer,
    meeting_title character varying(200) NOT NULL,
    meeting_date date NOT NULL,
    meeting_time time without time zone NOT NULL,
    meeting_type character varying(50),
    location text,
    description text,
    status character varying(30) DEFAULT 'Scheduled'::character varying,
    meeting_result character varying(50),
    next_meeting_date date,
    created_by integer,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.meetings OWNER TO postgres;

--
-- Name: meetings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.meetings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.meetings_id_seq OWNER TO postgres;

--
-- Name: meetings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.meetings_id_seq OWNED BY public.meetings.id;


--
-- Name: password_resets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.password_resets (
    id integer NOT NULL,
    user_id integer NOT NULL,
    token_hash character varying(64) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.password_resets OWNER TO postgres;

--
-- Name: password_resets_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.password_resets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.password_resets_id_seq OWNER TO postgres;

--
-- Name: password_resets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.password_resets_id_seq OWNED BY public.password_resets.id;


--
-- Name: split_tasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.split_tasks (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    parent_assignment_id integer NOT NULL,
    employee_id integer,
    status character varying(50) DEFAULT 'Pending'::character varying,
    remarks text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    completed_at timestamp without time zone
);


ALTER TABLE public.split_tasks OWNER TO postgres;

--
-- Name: split_tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.split_tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.split_tasks_id_seq OWNER TO postgres;

--
-- Name: split_tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.split_tasks_id_seq OWNED BY public.split_tasks.id;


--
-- Name: task_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.task_assignments (
    id integer NOT NULL,
    task_id integer NOT NULL,
    team_lead_id integer CONSTRAINT task_assignments_employee_id_not_null NOT NULL,
    assigned_at timestamp without time zone DEFAULT now(),
    completed_at timestamp without time zone,
    status character varying(30) DEFAULT 'Pending'::character varying,
    remarks text
);


ALTER TABLE public.task_assignments OWNER TO postgres;

--
-- Name: task_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.task_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.task_assignments_id_seq OWNER TO postgres;

--
-- Name: task_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.task_assignments_id_seq OWNED BY public.task_assignments.id;


--
-- Name: task_reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.task_reports (
    id integer NOT NULL,
    task_assignment_id integer,
    split_task_id integer,
    submitted_by integer NOT NULL,
    report text NOT NULL,
    review_status character varying(30) DEFAULT 'Submitted'::character varying,
    review_remarks text,
    reviewed_by integer,
    submitted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    reviewed_at timestamp without time zone,
    attachment_path character varying(255),
    attachment_original_name character varying(255),
    attachment_mime character varying(100),
    attachment_size integer,
    CONSTRAINT chk_task_report_parent CHECK (((task_assignment_id IS NOT NULL) OR (split_task_id IS NOT NULL)))
);


ALTER TABLE public.task_reports OWNER TO postgres;

--
-- Name: task_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.task_reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.task_reports_id_seq OWNER TO postgres;

--
-- Name: task_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.task_reports_id_seq OWNED BY public.task_reports.id;


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tasks (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    manager_id integer NOT NULL,
    title character varying(200) NOT NULL,
    description text,
    priority character varying(20) DEFAULT 'Medium'::character varying,
    start_date date,
    due_date date,
    status character varying(30) DEFAULT 'Pending'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp without time zone
);


ALTER TABLE public.tasks OWNER TO postgres;

--
-- Name: tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tasks_id_seq OWNER TO postgres;

--
-- Name: tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tasks_id_seq OWNED BY public.tasks.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100),
    email character varying(150) NOT NULL,
    phone character varying(15),
    password character varying(255) NOT NULL,
    status boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true NOT NULL,
    last_login timestamp without time zone,
    role public.user_role,
    company_id integer,
    password_changed_at timestamp without time zone
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
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
-- Name: companies id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies ALTER COLUMN id SET DEFAULT nextval('public.companies_id_seq'::regclass);


--
-- Name: customers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers ALTER COLUMN id SET DEFAULT nextval('public.customers_id_seq'::regclass);


--
-- Name: leads id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leads ALTER COLUMN id SET DEFAULT nextval('public.leads_id_seq'::regclass);


--
-- Name: meetings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meetings ALTER COLUMN id SET DEFAULT nextval('public.meetings_id_seq'::regclass);


--
-- Name: password_resets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_resets ALTER COLUMN id SET DEFAULT nextval('public.password_resets_id_seq'::regclass);


--
-- Name: split_tasks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.split_tasks ALTER COLUMN id SET DEFAULT nextval('public.split_tasks_id_seq'::regclass);


--
-- Name: task_assignments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_assignments ALTER COLUMN id SET DEFAULT nextval('public.task_assignments_id_seq'::regclass);


--
-- Name: task_reports id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_reports ALTER COLUMN id SET DEFAULT nextval('public.task_reports_id_seq'::regclass);


--
-- Name: tasks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks ALTER COLUMN id SET DEFAULT nextval('public.tasks_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: companies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.companies (id, company_name, company_code, email, phone, address, city, state, country, pincode, logo, status, created_at, updated_at, created_by) FROM stdin;
1	Pro frontend	RegCom001	profrontend@gmail.com	1111111111	39\nSATHYA NAGAR\nTHENNUR	Tiruchirappalli	Tamil Nadu	India	620017	\N	t	2026-08-19 10:41:10.222053	2026-08-19 10:41:10.222053	1
\.


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.customers (id, company_id, manager_id, customer_name, company_name, email, phone, alternate_phone, gst_number, website, address, city, state, country, pincode, status, created_at, updated_at, deleted_at) FROM stdin;
1	1	2	Senthil Kumar	Trichy Vision	trichyvision@gmail.com	9790247005	\N	\N	trichyvision.in	39\nSATHYA NAGAR\nTHENNUR	Tiruchirappalli	Tamil Nadu	India	620017	t	2026-08-31 11:27:47.734507	2026-08-31 11:27:47.734507	2026-08-31 11:30:32.89287
2	1	2	Senthil Kumar	Trichy Vision	trichyvision@gmail.com	9790247005	\N	\N	trichyvision.in	39\nSATHYA NAGAR\nTHENNUR	Tiruchirappalli	Tamil Nadu	India	620017	t	2026-08-31 11:30:58.012097	2026-08-31 11:31:08.952614	\N
\.


--
-- Data for Name: leads; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.leads (id, company_id, manager_id, lead_name, company_name, email, phone, source, address, city, state, country, pincode, status, remarks, created_by, updated_by, created_at, updated_at, requirement) FROM stdin;
1	1	2	Nadaraj	TIMEA	timea@gmail.com	2222222222	Digi Plus 	39\nSATHYA NAGAR\nTHENNUR	\N	\N	\N	\N	Meeting Scheduled	It's Expect Application	2	2	2026-08-31 11:40:52.109987	2026-08-31 11:47:21.510007	Treading 
\.


--
-- Data for Name: meetings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.meetings (id, lead_id, company_id, manager_id, meeting_title, meeting_date, meeting_time, meeting_type, location, description, status, meeting_result, next_meeting_date, created_by, updated_by, created_at, updated_at) FROM stdin;
2	1	1	2	Treading	2026-09-04	16:00:00	Offline	Prodigit 	jhgfdtyuiol,nbvcrt67ikbvcdr67ikd567id5678i	Scheduled	\N	\N	2	\N	2026-08-31 11:47:21.503242	2026-08-31 11:47:21.503242
\.


--
-- Data for Name: password_resets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.password_resets (id, user_id, token_hash, expires_at, used_at, created_at) FROM stdin;
1	1	d59ddd1d4a06393599e9eb3b992beaf1c6619392d3db6bcf7542c23133d5c474	2026-08-31 11:43:08.609412	2026-08-31 11:13:27.685262	2026-08-31 11:13:08.609412
2	1	9a4ea57c7c54738626d01ffe9efe347662b70dec2a1f2cac711ac2cf1d0c3f7e	2026-08-31 11:43:27.685262	2026-08-31 11:13:28.889392	2026-08-31 11:13:27.685262
3	1	b1b2a305c5265068d2bdf4f7d63ee1c626899c07852090f0903beed0eb22d36d	2026-08-31 11:43:28.889392	\N	2026-08-31 11:13:28.889392
\.


--
-- Data for Name: split_tasks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.split_tasks (id, title, description, parent_assignment_id, employee_id, status, remarks, created_at, completed_at) FROM stdin;
1	Frontend	Create frontend for Web Application	1	5	Completed	Report	2026-08-31 12:01:31.428021	2026-08-31 12:24:55.533272
2	Backend	Create Backend for Web Application	1	6	Completed	Report	2026-08-31 12:03:15.805447	2026-08-31 12:31:58.66178
3	Frontend	Create Frontend For Web App	2	5	In Progress	Quick Process	2026-09-01 13:25:53.712508	\N
4	Backend	Create backend For Web App	2	6	In Progress	Remark	2026-09-01 13:26:40.691709	\N
\.


--
-- Data for Name: task_assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.task_assignments (id, task_id, team_lead_id, assigned_at, completed_at, status, remarks) FROM stdin;
1	1	4	2026-08-31 11:39:10.486922	2026-08-31 12:31:58.66178	Completed	\N
2	2	3	2026-09-01 13:22:09.598843	\N	In Progress	\N
\.


--
-- Data for Name: task_reports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.task_reports (id, task_assignment_id, split_task_id, submitted_by, report, review_status, review_remarks, reviewed_by, submitted_at, reviewed_at, attachment_path, attachment_original_name, attachment_mime, attachment_size) FROM stdin;
1	1	1	5	Complete the Frontend for Web Application	Rework	Improve the Code Quality	4	2026-08-31 12:06:20.557061	2026-08-31 12:08:28.845119	\N	\N	\N	\N
2	1	1	5	Fix the Code Quality	Approved	\N	4	2026-08-31 12:10:26.551507	2026-08-31 12:24:55.533272	\N	\N	\N	\N
3	1	2	6	Submit the Backend	Approved	\N	4	2026-08-31 12:31:03.107284	2026-08-31 12:31:58.66178	\N	\N	\N	\N
\.


--
-- Data for Name: tasks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tasks (id, customer_id, manager_id, title, description, priority, start_date, due_date, status, created_at, updated_at, deleted_at) FROM stdin;
1	2	2	N8N Project for Trichy Vision	The Trichy Vision Have Many Social Media Platform. But, Heavy process to post all Social Media at time. So, Client Requirement is Web App Build for Social Media Publishing Using N8N Concept.	Medium	2026-08-22	2026-09-01	Completed	2026-08-31 11:36:49.552399	2026-08-31 12:31:58.66178	\N
2	2	2	New APP	Create a New Working APP	Urgent	2026-09-01	2026-09-02	In Progress	2026-09-01 13:21:55.200081	2026-09-01 13:36:08.195107	\N
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, first_name, last_name, email, phone, password, status, created_at, updated_at, is_active, last_login, role, company_id, password_changed_at) FROM stdin;
4	Hariharan	K	hari@gmail.com	9445465452	$2b$10$3J8tM2KEt7tUgwR5JnQjau/.xQfeCgns8VZOVDB6Rq8qsAYNpUh7e	t	2026-08-31 11:37:40.519171	2026-08-31 11:39:02.807205	t	2026-08-31 12:31:23.901776	Team Lead	1	\N
7	Atif	Hamsari	atif@gmail.com	6666666666	$2b$10$Ncru2UbtT9Lw5s1nnBP5jeAvxEuS7l2598wlTDsMepFqyuiQTLhQ6	t	2026-09-01 13:15:50.797736	2026-09-01 13:15:50.797736	t	\N	\N	\N	\N
1	Giridharan	VK	giridharan@gmail.com	9443139765	$2b$10$BaLbsBR7fDbHnuvmFLxIoOxo44yS3DDlbyktdbp/N5Fg4xa0oBz4O	t	2026-08-18 13:22:54.943719	2026-08-18 13:22:54.943719	t	2026-09-01 13:16:08.811751	Admin	\N	\N
2	Sanjai	SN	sanjai@gmail.com	6374289789	$2b$10$BaLbsBR7fDbHnuvmFLxIoOxo44yS3DDlbyktdbp/N5Fg4xa0oBz4O	t	2026-08-19 10:39:57.711627	2026-08-19 10:41:25.008565	t	2026-09-01 13:21:13.563017	Manager	1	\N
5	Atchaya	A	atchaya@gmail.com	3333333333	$2b$10$yM.5toaXlndNs/NlMmN.VOqPEIzvG/KJjD7anfwZKzUD/W8FBY0eO	t	2026-08-31 11:50:36.619351	2026-08-31 11:52:27.413479	t	2026-09-01 13:29:14.032805	Employee	1	\N
6	Aravinth	A	aravinth@gmail.com	7777777777	$2b$10$wByPerpk5iNfsSUrnIxiy.8FPxaFXgmSn/nibfPRXKkK4HtSOKWYy	t	2026-08-31 11:55:19.414623	2026-08-31 11:58:26.564476	t	2026-09-01 13:34:41.125451	Intern	1	\N
3	ARUL MEERA	K	meera@gmail.com	9080012318	$2b$10$BaLbsBR7fDbHnuvmFLxIoOxo44yS3DDlbyktdbp/N5Fg4xa0oBz4O	t	2026-08-19 11:04:01.030166	2026-08-19 11:06:03.544466	t	2026-09-01 13:37:02.713555	Team Lead	1	\N
\.


--
-- Name: companies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.companies_id_seq', 1, true);


--
-- Name: customers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.customers_id_seq', 2, true);


--
-- Name: leads_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.leads_id_seq', 1, true);


--
-- Name: meetings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.meetings_id_seq', 2, true);


--
-- Name: password_resets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.password_resets_id_seq', 3, true);


--
-- Name: split_tasks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.split_tasks_id_seq', 4, true);


--
-- Name: task_assignments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.task_assignments_id_seq', 2, true);


--
-- Name: task_reports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.task_reports_id_seq', 3, true);


--
-- Name: tasks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tasks_id_seq', 2, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 7, true);


--
-- Name: companies companies_company_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_company_code_key UNIQUE (company_code);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: leads leads_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_pkey PRIMARY KEY (id);


--
-- Name: meetings meetings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meetings
    ADD CONSTRAINT meetings_pkey PRIMARY KEY (id);


--
-- Name: password_resets password_resets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_resets
    ADD CONSTRAINT password_resets_pkey PRIMARY KEY (id);


--
-- Name: split_tasks split_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.split_tasks
    ADD CONSTRAINT split_tasks_pkey PRIMARY KEY (id);


--
-- Name: task_assignments task_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT task_assignments_pkey PRIMARY KEY (id);


--
-- Name: task_reports task_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_reports
    ADD CONSTRAINT task_reports_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_password_resets_token_hash; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_password_resets_token_hash ON public.password_resets USING btree (token_hash);


--
-- Name: idx_password_resets_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_password_resets_user ON public.password_resets USING btree (user_id);


--
-- Name: task_assignments fk_assignment_employee; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT fk_assignment_employee FOREIGN KEY (team_lead_id) REFERENCES public.users(id);


--
-- Name: task_assignments fk_assignment_task; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT fk_assignment_task FOREIGN KEY (task_id) REFERENCES public.tasks(id);


--
-- Name: companies fk_company_created_by; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT fk_company_created_by FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: customers fk_customer_company; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT fk_customer_company FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: customers fk_customer_manager; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT fk_customer_manager FOREIGN KEY (manager_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: split_tasks fk_split_task_employee; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.split_tasks
    ADD CONSTRAINT fk_split_task_employee FOREIGN KEY (employee_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: split_tasks fk_split_task_parent_assignment; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.split_tasks
    ADD CONSTRAINT fk_split_task_parent_assignment FOREIGN KEY (parent_assignment_id) REFERENCES public.task_assignments(id) ON DELETE CASCADE;


--
-- Name: tasks fk_task_customer; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT fk_task_customer FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: tasks fk_task_manager; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT fk_task_manager FOREIGN KEY (manager_id) REFERENCES public.users(id);


--
-- Name: task_reports fk_task_reports_assignment; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_reports
    ADD CONSTRAINT fk_task_reports_assignment FOREIGN KEY (task_assignment_id) REFERENCES public.task_assignments(id) ON DELETE CASCADE;


--
-- Name: task_reports fk_task_reports_reviewer; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_reports
    ADD CONSTRAINT fk_task_reports_reviewer FOREIGN KEY (reviewed_by) REFERENCES public.users(id);


--
-- Name: task_reports fk_task_reports_split; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_reports
    ADD CONSTRAINT fk_task_reports_split FOREIGN KEY (split_task_id) REFERENCES public.split_tasks(id) ON DELETE CASCADE;


--
-- Name: task_reports fk_task_reports_submitter; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_reports
    ADD CONSTRAINT fk_task_reports_submitter FOREIGN KEY (submitted_by) REFERENCES public.users(id);


--
-- Name: users fk_users_company; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_users_company FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: leads leads_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: leads leads_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: leads leads_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: leads leads_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: meetings meetings_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meetings
    ADD CONSTRAINT meetings_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: meetings meetings_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meetings
    ADD CONSTRAINT meetings_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: meetings meetings_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meetings
    ADD CONSTRAINT meetings_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: meetings meetings_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meetings
    ADD CONSTRAINT meetings_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: meetings meetings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meetings
    ADD CONSTRAINT meetings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: password_resets password_resets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_resets
    ADD CONSTRAINT password_resets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict hPoIL7cXSWflQFKxeB5VpoDxdtQjKJpY0pxcj462i38yKYRrcwoqdBLw6pVVnTq

