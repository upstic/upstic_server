Entities (Collections):
application_crash_logs

_id, created_on, updated_on, error, link, referer_link, user_ip, description

applied_jobs

_id, created_on, updated_on, status, user_id, job_applied_id

authtoken_token

key, created, user_id

auth_group

_id, name

auth_group_permissions

_id, group_id, permission_id

auth_permission

_id, name, content_type_id, codename

candidate_docs

_id, created_on, updated_on, address_proof, cv, rtw, ni_proof, immunization, dbs_details, user_id

candidate_job_data

_id, created_on, updated_on, joining_date, start_time, end_time, working_hours, designation, leaving_date, user_id, job_id

candidate_package

_id, created_on, updated_on, effective_from, valid_till, ctc, inhand_salary, deductions, designation, user_id, job_id

candidate_preference

_id, created_on, updated_on, availablity_type, start_time, end_time, radius_range, relocation, travel_willing, user_id, location_id

candidate_timesheet

_id, created_on, updated_on, logged_hours, report, status, approved_by_id, user_id

candidate_work_history

_id, created_on, updated_on, education, previous_exp, previous_company, designation, salary, start_date, end_date, reason, user_id

client_company

_id, created_on, updated_on, name, industry_type, size, address, email, mobile_no, country_iso_code, country_code, agency_logo

client_company_location

_id, clientcompany_id, companylocations_id

company_jobs

_id, created_on, updated_on, title, role, responsibility, qualification, skill, preference, availability, experience, shift_start, shift_end, email, deadline, location_id

company_locations

_id, created_on, updated_on, name, location_id, zipcode

complianced_candidates

_id, created_on, updated_on, flag, issues, checked_candidate_id, job_id, user_id

contactus

_id, created_on, updated_on, full_name, subject, email, message

contactus_reply

_id, created_on, updated_on, reply_message, contact_id, created_by_id

contact_details

_id, created_on, updated_on, email, country_code, country_iso_code, mobile_no, address, latitude, longitude, facebook_url, twitter_url, google_url, created_by_id

db_backup

_id, name, size, backup_file, created_on, is_schema

device

_id, created_on, updated_on, device_type, device_name, device_token, user_id

system_logs

_id, action_time, object_id, object_repr, action_flag, change_message, content_type_id, user_id

content_types

_id, app_label, model

db_logger_status

_id, logger_name, level, msg, trace, create_datetime

db_migrations

_id, app, name, applied

user_sessions

session_key, session_data, expire_date

site_info

_id, domain, name

email_logger

_id, created_on, updated_on, email_template, email_subject, recievers_email, sender_email, sent_status, reciever_id

faqs

_id, created_on, updated_on, question, answer

interview_scheduled

_id, created_on, updated_on, interview_date, start_time, end_time, location_id, offer_id, user_id

job_offers

_id, created_on, updated_on, status, job_id, offered_candidate_id, user_id

login_history

_id, user_ip, user_agent, status, url, created_on, user_email, mobile_no, country_code

notifications

_id, created_on, updated_on, title, description, is_read, notification_type, obj_id, created_by_id, created_for_id

project_logo

_id, created_on, updated_on, logo, favicon, created_by_id

recruiter_candidate_review

_id, created_on, updated_on, comment, candidate_id, job_id, user_id

recruiter_data

_id, created_on, updated_on, job, department, communication_preference, total_placement, user_id, agency_id

recruiter_data_location

_id, recruiterdata_id, companylocations_id

recruiter_feedback

_id, created_on, updated_on, feedback, rating, created_by_id, user_id

recruitment_agency

_id, created_on, updated_on, name, industry_type, size, address, email, mobile_no, country_iso_code, country_code, agency_logo

recruitment_agency_location

_id, recruitmentagency_id, companylocations_id

smtp_settings

_id, email_backend, email_host, email_port, use_tls, email_host_user, email_host_password, is_active, created_on, updated_on

static_pages

_id, created_on, updated_on, title, content, type_id, is_active

stripe_credentials

_id, created_on, updated_on, publish_key, test_key, active

subscription_plan

_id, created_on, updated_on, title, price, management, features, limits, validity, status

user

password, last_login, is_superuser, email, is_staff, is_active, date_joined, _id, username, full_name, first_name, last_name, address, mobile_no, country_iso_code, country_code, profile_pic, role_id, dob, status, temp_otp, is_verified, is_profile_setup, created_on, updated_on, social_type, gender, communication_preference, is_hired, company_id, agency_id, location_id

user_groups

_id, user_id, group_id

user_user_permissions

_id, user_id, permission_id

Updated Connections:
User Information: user, user_groups, user_user_permissions, candidate_docs, candidate_job_data, candidate_package, candidate_preference, candidate_timesheet, candidate_work_history

Job Information: applied_jobs, company_jobs, company_locations, job_offers, recruiter_candidate_review

Company Information: client_company, client_company_location, recruitment_agency, recruitment_agency_location

System Information: application_crash_logs, db_backup, device, system_logs, content_types, db_logger_status, db_migrations, user_sessions, site_info

Communication and Notifications: contactus, contactus_reply, contact_details, notifications, email_logger, recruiter_feedback

