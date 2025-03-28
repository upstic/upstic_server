# API Endpoints Inventory

This document tracks all API endpoints in the application. It serves as a reference for developers to understand the available endpoints and their functionality.

## Authentication

### AuthController (`/auth`)
- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login a user
- `POST /auth/logout` - Logout a user
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password
- `GET /auth/me` - Get current user information
- `POST /auth/refresh-token` - Refresh authentication token

## User Management

### WorkerController (`/workers`)
- `GET /workers` - Get all workers
- `POST /workers` - Create a new worker
- `GET /workers/:id` - Get worker by ID
- `PUT /workers/:id` - Update worker by ID
- `DELETE /workers/:id` - Delete worker by ID
- `GET /workers/:id/availability` - Get worker availability
- `PUT /workers/:id/availability` - Update worker availability
- `GET /workers/:id/applications` - Get worker job applications

## Client Management

### ClientController (`/clients`)
- `GET /clients` - Get all clients
- `POST /clients` - Create a new client
- `GET /clients/:id` - Get client by ID
- `PUT /clients/:id` - Update client by ID
- `DELETE /clients/:id` - Delete client by ID
- `GET /clients/:id/workers` - Get workers associated with a client
- `GET /clients/:id/contracts` - Get contracts associated with a client
- `GET /clients/:id/billing` - Get billing information for a client
- `POST /clients/:id/contacts` - Add a contact to a client
- `PUT /clients/:id/contacts/:contactId` - Update a client contact
- `DELETE /clients/:id/contacts/:contactId` - Delete a client contact

## Job Management

### JobController (`/jobs`)
- `GET /jobs` - Get all jobs
- `POST /jobs` - Create a new job
- `GET /jobs/search` - Search for jobs
- `GET /jobs/:id` - Get job by ID
- `PUT /jobs/:id` - Update job by ID
- `DELETE /jobs/:id` - Delete job by ID
- `POST /jobs/:id/publish` - Publish a job
- `GET /jobs/:id/applications` - Get applications for a job
- `GET /jobs/:id/matches` - Get matching candidates for a job
- `GET /jobs/:id/recommended` - Get recommended candidates for a job
- `PUT /jobs/:jobId/applications/:applicationId` - Update a job application

### JobOfferController (`/job-offers`)
- `POST /job-offers` - Create a new job offer
- `GET /job-offers` - Get all job offers
- `GET /job-offers/:id` - Get job offer by ID
- `GET /job-offers/candidate/:candidateId` - Get job offers for a candidate
- `GET /job-offers/job/:jobId` - Get job offers for a job
- `PUT /job-offers/:id` - Update job offer by ID
- `PUT /job-offers/:id/respond` - Respond to a job offer
- `DELETE /job-offers/:id` - Delete job offer by ID

## Application Management

### ApplicationController (`/applications`)
- `POST /applications` - Create a new application
- `GET /applications` - Get all applications
- `GET /applications/:id` - Get application by ID
- `PUT /applications/:id/status` - Update application status
- `POST /applications/:id/withdraw` - Withdraw an application
- `GET /applications/worker/:workerId` - Get applications for a worker
- `GET /applications/job/:jobId` - Get applications for a job

## AI Matching

### AiMatchingController (`/ai-matching`)
- `GET /ai-matching/jobs/:workerId` - Get matching jobs for a worker
- `GET /ai-matching/candidates/:jobId` - Get matching candidates for a job
- `POST /ai-matching/notify/:workerId` - Notify a worker about matching jobs
- `GET /ai-matching/recommendations/:workerId` - Get job recommendations for a worker
- `GET /ai-matching/insights/:jobId` - Get insights for a job

## Document Management

### DocumentController (`/documents`)
- `POST /documents/upload` - Upload a document
- `GET /documents/:id` - Get document by ID
- `PUT /documents/:id` - Update document by ID
- `DELETE /documents/:id` - Delete document by ID
- `POST /documents/:id/share` - Share a document
- `DELETE /documents/:id/access/:recipientId` - Revoke document access
- `GET /documents/:id/versions` - Get document versions
- `GET /documents/:id/access-log` - Get document access log
- `POST /documents/:id/verify` - Verify a document

## Reporting

### ReportsController (`/reports`)
- `GET /reports/analytics/jobs` - Get job analytics
- `GET /reports/analytics/workers` - Get worker analytics
- `GET /reports/analytics/applications` - Get application analytics
- `GET /reports/analytics/placements` - Get placement analytics
- `POST /reports` - Create a new report
- `GET /reports/:id` - Get report by ID
- `GET /reports/:id/download` - Download a report
- `DELETE /reports/:id` - Delete report by ID
- `POST /reports/schedule` - Schedule a report
- `DELETE /reports/schedule/:id` - Delete a scheduled report

## Miscellaneous

### AppController (`/`)
- `GET /` - Application health check/info 