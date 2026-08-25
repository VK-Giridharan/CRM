table_name,column_name,data_type,is_nullable,column_default
companies,id,integer,NO,"nextval('companies_id_seq'::regclass)"
companies,company_name,character varying,NO,
companies,company_code,character varying,NO,
companies,email,character varying,YES,
companies,phone,character varying,YES,
companies,address,text,YES,
companies,city,character varying,YES,
companies,state,character varying,YES,
companies,country,character varying,YES,
companies,pincode,character varying,YES,
companies,logo,character varying,YES,
companies,status,boolean,YES,true
companies,created_at,timestamp without time zone,YES,CURRENT_TIMESTAMP
companies,updated_at,timestamp without time zone,YES,CURRENT_TIMESTAMP
companies,created_by,integer,YES,
customers,id,integer,NO,"nextval('customers_id_seq'::regclass)"
customers,company_id,integer,NO,
customers,manager_id,integer,NO,
customers,customer_name,character varying,NO,
customers,company_name,character varying,YES,
customers,email,character varying,YES,
customers,phone,character varying,YES,
customers,alternate_phone,character varying,YES,
customers,gst_number,character varying,YES,
customers,website,character varying,YES,
customers,address,text,YES,
customers,city,character varying,YES,
customers,state,character varying,YES,
customers,country,character varying,YES,
customers,pincode,character varying,YES,
customers,status,boolean,YES,true
customers,created_at,timestamp without time zone,YES,CURRENT_TIMESTAMP
customers,updated_at,timestamp without time zone,YES,CURRENT_TIMESTAMP
customers,deleted_at,timestamp without time zone,YES,
leads,id,integer,NO,"nextval('leads_id_seq'::regclass)"
leads,company_id,integer,YES,
leads,manager_id,integer,YES,
leads,lead_name,character varying,NO,
leads,company_name,character varying,YES,
leads,email,character varying,YES,
leads,phone,character varying,NO,
leads,source,character varying,YES,
leads,address,text,YES,
leads,city,character varying,YES,
leads,state,character varying,YES,
leads,country,character varying,YES,
leads,pincode,character varying,YES,
leads,status,character varying,YES,"'Pending'::character varying"
leads,remarks,text,YES,
leads,created_by,integer,YES,
leads,updated_by,integer,YES,
leads,created_at,timestamp without time zone,YES,CURRENT_TIMESTAMP
leads,updated_at,timestamp without time zone,YES,CURRENT_TIMESTAMP
meetings,id,integer,NO,"nextval('meetings_id_seq'::regclass)"
meetings,lead_id,integer,YES,
meetings,company_id,integer,YES,
meetings,manager_id,integer,YES,
meetings,meeting_title,character varying,NO,
meetings,meeting_date,date,NO,
meetings,meeting_time,time without time zone,NO,
meetings,meeting_type,character varying,YES,
meetings,location,text,YES,
meetings,description,text,YES,
meetings,status,character varying,YES,"'Scheduled'::character varying"
meetings,meeting_result,character varying,YES,
meetings,next_meeting_date,date,YES,
meetings,created_by,integer,YES,
meetings,updated_by,integer,YES,
meetings,created_at,timestamp without time zone,YES,CURRENT_TIMESTAMP
meetings,updated_at,timestamp without time zone,YES,CURRENT_TIMESTAMP
split_tasks,id,integer,NO,"nextval('split_tasks_id_seq'::regclass)"
split_tasks,title,character varying,NO,
split_tasks,description,text,YES,
split_tasks,parent_assignment_id,integer,NO,
split_tasks,employee_id,integer,YES,
split_tasks,status,character varying,YES,"'Pending'::character varying"
split_tasks,remarks,text,YES,
split_tasks,created_at,timestamp without time zone,YES,CURRENT_TIMESTAMP
split_tasks,completed_at,timestamp without time zone,YES,
task_assignments,id,integer,NO,"nextval('task_assignments_id_seq'::regclass)"
task_assignments,task_id,integer,NO,
task_assignments,team_lead_id,integer,NO,
task_assignments,assigned_at,timestamp without time zone,YES,now()
task_assignments,completed_at,timestamp without time zone,YES,
task_assignments,status,character varying,YES,"'Pending'::character varying"
task_assignments,remarks,text,YES,
task_reports,id,integer,NO,"nextval('task_reports_id_seq'::regclass)"
task_reports,task_assignment_id,integer,YES,
task_reports,split_task_id,integer,YES,
task_reports,submitted_by,integer,NO,
task_reports,report,text,NO,
task_reports,review_status,character varying,YES,"'Submitted'::character varying"
task_reports,review_remarks,text,YES,
task_reports,reviewed_by,integer,YES,
task_reports,submitted_at,timestamp without time zone,YES,CURRENT_TIMESTAMP
task_reports,reviewed_at,timestamp without time zone,YES,
tasks,id,integer,NO,"nextval('tasks_id_seq'::regclass)"
tasks,customer_id,integer,NO,
tasks,manager_id,integer,NO,
tasks,title,character varying,NO,
tasks,description,text,YES,
tasks,priority,character varying,YES,"'Medium'::character varying"
tasks,start_date,date,YES,
tasks,due_date,date,YES,
tasks,status,character varying,YES,"'Pending'::character varying"
tasks,created_at,timestamp without time zone,YES,now()
tasks,updated_at,timestamp without time zone,YES,now()
tasks,deleted_at,timestamp without time zone,YES,
users,id,integer,NO,"nextval('users_id_seq'::regclass)"
users,first_name,character varying,NO,
users,last_name,character varying,YES,
users,email,character varying,NO,
users,phone,character varying,YES,
users,password,character varying,NO,
users,status,boolean,YES,true
users,created_at,timestamp without time zone,YES,CURRENT_TIMESTAMP
users,updated_at,timestamp without time zone,YES,CURRENT_TIMESTAMP
users,is_active,boolean,NO,true
users,last_login,timestamp without time zone,YES,
users,role,USER-DEFINED,YES,
users,company_id,integer,YES,