Miscellaneous: auth_group, `auth_group_permissions


Application Crash Logs											
Error traceback											
system state											
operating system											
application version											
server info											
crash severity											
resolved or not											
resolution details											


Candidate Docs											
Doc type - Type of the document (e.g., CV, Right to Work, DBS, NI Proof, Immunization, etc.).											
expiry date - Expiry date for time-sensitive documents (e.g., DBS check, RTW).											
compliance status - Traffic lights (red, amber, green and grey with ! For unverified/pending) - Indicates whether the candidate’s documentation is in compliance with the required standards.											
Verified by - referencing the user/administrator who verified the document.											
Notes - A field for additional notes or comments regarding the document verification process.											


DOCS LIST - missing items											
CV											
ID Proof		Missing									
Qualification Certificate		Missing									
Professional Registration Certificates / PIN		Missing									
Evidence of Indemnity – Qualified Personnel Only		Missing									
NHS Smart Card 		Missing									
Mandatory Training certificates		Missing									

Here is an example of how the Candidate Docs table might look with a few documents uploaded for a candidate:											

doc_id	user_id	document_type	document_status	expiry_date	compliance_status	upload_date	verified_by	document_path	notes	created_on	updated_on
1	12345	CV	Verified	N/A	Compliant	12/1/2024 9:30	admin1	/uploads/cv_12345.pdf	N/A	12/1/2024 9:30	12/1/2024 9:30
2	12345	Right to Work	Verified	12/1/2025	Compliant	12/1/2024 10:00	admin2	/uploads/rtw_12345.pdf	Expiring soon	12/1/2024 10:00	12/1/2024 10:00
3	12345	DBS Check	Pending	12/1/2024	Non-Compliant	12/1/2024 11:00	admin3	/uploads/dbs_12345.pdf	Awaiting verification	12/1/2024 11:00	12/1/2024 11:00
4	12345	Qualifications Certificate	Verified	N/A	Compliant	12/1/2024 12:00	admin4	/uploads/qual_12345.pdf	Valid certificate	12/1/2024 12:00	12/1/2024 12:00


Client Tree 											
1. Client Company Table (client_company)											

Field		Description									
company_id		Primary Key. Unique identifier for the company.									
company_name		The name of the company (e.g., Trust or healthcare provider).									
company_registration_no		Registration number for the company (e.g., Companies House registration number).									
headoffice_address		Street address of the company’s headquarters.									
contact_number		Contact phone number for the company.									
contact_email		Email address for the company.									
website_url		Website URL for the company.									
purchase_order_number		Purchase order number related to the entire trust (e.g., Trust-wide procurement).									
billing_address		Address used for billing purposes.									
billing_contact_name		Name of the billing contact at the company.									
billing_contact_email		Email address for billing-related communications.									
billing_contact_phone		Phone number for billing-related inquiries.									
created_on		Date and time when the company record was created.									
updated_on		Date and time when the company record was last updated.									


2. Client Locations Table (client_locations)											

Field		Description									
location_id		Primary Key. Unique identifier for the location.									
company_id		Foreign Key referencing client_company.company_id. Ties the location to the company.									
location_name		Name of the location (e.g., hospital, clinic).									
address_street		Street address for the location (e.g., hospital, clinic).									
address_city		City of the location.									
address_state		State or region of the location.									
address_postcode		Postcode of the location.									
address_country		"Country (always ""United Kingdom"")."									
contact_number		Contact phone number for the location.									
email_address		Email address for the location.									
purchase_order_number		Purchase order number related to the location (e.g., location-wide procurement).									
site_reference		Site reference, which helps identify the location or project site.									
created_on		Date and time when the location record was created.									
updated_on		Date and time when the location record was last updated.									


3. Units Table (units)											

Field		Description									
unit_id		Primary Key. Unique identifier for the unit.									
location_id		Foreign Key referencing client_locations.location_id. Ties the unit to a specific location.									
unit_name		Name of the unit (e.g., ICU, Surgery).									
unit_type		Type of unit (e.g., ICU, Pediatrics).									
purchase_order_number		Purchase order number related to the unit (e.g., unit-level procurement).									
created_on		Date and time when the unit record was created.									
updated_on		Date and time when the unit record was last updated.									


4. Assignments Table (assignments)											

Field		Description									
assignment_id		Primary Key. Unique identifier for the assignment.									
staff_id		Foreign Key referencing staff.staff_id. Tracks the staff member assigned.									
unit_id		Foreign Key referencing units.unit_id. Ties the assignment to a unit within a location.									
location_id		Foreign Key referencing client_locations.location_id. Ties the assignment to a location within the company.									
Job Title		Profession									
Band / Grade		Grade									
assignment_start		Start date and time of the assignment.									
assignment_end		End date and time of the assignment.									
hours_worked		Total number of hours worked during the assignment period.									
hourly_charge rate		Charge Rate per hour for the assignment.									
hourly_pay rate		Pay Rate per hour for the assignment.									
total_agency earnings		Commission - Earnings based on hours worked and hourly rate.									
total_candidates earnings		Worker Earnings based on hours worked and hourly rate.									
expenses		Additional expenses incurred during the assignment (e.g., travel).									
deductions		Deductions (e.g., taxes) from the earnings during the assignment.									
net_pay		Final net pay after deductions and expenses.									
invoice_generated		Flag indicating if an invoice has been generated for the assignment (1 = Yes, 0 = No).									
job_reference_number		Job reference number associated with the assignment (e.g., specific job ID or project number).									
purchase_order_number		Purchase order number related to the assignment (e.g., if applicable in a procurement context).									
Placement Ref No											
site_reference		Site reference for the assignment, which helps identify the location or project site.									
created_on		Date and time when the assignment record was created.									
updated_on		Date and time when the assignment record was last updated.									



contact_us_inquiries											

Field		Description									
inquiry_id		Primary Key. Unique identifier for each contact inquiry.									
user_id		Foreign Key referencing the user_id (if a registered user) or guest for non-logged in users.									
subject		"Subject of the inquiry (e.g., ""Support Request"", ""Job Application Inquiry"")."									
message		The content of the inquiry or message sent by the user.									
inquiry_date		The date and time when the inquiry was submitted.									
status		The current status of the inquiry (whether it’s still being processed or has been resolved).									
response_message		The response message (if any) from the company or support team to the inquiry.									
response_date		The date and time when the response was provided (if applicable).									
assigned_to		Foreign Key referencing the staff_id of the person assigned to handle the inquiry (if applicable).									


contact_us_responses											

Field		Description									
response_id		Primary Key. Unique identifier for each response.									
inquiry_id		Foreign Key referencing contact_us_inquiries.inquiry_id. Ties the response to the original inquiry.									
response_message		The content of the response.									
response_date		The date and time when the response was sent.									
assigned_to		Foreign Key referencing the staff_id of the person handling the inquiry response.									

contact_us_user_profiles											

Field		Description									
user_id		Primary Key. Unique identifier for the user.									
first_name		User’s first name.									
last_name		User’s last name.									
email		User’s email address.									
phone_number		User’s contact phone number (if applicable).									
created_on		Date and time when the user’s contact profile was created.									
updated_on		Date and time when the user’s contact profile was last updated.									

contact_us_audit_log											

Field		Description									
log_id		Primary Key. Unique identifier for each log entry.									
inquiry_id		Foreign Key referencing contact_us_inquiries.inquiry_id.									
action		"Action taken (e.g., ""Inquiry Status Updated"", ""Response Sent"")."									
details		Detailed description of the action taken (e.g., updated status or sent response).									
action_date		The date and time when the action was taken.									
action_by		Foreign Key referencing the staff member who performed the action.									


contactus											

Field		Description									
id		Unique identifier for the contact.									
created_on		Timestamp of when the contact was made.									
updated_on		Timestamp of the last update.									
full_name		The name of the person submitting the inquiry.									
subject		The subject of the inquiry.									
email		Email address of the person submitting the inquiry.									
message		The content of the inquiry.									


contactus_reply											

id		Primary Key. Unique identifier for the reply.									
created_on		Timestamp of when the reply was created.									
updated_on		Timestamp of the last update.									
reply_message		The content of the reply to the contact inquiry.									
contact_id		Foreign Key to contactus.id. Identifies which inquiry this reply belongs to.									
created_by_id		Foreign Key to user_id. Represents the staff member or admin who responded.									




django_db_logger_statuslog vs. status_log											

id											
logger_name											
level											
msg											
trace											
create_datetime											
entity_type											
entity_id											
status											
action_description											
user											
timestamp											
remarks											
previous_status											
reason											

interview_scheduled											
interview_status											
interview_feedback											
interviewer_ids											
candidate_confirmation											
location_type											
virtual_interview_link											
communication_log											
interview_duration											




Recruiter Data											
DBS Check: Add DBS certificate number and expiry date to track the validity of the DBS check.											
Professional Registration: Add professional registration number and expiry date for regulated recruiters.											
Training Compliance: Track training completion and expiry dates for mandatory training (e.g., Safeguarding, GDPR).											
Employment Contracts: Track contract types, start dates, and end dates for recruiter contracts.											
GDPR Compliance: Track GDPR consent and withdrawal of consent with timestamps.											
Recruitment Performance: Add a performance rating field to track the recruiter's success in their role.											
RTW											
Refernce checks											
Occupational health Checks											
Misc / Other											
performance rating											


Static pages											
Last updated by											



Applied Jobs											
"Status description - pending"", ""accepted"", ""rejected"""											
application_date: To track the date of application submission.											
response_time: To track how long it took for the employer to respond to the application.											
salary_expectation: To store candidate salary expectations for the applied role.											
preferred_location: To store the candidate's location preferences.											
rejection_reason: To capture the reason for rejection if applicable.											
interview_scheduled: To track if an interview is scheduled with the candidate.											
additional_feedback: To store recruiter feedback for each application.											


Candidate Job Data Schema											
working_hours	Add a field to track weekly working hours as it helps ensure compliance with UK working hours regulations (e.g., 48-hour maximum).										
leaving_date	Add leaving date field for resignation or termination purposes, useful for compliance in case of disputes or employment audits.										
contract_type	Add contract type field to track permanent, temporary, or freelance positions, in line with UK employment laws.										
job_role	Add job role field to ensure alignment with the UK job classification systems (e.g., role-specific requirements).										
hourly pay_details											
pension_scheme	Track pension contributions for workers eligible for auto-enrollment under UK pension laws.										
tax_code	Add tax code field for payroll processing under HMRC tax regulations.										


django_migrations											
status: Track the status of the migration (e.g., success, failed).											
migration_timestamp: Add a timestamp for when the migration was applied.											
applied_by_user_id: Track which user applied the migration.											
rollback_status: Track the rollback status (if applicable).											
migration_log: Add a log field for capturing migration details.											
commit_id: Store the commit ID related to the migration for version control integration.											
database_version: Track the database version after the migration.											


job offers											
status_description: job offer's status (e.g., accepted, rejected, pending).											
offer_validity: To track the expiry date of the job offer.											
hourly pay rate_details											
offer_type: To specify whether the offer is permanent, temporary, or contractual.											
start_date: To store the start date of the job offer.											
contract_type: To specify the type of contract for the job.											
location: To specify the job location.											
probation_period: To track the probation period for new hires where applicable.											


Recruiter Data Location Schema											
location_name: To store the name of the recruiter location.											
location_address: To store the address of the location.											
contact_phone and contact_email: To store contact details for the recruiter location.											
location_type: To specify the type of location (e.g., main office, branch).											
location_region: To track the region (e.g., London, North).											
location_status: To track the status of the location (e.g., active, inactive).											
latitude and longitude: To store geographical coordinates for the location.											



Stripe credentials											
key_expiry_date: To track the expiry date of the keys.											
environment: To track which environment the keys are being used for (e.g., production, staging).											
last_used_on: To track when the keys were last used.											
whitelisted_ips: For IP whitelisting to enhance security.											
secret_key: For tracking the secret key (ensure encryption).											
status: To manage the status of the credentials (e.g., active, inactive).											
last_error_log: To store logs for failed interactions for troubleshooting.											
account_reference: To track which Stripe account the credentials are linked to.											



authtoken_token											
token_expiry: To track the expiry date of the token.											
ip_address: To store the IP address from which the token was generated.											
device_info: To store the device information associated with the token.											
revocation_status: To track if the token has been revoked.											
last_used: To capture the last used timestamp of the token.											
token_type: To specify the type of token (e.g., access, refresh).											



Candidate Package											
salary_breakdown: To track the detailed salary components (base salary, bonuses, etc.).											
benefits: To store details about non-cash benefits provided by the employer (e.g., health insurance, pension contributions).											
contract_type: To specify the type of contract (e.g., permanent, temporary).											
pay_schedule: To track the payment schedule (weekly, bi-weekly, monthly).											
performance_bonus: To track any performance-based bonuses.											
tax_deductions: To store tax deductions applicable to the candidate.											
payment_method: To specify the payment method for the candidate's salary.											
bonus_structure: To specify the bonus structure (e.g., performance bonuses).											
currency: To store the currency used for salary and benefits (e.g., GBP for UK).											



Company Jobs											
salary_range: To specify the salary range for each job.											
contract_type: To define the type of contract (permanent, temporary, etc.).											
working_hours: To specify working hours (e.g., full-time, part-time).											
location_details: To provide detailed location information.											
required_qualifications: To list essential qualifications required for the job.											
job_benefits: To list the benefits associated with the role (e.g., healthcare, pension).											
recruiter_comments: To capture additional recruiter notes.											
job_category: To specify the category or function of the job (e.g., IT, healthcare).											
job_reference_number: To store a unique reference number for the job posting.											



db_backup											
backup_type: To specify the type of backup (e.g., full, incremental).											
backup_status: To track the status of the backup process (e.g., success, failed).											
backup_frequency: To specify the frequency of the backup (e.g., daily, weekly).											
backup_location: To track the storage location of the backup (e.g., local, cloud).											
backup_duration: To measure the duration of the backup process.											
restore_point: To track the timestamp for disaster recovery or restoration purposes.											
encrypted: To specify whether the backup is encrypted for security.											
user_id: To track which user initiated the backup for auditing purposes.											





Django Session											
user_id: To associate the session with a user.											
ip_address: To store the IP address associated with the session.											
device_info: To track device details (browser, OS).											
session_status: To track the status of the session (e.g., active, expired).											
last_activity: To store the timestamp of the last user activity.											
browser_info: To store details about the browser used in the session.											
session_type: To specify the type of session (authenticated, guest).											
session_metadata: To store additional session-related metadata.											


Login History											
login_status: To track the status of each login attempt (e.g., successful, failed).											
device_info: To capture the device information used during login.											
login_method: To specify the method of login (e.g., password, MFA).											
geo_location: To store the geographical location of the user during login.											
browser_info: To track browser details during login.											
failed_attempts: To store the number of failed login attempts.											
login_duration: To store the duration of the login session.											
two_factor_enabled: To track if two-factor authentication was used for the session.											



Recruitment Feedback											
feedback_date: To track when the feedback was provided.											
candidate_id: To associate the feedback with a specific candidate.											
job_id: To track which job the feedback is related to.											
rating_type: To specify the category of the rating (e.g., interview, performance).											
feedback_status: To track the status of feedback (e.g., pending, reviewed).											
improvement_suggestions: To store suggestions for candidate improvement.											
feedback_source: To specify where the feedback came from (e.g., manager, peer).											
action_taken: To track actions based on the feedback.											





Subscription Plan											
plan_type: To differentiate between types of subscription plans (monthly, quarterly, annual).											
max_users: To specify the maximum number of users allowed under the plan.											
features_included: To specify the features included in the plan.											
discounts: To store any discounts or promotional offers.											
renewal_period: To track renewal periods for each plan.											
payment_method: To specify the payment method for subscription charges.											
status: To track the status of the subscription (active, expired, cancelled).											
next_billing_date: To store the next billing date for recurring payments.											
trial_period: To specify the trial period duration.											
currency: To track the currency used for payments.											


auth_group											
Description Field:		Add a description field to provide more context about the group's purpose.									
Status Field:		Consider including a status field to denote whether a group is active or inactive.									
Creation and Modification Timestamps:		Add created_on and updated_on fields for better traceability.									
Relationships:		Ensure clear relationships with other tables like auth_group_permissions and user_groups. Foreign keys and constraints can be explicitly defined for database integrity.									


auth_group_permissions											
Timestamps:		Add created_on and updated_on fields to track record creation and modification.									
Default Values:		Automatically populate timestamps using CURRENT_TIMESTAMP and update updated_on on record changes.									


auth_permission											
Timestamp											
status field											



candidate_timesheet											
Period or Week Tracking		week_start DATE, week_end DATE, or period VARCHAR(50) (e.g., 2024-W48 for the 48th week of 2024).									
Status field		to indicate whether the timesheet is active, rejected, or deleted. This helps manage timesheets that are no longer valid without deleting them.									
Tracking Clock-In/Clock-Out Times and date											
Duration Calculations		to allow for better calculations and more precise hour tracking.									
Audit Information		Add an updated_by_id field for tracking modifications									



candidate_preference											
Ensure valid references for user_id and location_id.											
Status or Soft-Deletion: Add is_active or status to manage active/inactive preferences.											
Audit Information: Add an updated_by_id field for tracking modifications.											
Flexible Time Preferences: Add fields for preferred days of the week and work hours per day.											
Location Clarification: Add a location_preference_detail field to specify the preferred location in detail.											
Relocation and Travel Details: Track preferred areas for relocation and travel willingness.											
mode of transport											



company_locations											
Ensure valid references for location_id from a locations table.											
Status or Soft-Deletion: Add is_active or status to mark locations as active or inactive.											
Location Details: Add country, state, and city fields to provide a complete geographical address.											
Location Type: Include a location_type field to categorize the location (e.g., Head Office, Branch).											
Audit Information: Add updated_by_id to track who last modified the location.											
Geographical Coordinates: Add latitude and longitude fields for mapping and analysis.											
Contact Information: Add contact_number and contact_email for easier location communication.											



Device											
Status or Soft-Deletion: Add is_active or status to track active/inactive devices.											
Device Details: Add fields for os_version, device_os_type, and device_ip_address.											
Device Security: Track whether the device is encrypted with an is_encrypted field.											
Audit Information: Add updated_by_id to track who last modified the device.											
Device Usage: Track the last_used timestamp to manage inactive devices.											
Device Ownership: Track whether the device is company-owned or user-owned with device_ownership.											




django_site											
Status or Soft-Deletion: Add an is_active field to track if the site is active or inactive.											
Audit Information: Add created_on, updated_on, and updated_by_id fields for better auditing.											
Multiple loactions Management: Include an environment field to specify the site environment (e.g., branches).											
Security Features: Track SSL availability with a has_ssl field.											
Site Metadata: Add description and logo_url fields for additional site details.											
Access Controls: Add requires_authentication to manage access restrictions.											



Notifications											
Status or Soft-Deletion: Add is_active or status to manage active/inactive notifications.											
Priority: Add a priority field to categorize the importance of the notification.											
Read/Unread Timestamp: Add read_on to track when the notification was read.											
Expiry Date: Add an expiry_date to manage time-sensitive notifications.											
Category or Subcategory: Classify notifications with a category field.											
Interaction Tracking: Track user interaction with the interaction_timestamp.											
Notification Medium: Track the delivery_method (e.g., email, SMS, whats app,push).											



Recruitment_agency											
Add location_id to link the agency to a location.											
Status or Soft-Deletion: Add is_active or status to manage the agency’s active status.											
Audit Information: Add updated_by_id to track changes made by users.											
Website URL: Add a website_url field to store the agency’s website.											
Agency Operations Metrics: Include num_placements and performance_score to track the agency's performance.											
Social Media Links: Add fields for linkedin_url, facebook_url, and twitter_url.											
Specialization or Services: Add specialization to capture the agency's areas of focus.											



User											
Security and Authentication: Add login_attempts, last_login_ip, last_password_change, and is_mfa_enabled.											
Account Lockout: Add is_locked to manage locked accounts.											
Privacy and Consent Tracking: Add consent_given and consent_timestamp for GDPR compliance.											
User Preferences: Add preferred_language and ui_theme for user customization.											
Social Media Handles: Include fields for facebook_url, linkedin_url, and twitter_url.											
Account History: Track previous_roles and status_change_history for better management and reporting.											


Complianced_candidates											
Foreign Keys: Link checked_candidate_id, user_id, and job_id to ensure data integrity.											
Status or Soft-Deletion: Add status or is_active to track the current state of the compliance check.											
Audit Information: Add updated_by_id to track who last modified the compliance record.											
Compliance Type: Include a compliance_type field to specify the type of compliance check (e.g., background check, certification).											
Document Tracking: Add fields like compliance_document_url and document_type to manage compliance-related documents.											
Re-evaluation and Expiration: Add compliance_expiry_date and requires_reevaluation to track when compliance checks need to be renewed.											
Notes or Comments: Include notes to capture additional details about the compliance process.											




django_admin_log											
Foreign Keys: Add references for user_id and content_type_id to ensure consistency.											
Status or Soft-Deletion: Add is_active to track active vs. archived logs.											
Action Source: Add action_source to indicate how the action was performed (e.g., admin, API).											
IP Address or Session Tracking: Add ip_address and session_id for better tracking of action origins.											
Automated System Flag: Add is_automated to track automated vs. user-performed actions.											
Action Category/Type: Add action_category to classify the action (e.g., user management, data change).											
Action Reason: Include an optional action_reason field for providing context on the action.											


email_logger											
Foreign Key: Ensure valid references for reciever_id from the user table.											
Error Tracking: Add failure_reason and error_message to capture issues during email sending.											
Retry Logic: Include retry_count and last_retry to track retry attempts.											
Delivery Confirmation: Add delivery_status and open_status to track whether the email was delivered and opened.											
Email Type: Add email_type to classify the email (e.g., transactional, promotional).											
Attachments: Track attachment URLs with attachment_urls.											
Email Content Metadata: Add email_variables to track dynamic content used in the email.											
Timestamp for Sent Email: Add sent_at to track when the email was actually sent.											



project_logo											
Foreign Key: Ensure created_by_id references the user table.											
Status or Soft-Deletion: Add is_active or status to track active/inactive logos.											
Logo Type: Add logo_type to categorize the type of image (e.g., project logo, banner).											
Image Metadata: Track image_width, image_height, file_size, and file_format for better validation and management.											
Approval Status: Add approval_status to manage logo approval.											
File Path Validation: Add storage_type to track whether the logo is stored locally or in the cloud.											
Project Association: Add project_id to link the logo to a specific project.											




recruitment_agency_location											
Foreign Keys: Ensure valid references for recruitmentagency_id and companylocations_id.											
Status or Soft-Deletion: Add is_active to track active vs. inactive location associations.											
Audit Information: Add created_on, updated_on, and updated_by_id to improve traceability.											
Expiration or Validity Dates: Add valid_from and valid_until to manage location changes over time.											
Location Type: Add location_type to categorize the location (e.g., headquarters, branch).											
Additional Location Information: Include location_address, location_phone, and contact_person for more detailed location data.											




user_groups											
Foreign Keys: Ensure valid references for user_id and group_id.											
Status or Soft-Deletion: Add is_active to track active/inactive group memberships.											
Timestamps: Add created_on and updated_on for better traceability.											
Audit Information: Add updated_by_id to track who modified the user's group membership.											
Role or Permission Tracking: Add role_id to specify the user's role within the group.											
Expiration or Validity Dates: Add valid_from and valid_until to manage the duration of group memberships.											



Candidate work history											
Foreign Keys: Ensure valid references for user_id or candidate_id to link the record to a valid user or candidate.											
Status or Soft-Deletion: Add is_active to track active vs. archived work history.											
Audit Information: Add updated_by_id to track who modified the work history record.											
Work History Type: Add work_type to specify whether the work was full-time, part-time, freelance, etc.											
Reason for Leaving Clarification: Replace reason with leaving_reason or leaving_reason_category to provide more specific details.											
Salary Breakdown: Add base_salary, bonus, and benefits to track detailed salary information.											
Company Location: Add company_address, company_city, and company_country to track the location of the employer.											
References or Feedback: Include reference_contact and employer_feedback for better evaluation of the candidate’s previous employment.											
gap_duration: Add a field to calculate and store the number of days between the end of one job and the start of the next.											
gap_explanation: Add a field for the candidate to explain the reason for any employment gaps.											
Automated Gap Detection: Implement system logic to automatically flag significant gaps in employment for review.											



contactus											
Status or Soft-Deletion: Add status to track whether the request is open or closed.											
Priority: Add priority to classify the urgency of the request.											
Category: Add category to classify the request type (e.g., inquiry, support).											
Response Tracking: Add response_date, response_by, and response_message to track and manage responses.											
Follow-Up: Add follow_up_date to track the follow-up schedule for unresolved requests.											
IP Address or Session Tracking: Add user_ip and session_id to capture the origin of the contact request.											
Attachments: Add attachments to store file paths or URLs for supporting documents.											



django_content_type											
Foreign Key: Add model_metadata_id to reference additional metadata (optional, if needed).											
Status or Soft-Deletion: Add is_active to track whether the content type is active or archived.											
Description: Add description to provide more context about the content type.											
Timestamps: Add created_on and updated_on for better tracking of content type creation and updates.											
Category or Type: Add category to group content types by their purpose (e.g., model, view, permission).											
Audit Information: Add updated_by to track who last modified the content type.											



FAQS											
Foreign Keys: Add category_id and tag_id to link the FAQ to categories and tags for better organization.											
Status or Soft-Deletion: Add is_active to track active vs. archived FAQs.											
Priority: Add priority to display important FAQs first.											
Category or Topic: Add category to group FAQs by topic (e.g., billing, technical_support).											
Author Information: Add created_by_id to track the creator of the FAQ.											
Keywords: Add keywords for better search optimization.											
Rating or Feedback: Add rating and feedback fields to track user interaction and opinions.											





recruiter_candidate_review											
Foreign Keys: Ensure valid references for recruiter_id and candidate_id.											
Status or Soft-Deletion: Add is_active to track valid vs. archived reviews.											
Review Type: Add review_type to specify the kind of review (e.g., interview, performance).											
Approval or Visibility Control: Add is_approved to manage the visibility of the review.											
Audit or Modification Tracking: Add updated_by_id to track who last modified the review.											
Review Date: Add review_date to associate the review with a specific date or event.											
Tags or Keywords: Add tags for better categorization and searchability of reviews.											



smtp_settings											
Status or Soft-Deletion: Add is_active to track whether the SMTP settings are active or archived.											
Secure Storage: Add password_encrypted to track whether the password is stored securely.											
Connection Status: Add last_connection_status and last_connection_attempt for testing SMTP connection validity.											
User Tracking: Add created_by_id to track who created or modified the SMTP settings.											
Default Flag: Add is_default to specify the default SMTP configuration.											
OAuth2 Support: Add fields for OAuth2 configuration (oauth_client_id, oauth_client_secret, oauth_refresh_token).											
SMTP Security Settings: Add smtp_security for additional security configurations.											




user_user_permissions											
Foreign Keys: Ensure valid references for user_id and permission_id from the user and auth_permission tables.											
Status or Soft-Deletion: Add is_active to track active vs. archived permissions.											
Timestamps: Add created_on and updated_on to track when the permission was granted and modified.											
Audit Information: Add updated_by_id to track who modified the permission.											
Role-based Permissions: Add role_id to link permissions to specific roles.											
Expiration or Validity Period: Add valid_from and valid_until to manage temporary permissions.											
Justification: Add reason to explain why a permission was granted.											
Permission Type: Add permission_type to specify the level or type of permission (e.g., read, write, admin).											



Invoice											
Invoice Header: Add trust_name, pay_reference_number, invoice_date, supplier_name, and supplier_address to capture key header details.											
Customer Information: Add customer_name, customer_address, and customer_contact_details to store customer-related data.											
Assignment Information: Include location_name, location_address, unit_name, and unit_contact_details for assignment-related data.											
Staff Details: Add fields for staff_name, staff_role, assignment_start_date, assignment_end_date, hours_worked, and hourly_rate.											
Invoice Details: Include services_description, quantity, unit_price, total_amount, and assignment_reference to capture the invoice line item details.											
Payment Information: Add payment_terms, payment_method, and bank_details to track payment information.											
Additional Information: Include comments, billing_contact_name, billing_contact_phone, billing_contact_email, and billing_address for additional info and contact details.											
Foreign Keys: Ensure valid references for user_id to link the invoice to a specific user.											
Tax and Discount: Add tax_amount and discount_amount for better invoice breakdown.											
Payment Tracking: Add payment_status, payment_date, and payment_method for tracking payments.											
Currency: Add currency to support multiple currencies in invoices.											
Audit or Modification Tracking: Add created_by_id and updated_by_id to track modifications to the invoice.											
Invoice Type: Add invoice_type to classify the invoice (e.g., regular, pro_forma).											
Reminder or Due Date Alerts: Add reminder_sent and next_reminder_date to manage overdue invoices.											
Attachment or Document Link: Add attachment_url to link related files to the invoice.											
Summary of Invoice											



Shift Booking Schema											
id		Primary key for the shift booking.									
created_on		Timestamp when the shift booking was created.									
updated_on		Timestamp when the shift booking was last updated.									
booking_reference		Unique reference number for the booking.									
job_id		Foreign key to the job posting associated with this shift.									
candidate_id		Foreign key to the candidate assigned to the shift.									
recruiter_id		Foreign key to the recruiter managing the booking.									
shift_start		Start date and time of the shift.									
shift_end		End date and time of the shift.									
location_name		Name of the location for the shift.									
location_address		Address of the shift location.									
unit_name		Name of the unit (e.g., ICU, ER).									
hourly_rate		Hourly rate for the shift.									
hours_booked		Total hours booked for the shift.									
shift_status		Status of the shift (e.g., booked, completed, cancelled).									
special_instructions		Special instructions or notes for the shift.									
confirmation_status		Indicates whether the candidate has confirmed the shift (1 for yes, 0 for no).									
cancellation_reason		Reason for cancellation if the shift is cancelled.									
timesheet_submitted		Indicates whether a timesheet has been submitted for the shift (1 for yes).									
payment_status		Payment status (e.g., pending, paid).									
created_by_id		ID of the user who created the booking.									
updated_by_id		ID of the user who last updated the booking.									
check_in_time		Time when the candidate checks in for the shift.									
check_out_time		Time when the candidate checks out after the shift.									
rating_by_candidate		Candidate's rating for the shift (1-5).									
rating_by_Client		Client's rating for the candidate (1-5).									
rating_by_recruiter		Recruiter's rating for the candidate (1-5).									
feedback		Optional comments or feedback for the shift.									
right_to_work_checked		Indicates if the candidate's right to work has been verified (1 for yes).									
shift_agreement_uploaded		File path or URL for the shift agreement document.									
is_recurring		Indicates if the shift is part of a recurring booking (1 for yes, 0 for no).									
recurrence_pattern		Recurrence pattern for the shift (e.g., daily, weekly).									
has_conflict		Indicates if the shift has scheduling conflicts (1 for yes, 0 for no).									
notification_sent		Indicates if a notification was sent about the shift (1 for yes, 0 for no).									
notification_timestamp		Timestamp of the last notification sent.									
change_log		A JSON or text field to track changes to the booking record for auditing.									



Availability											
id		Primary key for the availability record.									
candidate_id		Foreign key to the candidate who provided the availability.									
recruiter_id		Foreign key to the recruiter managing the availability.									
start_date		Start date of the availability period.									
end_date		End date of the availability period.									
availability_status		Status of availability (e.g., available, unavailable, on_leave).									
time_from		Start time for the candidate's availability.									
time_to		End time for the candidate's availability.									
recurrence_pattern		Recurrence pattern for availability (e.g., daily, weekly).									
recurrence_start_date		Start date for the recurrence.									
recurrence_end_date		End date for the recurrence.									
days_of_week		Days of the week the candidate is available (e.g., Monday, Wednesday).									
preferred_location		Candidate's preferred location for shifts.									
travel_distance		Maximum travel distance in miles/kilometers.									
special_notes		Additional notes regarding availability (e.g., preferences or constraints).									
linked_shift_id		References the associated shift if already booked.									
availability_change_notification		Indicates if a notification was sent (1 for yes).									
reliability_score		A score based on past availability and adherence.									
conflict_detected		Indicates if availability conflicts with existing bookings (1 for yes).									
created_on		Timestamp when the availability record was created.									
updated_on		Timestamp when the availability record was last updated.									
created_by_id		ID of the user who created the availability record.									
updated_by_id		ID of the user who last updated the availability record.									




Timesheets											
id		Primary key for the timesheet record.									
shift_id		Foreign key to the associated shift booking.									
candidate_id		Foreign key to the candidate who worked the shift.									
recruiter_id		Foreign key to the recruiter managing the shift.									
start_time		Actual start time recorded on the timesheet.									
end_time		Actual end time recorded on the timesheet.									
hours_worked		Total hours worked during the shift.									
break_time		Total break time (in hours).									
overtime_hours		Total overtime hours worked (if applicable).									
hourly_rate		Hourly rate for the candidate during the shift.									
total_payment		Total payment calculated for the hours worked (excluding or including overtime).									
approval_status		Status of the timesheet (e.g., pending, approved, rejected).									
approved_by_id		Foreign key to the user who approved the timesheet.									
approval_date		Date when the timesheet was approved.									
submission_date		Date when the timesheet was submitted by the candidate.									
special_notes		Any additional notes or comments related to the timesheet.									
timesheet_document_url		URL or file path for an uploaded timesheet document (if applicable).									
created_on		Timestamp when the timesheet record was created.									
updated_on		Timestamp when the timesheet record was last updated.									
created_by_id		ID of the user who created the timesheet.									
updated_by_id		ID of the user who last updated the timesheet.									



1. Core Message Table											

This table stores the details of each message sent through any channel.											

id		Primary key for the message record.									
message_type		Type of message (e.g., email, SMS, push_notification, whatsapp).									
recipient_id		Foreign key to the user, candidate, or contact who received the message.									
recipient_contact		Contact details (e.g., email address, phone number, WhatsApp ID).									
message_subject		Subject of the message (for emails or WhatsApp messages).									
message_body		Content of the message (text or HTML).									
delivery_channel		Channel used for delivery (e.g., Twilio, Firebase, Email).									
sent_timestamp		Timestamp when the message was sent.									
delivery_status		Status of delivery (e.g., sent, failed, delivered, read).									
status_details		Additional details about the delivery status (e.g., failure reason).									
read_timestamp		Timestamp when the recipient read the message (if applicable).									
template_id		Foreign key to the message template used.									
follow_up_required		Indicates whether a follow-up action is required (1 for yes, 0 for no).									
follow_up_id		Foreign key to the follow-up action (if required).									
created_on		Timestamp when the message record was created.									
created_by_id		ID of the user or system that initiated the message.									


2. Message Template Table											

This table stores predefined templates for messages to ensure consistency and efficiency.											

id		Primary key for the template record.									
template_name		Name of the template (e.g., Interview Confirmation, Shift Reminder).									
message_type		Type of message (e.g., email, SMS, push_notification, whatsapp).									
template_subject		Subject of the message (for emails or WhatsApp messages).									
template_body		Content of the message template (text or HTML).									
created_on		Timestamp when the template was created.									
updated_on		Timestamp when the template was last updated.									
created_by_id		ID of the user who created the template.									
updated_by_id		ID of the user who last updated the template.									


3. Follow-Up Table											

This table tracks follow-up actions triggered by communication.											


id		Primary key for the follow-up record.									
related_message_id		Foreign key to the message that requires follow-up.									
follow_up_type		Type of follow-up (e.g., call, email, manual_check).									
assigned_to_id		ID of the user assigned to handle the follow-up.									
due_date		Date and time when the follow-up action is due.									
status		Status of the follow-up (e.g., pending, completed, cancelled).									
notes		Additional notes or comments about the follow-up action.									
created_on		Timestamp when the follow-up was created.									
updated_on		Timestamp when the follow-up was last updated.									


4. Notification Log Table											

This table specifically tracks real-time push notifications.											


id		Primary key for the notification log record.									
notification_type		Type of notification (e.g., system alert, shift reminder).									
user_id		Foreign key to the user receiving the notification.									
title		Title of the notification.									
message		Content of the notification.									
sent_timestamp		Timestamp when the notification was sent.									
delivery_status		Status of the notification (e.g., sent, delivered).									
read_status		Indicates whether the notification was read (1 for yes, 0 for no).									
read_timestamp		Timestamp when the notification was read.									






2. Escalation Workflow											

Field Name		Description									
id		Primary key for the escalation record.									
related_shift_id		Foreign key to the shift causing the escalation.									
escalation_reason		Reason for escalation (e.g., candidate no-show, client complaint).									
escalation_level		Level of escalation (e.g., low, medium, high).									
assigned_to_id		ID of the user assigned to handle the escalation.									
resolution_status		Status of the escalation (e.g., open, resolved, closed).									
resolution_notes		Notes on how the issue was resolved.									
created_on		Timestamp when the escalation was created.									
updated_on		Timestamp when the escalation was last updated.									


Oncall Recruiter Handover Notes											

Field Name		Description									
id		Primary key for the handover note record.									
oncall recruiter_id		Foreign key to the shift for which the note is recorded.									
handover_notes		Details of the handover (e.g., unfinished tasks, special instructions).									
submitted_by_id		ID of the user who submitted the handover note.									
submitted_on		Timestamp when the handover note was submitted.									
status		Status of the note (e.g., pending, reviewed).									


4. Referral Programs											

Field Name		Description									
id		Primary key for the referral record.									
referrer_id		Foreign key to the user who referred the candidate.									
referred_candidate_id		Foreign key to the referred candidate.									
reward_status		Status of the reward (e.g., pending, paid).									
reward_amount		Amount of reward for the referral.									
reward_issued_on		Timestamp when the reward was issued.									
created_on		Timestamp when the referral was created.									


5. Cancellation Policies											

Field Name		Description									
id		Primary key for the cancellation policy record.									
entity_type		Type of entity (e.g., shift, invoice, booking).									
cancellation_reason		Reason for cancellation (e.g., client cancellation, candidate no-show).									
cancellation_fee		Fee charged for the cancellation (if applicable).									
applies_to		Indicates who the policy applies to (e.g., candidate, client).									
created_on		Timestamp when the policy was created.									
updated_on		Timestamp when the policy was last updated.									


6. Shift Matching Algorithm											

Field Name		Description									
id		Primary key for the matching record.									
shift_id		Foreign key to the shift being matched.									
candidate_id		Foreign key to the candidate being considered for the shift.									
match_score		Score indicating the match quality (e.g., 95.5).									
skills_matched		Skills that matched between the candidate and the shift.									
location_matched		1 if the location matches, 0 otherwise.									
availability_matched		1 if the candidate is available, 0 otherwise.									
created_on		Timestamp when the match was recorded.									


7. Compliance Dashboard											

Field Name		Description									
id		Primary key for the compliance record.									
entity_type		Type of entity (e.g., candidate, client, shift).									
compliance_status		Status of compliance (e.g., compliant, non-compliant).									
compliance_reason		Reason for non-compliance (e.g., expired document, missing checks).									
action_required_by		ID of the user required to resolve the compliance issue.									
deadline		Deadline for resolving the compliance issue.									
created_on		Timestamp when the compliance record was created.									
updated_on		Timestamp when the compliance record was last updated.									

Job Application Tracking											
CREATE TABLE job_application_tracking (											
    id CHAR(32) PRIMARY KEY,											
    created_on DATETIME(6) DEFAULT CURRENT_TIMESTAMP,											
    updated_on DATETIME(6) DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,											
    user_id CHAR(32),											
    job_id CHAR(32),											
    status ENUM('applied', 'interview_scheduled', 'interviewed', 'offered', 'rejected', 'hired') NOT NULL,											
    recruiter_feedback TEXT,											
    recruiter_id CHAR(32),											
    last_updated_by CHAR(32),											
    FOREIGN KEY (user_id) REFERENCES user(id),											
    FOREIGN KEY (job_id) REFERENCES company_jobs(id),											
    FOREIGN KEY (recruiter_id) REFERENCES user(id),											
    FOREIGN KEY (last_updated_by) REFERENCES user(id)											
);											


Invoicing											
CREATE TABLE invoices (											
    id CHAR(32) PRIMARY KEY,											
    created_on DATETIME(6) DEFAULT CURRENT_TIMESTAMP,											
    updated_on DATETIME(6) DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,											
    client_id CHAR(32),											
    invoice_number VARCHAR(50) UNIQUE NOT NULL,											
    amount DECIMAL(10,2),											
    due_date DATE,											
    status ENUM('unpaid', 'paid', 'overdue') DEFAULT 'unpaid',											
    payment_reference VARCHAR(255) NULL,											
    FOREIGN KEY (client_id) REFERENCES client_company(id)											
);											


Shift Scheduling & Attendance											
CREATE TABLE shift_scheduling (											
    id CHAR(32) PRIMARY KEY,											
    created_on DATETIME(6) DEFAULT CURRENT_TIMESTAMP,											
    updated_on DATETIME(6) DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,											
    job_id CHAR(32),											
    candidate_id CHAR(32),											
    shift_start DATETIME(6),											
    shift_end DATETIME(6),											
    status ENUM('scheduled', 'completed', 'cancelled') DEFAULT 'scheduled',											
    FOREIGN KEY (job_id) REFERENCES company_jobs(id),											
    FOREIGN KEY (candidate_id) REFERENCES user(id)											
);											


CREATE TABLE attendance_tracking (											
    id CHAR(32) PRIMARY KEY,											
    created_on DATETIME(6) DEFAULT CURRENT_TIMESTAMP,											
    candidate_id CHAR(32),											
    shift_id CHAR(32),											
    clock_in DATETIME(6),											
    clock_out DATETIME(6),											
    location_latitude DOUBLE,											
    location_longitude DOUBLE,											
    FOREIGN KEY (candidate_id) REFERENCES user(id),											
    FOREIGN KEY (shift_id) REFERENCES shift_scheduling(id)											
);											


Compliance & Document Expiry											
CREATE TABLE compliance_documents (											
    id CHAR(32) PRIMARY KEY,											
    user_id CHAR(32),											
    document_type ENUM('DBS', 'RTW', 'Visa', 'Insurance', 'Other') NOT NULL,											
    document_path VARCHAR(255),											
    expiry_date DATE,											
    is_valid BOOLEAN DEFAULT TRUE,											
    FOREIGN KEY (user_id) REFERENCES user(id)											
);											

Performance & Feedback Management											
CREATE TABLE candidate_performance (											
    id CHAR(32) PRIMARY KEY,											
    created_on DATETIME(6) DEFAULT CURRENT_TIMESTAMP,											
    updated_on DATETIME(6) DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,											
    candidate_id CHAR(32),											
    job_id CHAR(32),											
    recruiter_feedback TEXT,											
    client_feedback TEXT,											
    performance_score INT CHECK (performance_score BETWEEN 1 AND 10),											
    FOREIGN KEY (candidate_id) REFERENCES user(id),											
    FOREIGN KEY (job_id) REFERENCES company_jobs(id)											
);											


Audit Logs & Security Enhancements											
CREATE TABLE audit_logs (											
    id CHAR(32) PRIMARY KEY,											
    created_on DATETIME(6) DEFAULT CURRENT_TIMESTAMP,											
    user_id CHAR(32),											
    action_type ENUM('create', 'update', 'delete', 'login', 'logout', 'password_change') NOT NULL,											
    entity VARCHAR(255),											
    entity_id CHAR(32),											
    ip_address VARCHAR(45),											
    user_agent TEXT,											
    FOREIGN KEY (user_id) REFERENCES user(id)											
);											

CREATE TABLE security_settings (											
    id CHAR(32) PRIMARY KEY,											
    user_id CHAR(32),											
    mfa_enabled BOOLEAN DEFAULT FALSE,											
    last_password_change DATETIME(6),											
    failed_login_attempts INT DEFAULT 0,											
    account_locked BOOLEAN DEFAULT FALSE,											
    FOREIGN KEY (user_id) REFERENCES user(id)											
);											



Payroll											
CREATE TABLE payroll (											
    id CHAR(32) PRIMARY KEY,											
    created_on DATETIME(6) DEFAULT CURRENT_TIMESTAMP,											
    updated_on DATETIME(6) DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,											
    user_id CHAR(32),											
    job_id CHAR(32),											
    base_salary DECIMAL(10,2),											
    overtime_hours INT DEFAULT 0,											
    overtime_pay DECIMAL(10,2) DEFAULT 0,											
    tax_deductions DECIMAL(10,2) DEFAULT 0,											
    net_salary DECIMAL(10,2) GENERATED ALWAYS AS (base_salary + overtime_pay - tax_deductions) STORED,											
    payment_status ENUM('pending', 'processed', 'failed') DEFAULT 'pending',											
    payment_date DATETIME(6),											
    FOREIGN KEY (user_id) REFERENCES user(id),											
    FOREIGN KEY (job_id) REFERENCES company_jobs(id)											
);											
