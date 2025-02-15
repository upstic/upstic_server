
```
recruitment
├─ .cursorrules
├─ .env
├─ docs
│  └─ CONTEXT.md
├─ package-lock.json
├─ package.json
├─ README.md
├─ scratchpad.md
├─ src
│  ├─ app.module.ts
│  ├─ app.ts
│  ├─ components
│  │  ├─ ai
│  │  │  └─ AIMatchingEngine.ts
│  │  ├─ analytics
│  │  │  └─ AnalyticsEngine.ts
│  │  ├─ auth
│  │  │  └─ TwoFactorAuth.ts
│  │  ├─ automation
│  │  │  └─ AutomationManager.ts
│  │  ├─ branch
│  │  │  └─ BranchLocationManager.ts
│  │  ├─ cache
│  │  │  └─ CacheHandler.ts
│  │  ├─ candidate
│  │  │  └─ CandidateRelationshipManager.ts
│  │  ├─ client
│  │  │  └─ ClientRelationshipTracker.ts
│  │  ├─ communication
│  │  │  └─ CommunicationCoordinator.ts
│  │  ├─ compliance
│  │  │  └─ ComplianceManager.ts
│  │  ├─ document
│  │  │  ├─ DocumentHandler.ts
│  │  │  └─ DocumentProcessor.ts
│  │  ├─ email
│  │  │  └─ EmailCampaignManager.ts
│  │  ├─ file
│  │  │  └─ FileUploadHandler.ts
│  │  ├─ finance
│  │  │  ├─ BudgetManager.ts
│  │  │  └─ FinanceTracker.ts
│  │  ├─ integration
│  │  │  └─ IntegrationManager.ts
│  │  ├─ job
│  │  │  ├─ JobMatchingEngine.ts
│  │  │  └─ JobPostingManager.ts
│  │  ├─ matching
│  │  │  └─ JobMatchingEngine.ts
│  │  ├─ ml
│  │  │  └─ MachineLearningService.ts
│  │  ├─ notification
│  │  │  ├─ NotificationHandler.ts
│  │  │  └─ NotificationManager.ts
│  │  ├─ payroll
│  │  │  └─ PayrollProcessor.ts
│  │  ├─ performance
│  │  │  └─ PerformanceTracker.ts
│  │  ├─ realtime
│  │  │  └─ RealtimeUpdates.ts
│  │  ├─ report
│  │  │  └─ ReportGenerator.ts
│  │  ├─ reporting
│  │  │  └─ ReportGenerator.ts
│  │  ├─ search
│  │  │  └─ SearchOptimizer.ts
│  │  ├─ security
│  │  │  ├─ RateLimiter.ts
│  │  │  └─ SecurityManager.ts
│  │  ├─ skill
│  │  │  └─ SkillAssessmentEngine.ts
│  │  ├─ skills
│  │  │  └─ SkillRequirementManager.ts
│  │  ├─ staffing
│  │  │  └─ StaffingRequirementTracker.ts
│  │  ├─ sync
│  │  │  └─ DataSynchronizer.ts
│  │  ├─ task
│  │  │  └─ TaskScheduler.ts
│  │  ├─ worker
│  │  │  ├─ AvailabilityManager.ts
│  │  │  └─ WorkerProfileManager.ts
│  │  └─ workflow
│  │     └─ WorkflowEngine.ts
│  ├─ config
│  │  ├─ config.ts
│  │  ├─ database.ts
│  │  └─ index.ts
│  ├─ controllers
│  │  ├─ ai-matching.controller.ts
│  │  ├─ app.controller.ts
│  │  ├─ application.controller.ts
│  │  ├─ auth.controller.ts
│  │  ├─ availability.controller.ts
│  │  ├─ base.controller.ts
│  │  ├─ branch.controller.ts
│  │  ├─ client.controller.ts
│  │  ├─ document.controller.ts
│  │  ├─ job.controller.ts
│  │  ├─ message.controller.ts
│  │  ├─ notification.controller.ts
│  │  ├─ payroll.controller.ts
│  │  ├─ push-notification.controller.ts
│  │  ├─ report.controller.ts
│  │  ├─ schedule.controller.ts
│  │  ├─ search.controller.ts
│  │  ├─ shift.controller.ts
│  │  ├─ timesheet.controller.ts
│  │  └─ worker.controller.ts
│  ├─ core
│  │  ├─ decorators
│  │  │  ├─ index.ts
│  │  │  ├─ roles.decorator.ts
│  │  │  └─ user.decorator.ts
│  │  ├─ exceptions
│  │  │  ├─ http.exception.ts
│  │  │  └─ index.ts
│  │  ├─ filters
│  │  │  ├─ http-exception.filter.ts
│  │  │  └─ index.ts
│  │  ├─ guards
│  │  │  ├─ auth.guard.ts
│  │  │  ├─ index.ts
│  │  │  └─ roles.guard.ts
│  │  ├─ health
│  │  │  └─ health.controller.ts
│  │  ├─ index.ts
│  │  ├─ interceptors
│  │  │  ├─ index.ts
│  │  │  ├─ logging.interceptor.ts
│  │  │  └─ transform.interceptor.ts
│  │  ├─ interfaces
│  │  │  ├─ index.ts
│  │  │  ├─ response.interface.ts
│  │  │  └─ user.interface.ts
│  │  ├─ pipes
│  │  │  └─ validation.pipe.ts
│  │  └─ utils
│  │     ├─ crypto.util.ts
│  │     ├─ index.ts
│  │     └─ validation.util.ts
│  ├─ decorators
│  │  ├─ current-user.decorator.ts
│  │  └─ roles.decorator.ts
│  ├─ guards
│  │  ├─ auth.guard.ts
│  │  ├─ jwt-auth.guard.ts
│  │  └─ roles.guard.ts
│  ├─ interfaces
│  │  ├─ config.interface.ts
│  │  ├─ jwt-payload.interface.ts
│  │  ├─ jwt.interface.ts
│  │  ├─ logger.interface.ts
│  │  ├─ models.interface.ts
│  │  ├─ report.interface.ts
│  │  └─ user.interface.ts
│  ├─ main.ts
│  ├─ middleware
│  │  ├─ auth
│  │  │  └─ authHandler.ts
│  │  ├─ auth.middleware.ts
│  │  ├─ authenticateJWT.ts
│  │  ├─ cache
│  │  │  ├─ monitor.ts
│  │  │  ├─ optimizer.ts
│  │  │  ├─ strategies.ts
│  │  │  └─ warmer.ts
│  │  ├─ cache.ts
│  │  ├─ cacheHandler.ts
│  │  ├─ checkRole.ts
│  │  ├─ compression.ts
│  │  ├─ error
│  │  │  └─ types.ts
│  │  ├─ errorHandler.ts
│  │  ├─ fileCompression
│  │  │  ├─ adaptive.ts
│  │  │  ├─ algorithms.ts
│  │  │  ├─ batch.ts
│  │  │  ├─ compression.worker.ts
│  │  │  └─ quality.ts
│  │  ├─ fileCompression.ts
│  │  ├─ fileHandler.ts
│  │  ├─ fileUploadSanitization.ts
│  │  ├─ logging.ts
│  │  ├─ performance.ts
│  │  ├─ rateLimit.ts
│  │  ├─ responseHandler.ts
│  │  ├─ sanitization.ts
│  │  ├─ security
│  │  │  └─ rateLimit.ts
│  │  ├─ security.ts
│  │  ├─ upload.ts
│  │  ├─ validateRequest.ts
│  │  └─ validation.middleware.ts
│  ├─ models
│  │  ├─ Application.ts
│  │  ├─ Availability.ts
│  │  ├─ Branch.ts
│  │  ├─ Candidate.ts
│  │  ├─ Client.ts
│  │  ├─ ClientRole.ts
│  │  ├─ Compliance.ts
│  │  ├─ ComplianceRequirement.ts
│  │  ├─ Document.ts
│  │  ├─ IdentityVerification.ts
│  │  ├─ Integration.ts
│  │  ├─ Job.ts
│  │  ├─ JobApplication.ts
│  │  ├─ JobPosting.ts
│  │  ├─ MatchingCriteria.ts
│  │  ├─ Message.ts
│  │  ├─ notification.model.ts
│  │  ├─ Notification.ts
│  │  ├─ Payment.ts
│  │  ├─ Payroll.ts
│  │  ├─ Rate.ts
│  │  ├─ RateCard.ts
│  │  ├─ Report.ts
│  │  ├─ Schedule.ts
│  │  ├─ SearchProfile.ts
│  │  ├─ Shift.ts
│  │  ├─ Timesheet.ts
│  │  ├─ TwoFactorAuth.ts
│  │  ├─ User.ts
│  │  ├─ Worker.ts
│  │  ├─ WorkerProfile.ts
│  │  └─ WorkHistory.ts
│  ├─ modules
│  │  ├─ ai-matching
│  │  │  └─ ai-matching.module.ts
│  │  ├─ auth
│  │  │  └─ auth.module.ts
│  │  ├─ clients
│  │  │  └─ clients.module.ts
│  │  ├─ jobs
│  │  │  └─ jobs.module.ts
│  │  ├─ reporting
│  │  │  ├─ interfaces
│  │  │  │  ├─ report-type.enum.ts
│  │  │  │  └─ report.interface.ts
│  │  │  └─ reporting.service.ts
│  │  ├─ skills
│  │  │  ├─ interfaces
│  │  │  │  ├─ skill-category.enum.ts
│  │  │  │  └─ skill-level.enum.ts
│  │  │  └─ skills.service.ts
│  │  ├─ users
│  │  │  └─ users.module.ts
│  │  └─ workers
│  │     └─ workers.module.ts
│  ├─ routes
│  │  ├─ ai-matching.routes.ts
│  │  ├─ application.routes.ts
│  │  ├─ auth.routes.ts
│  │  ├─ availability.routes.ts
│  │  ├─ branch.routes.ts
│  │  ├─ client.routes.ts
│  │  ├─ document.routes.ts
│  │  ├─ index.ts
│  │  ├─ job.routes.ts
│  │  ├─ message.routes.ts
│  │  ├─ notification.routes.ts
│  │  ├─ payroll.routes.ts
│  │  ├─ push-notification.routes.ts
│  │  ├─ report.routes.ts
│  │  ├─ schedule.routes.ts
│  │  ├─ search.routes.ts
│  │  ├─ shift.routes.ts
│  │  ├─ timesheet.routes.ts
│  │  └─ user.routes.ts
│  ├─ schemas
│  │  ├─ application.schema.ts
│  │  ├─ client.schema.ts
│  │  ├─ job.schema.ts
│  │  ├─ match.schema.ts
│  │  ├─ report.schema.ts
│  │  ├─ shift.schema.ts
│  │  ├─ worker-profile.schema.ts
│  │  └─ worker.schema.ts
│  ├─ services
│  │  ├─ ai-matching.service.ts
│  │  ├─ analytics.service.ts
│  │  ├─ application.service.ts
│  │  ├─ ats.service.ts
│  │  ├─ auth.service.ts
│  │  ├─ availability.service.ts
│  │  ├─ billing.service.ts
│  │  ├─ branch.service.ts
│  │  ├─ cache.service.ts
│  │  ├─ client-role.service.ts
│  │  ├─ client.service.ts
│  │  ├─ communication.service.ts
│  │  ├─ compliance-monitoring.service.ts
│  │  ├─ compliance.service.ts
│  │  ├─ document.service.ts
│  │  ├─ email.service.ts
│  │  ├─ file-upload.service.ts
│  │  ├─ financial.service.ts
│  │  ├─ identity-verification.service.ts
│  │  ├─ integration.service.ts
│  │  ├─ job-matching-notification.service.ts
│  │  ├─ job-posting.service.ts
│  │  ├─ job.service.ts
│  │  ├─ matching.service.ts
│  │  ├─ ml.service.ts
│  │  ├─ notification.service.ts
│  │  ├─ payment.service.ts
│  │  ├─ payroll.service.ts
│  │  ├─ push-notification.service.ts
│  │  ├─ redis.service.ts
│  │  ├─ report.service.ts
│  │  ├─ schedule.service.ts
│  │  ├─ search.service.ts
│  │  ├─ shift.service.ts
│  │  ├─ timesheet.service.ts
│  │  ├─ two-factor-auth.service.ts
│  │  ├─ user.service.ts
│  │  ├─ websocket.service.ts
│  │  ├─ work-history.service.ts
│  │  ├─ worker-profile.service.ts
│  │  └─ worker.service.ts
│  ├─ templates
│  │  └─ emails
│  │     └─ index.ts
│  ├─ types
│  │  ├─ analytics.types.ts
│  │  ├─ application.types.ts
│  │  ├─ auth.types.ts
│  │  ├─ branch.types.ts
│  │  ├─ express
│  │  │  └─ index.d.ts
│  │  ├─ job.types.ts
│  │  ├─ message.types.ts
│  │  ├─ mongoose.types.ts
│  │  ├─ notification.types.ts
│  │  ├─ rate.types.ts
│  │  ├─ search.types.ts
│  │  └─ shift.types.ts
│  ├─ utils
│  │  ├─ auth.ts
│  │  ├─ caching.ts
│  │  ├─ cv-parser.ts
│  │  ├─ document-validator.ts
│  │  ├─ email.ts
│  │  ├─ error-handling.ts
│  │  ├─ excel-generator.ts
│  │  ├─ experience.utils.ts
│  │  ├─ formatting.ts
│  │  ├─ image-processor.ts
│  │  ├─ location.utils.ts
│  │  ├─ logger.ts
│  │  ├─ pdf-generator.ts
│  │  ├─ permission-validator.ts
│  │  ├─ push-notification.ts
│  │  ├─ redis.ts
│  │  ├─ s3.ts
│  │  ├─ sanitizer.ts
│  │  ├─ security.ts
│  │  ├─ skill-matching.utils.ts
│  │  └─ validation.ts
│  ├─ validations
│  │  ├─ auth.validation.ts
│  │  ├─ availability.validation.ts
│  │  ├─ job.validation.ts
│  │  └─ push-notification.validation.ts
│  └─ validators
│     ├─ analytics.validator.ts
│     ├─ application.validator.ts
│     ├─ auth.validator.ts
│     ├─ availability.validator.ts
│     ├─ branch.validator.ts
│     ├─ client.validator.ts
│     ├─ communication.validator.ts
│     ├─ document.validator.ts
│     ├─ integration.validator.ts
│     ├─ invoice.validator.ts
│     ├─ job.validator.ts
│     ├─ leave.validator.ts
│     ├─ matching.validator.ts
│     ├─ metrics.validator.ts
│     ├─ payroll.validator.ts
│     ├─ performance.validator.ts
│     ├─ profile.validator.ts
│     ├─ project.validator.ts
│     ├─ report.validator.ts
│     ├─ schedule.validator.ts
│     ├─ search.validator.ts
│     ├─ timesheet.validator.ts
│     ├─ training.validator.ts
│     ├─ user.validator.ts
│     ├─ websocket.validator.ts
│     └─ worker.validator.ts
└─ tsconfig.json

```