table_name,column_name,constraint_type,referenced_table,referenced_column
companies,created_by,FOREIGN KEY,users,id
companies,id,PRIMARY KEY,companies,id
customers,company_id,FOREIGN KEY,companies,id
customers,manager_id,FOREIGN KEY,users,id
customers,id,PRIMARY KEY,customers,id
leads,company_id,FOREIGN KEY,companies,id
leads,created_by,FOREIGN KEY,users,id
leads,manager_id,FOREIGN KEY,users,id
leads,updated_by,FOREIGN KEY,users,id
leads,id,PRIMARY KEY,leads,id
meetings,created_by,FOREIGN KEY,users,id
meetings,updated_by,FOREIGN KEY,users,id
meetings,lead_id,FOREIGN KEY,leads,id
meetings,company_id,FOREIGN KEY,companies,id
meetings,manager_id,FOREIGN KEY,users,id
meetings,id,PRIMARY KEY,meetings,id
split_tasks,parent_assignment_id,FOREIGN KEY,task_assignments,id
split_tasks,employee_id,FOREIGN KEY,users,id
split_tasks,id,PRIMARY KEY,split_tasks,id
task_assignments,team_lead_id,FOREIGN KEY,users,id
task_assignments,task_id,FOREIGN KEY,tasks,id
task_assignments,id,PRIMARY KEY,task_assignments,id
task_reports,reviewed_by,FOREIGN KEY,users,id
task_reports,task_assignment_id,FOREIGN KEY,task_assignments,id
task_reports,split_task_id,FOREIGN KEY,split_tasks,id
task_reports,submitted_by,FOREIGN KEY,users,id
task_reports,id,PRIMARY KEY,task_reports,id
tasks,manager_id,FOREIGN KEY,users,id
tasks,customer_id,FOREIGN KEY,customers,id
tasks,id,PRIMARY KEY,tasks,id
users,company_id,FOREIGN KEY,companies,id
users,id,PRIMARY KEY,users,id


schemaname,table_name,approximate_row_count
public,companies,0
public,customers,0
public,leads,0
public,meetings,0
public,split_tasks,0
public,task_assignments,0
public,task_reports,0
public,tasks,0
public,users,1