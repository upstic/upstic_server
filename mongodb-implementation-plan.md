# MongoDB Implementation Plan

## Overview
This document outlines the plan for implementing MongoDB models based on the requirements in MODS.md and the current codebase. The goal is to ensure all required functionality is available while minimizing duplication and maintaining code quality.

## Current Project Structure
The project follows a standard NestJS architecture with:
- **modules/**: Feature modules (auth, users, jobs, workers, clients, etc.)
- **controllers/**: API endpoints
- **services/**: Business logic
- **models/**: MongoDB model definitions
- **schemas/**: MongoDB schema definitions
- **interfaces/**: TypeScript interfaces
- **dtos/**: Data Transfer Objects for API requests/responses
- **utils/**: Utility functions
- **middleware/**: Express middleware
- **guards/**: NestJS guards for authentication/authorization
- **decorators/**: Custom decorators
- **pipes/**: Validation pipes
- **strategies/**: Authentication strategies
- **config/**: Configuration files
- **templates/**: Email templates
- **validations/**: Validation rules

## Implementation Strategy

### 1. Enhance Existing Models
We'll enhance the following existing models with additional fields from MODS.md:

1. **User.ts**
   - Add security fields (login_attempts, last_login_ip, last_password_change)
   - Add privacy and consent tracking fields
   - Add user preferences fields

2. **Document.ts**
   - Add compliance status field
   - Add verification details
   - Add expiry tracking
   - Add document type enhancements

3. **Timesheet.ts**
   - Add period/week tracking
   - Add clock-in/clock-out tracking
   - Add duration calculations
   - Add audit information

4. **WorkHistory.ts**
   - Add gap duration and explanation fields
   - Add company location fields
   - Add reference contact information
   - Add salary breakdown fields

5. **Client.ts**
   - Add company registration fields
   - Add billing contact information
   - Add purchase order number
   - Add website URL

6. **Compliance.ts**
   - Add compliance type field
   - Add re-evaluation and expiration tracking
   - Add document tracking fields
   - Add notes/comments field

7. **Shift.ts**
   - Add booking reference
   - Add confirmation status
   - Add check-in/check-out times
   - Add rating fields
   - Add feedback field

8. **MatchingCriteria.ts**
   - Add match score field
   - Add skills matched field
   - Add location matched field
   - Add availability matched field

### 2. Merge Duplicate Models
For duplicate models, we'll choose one implementation and enhance it:

1. **JobApplication.ts** (merge with applied_jobs and job_application_tracking)
   - Keep JobApplication.ts as the primary model
   - Add status description field
   - Add application date field
   - Add response time tracking
   - Add salary expectation field
   - Add rejection reason field

2. **Job.ts/JobPosting.ts** (merge with company_jobs)
   - Keep Job.ts as the primary model
   - Move relevant fields from JobPosting.ts
   - Add salary range field
   - Add contract type field
   - Add working hours field
   - Add job benefits field

3. **Notification.ts** (merge with notifications)
   - Keep Notification.ts as the primary model
   - Add priority field
   - Add read/unread timestamp
   - Add expiry date field
   - Add category field

4. **EmailLog.ts** (merge with email_logger)
   - Keep EmailLog.ts as the primary model
   - Add error tracking fields
   - Add retry logic fields
   - Add delivery confirmation fields
   - Add email type field

5. **Message.ts** (merge with message_table)
   - Keep Message.ts as the primary model
   - Add message type field
   - Add delivery status field
   - Add read timestamp field
   - Add follow-up required field

6. **Payroll.ts** (merge with payroll SQL model) ✅ (Enhanced)
   - Keep Payroll.ts as the primary model
   - Add overtime hours field
   - Add tax deductions field
   - Add net salary calculation
   - Add payment status and date fields

7. **Availability.ts** (merge with availability SQL model) ✅ (Enhanced)
   - Keep Availability.ts as the primary model
   - Add recurrence pattern field
   - Add preferred location field
   - Add travel distance field
   - Add reliability score field

### 3. Create New Models
We'll create the following new models based on MODS.md requirements:

#### User Management
1. **UserGroup.ts**
2. **UserPermission.ts**
3. **AuthGroup.ts**
4. **AuthGroupPermission.ts**
5. **AuthPermission.ts**
6. **AuthToken.ts**
7. **LoginHistory.ts**
8. **SecuritySettings.ts**

#### Worker/Candidate Management
9. **CandidateJobData.ts**
10. **CandidatePackage.ts**
11. **CandidatePreference.ts**

#### Job Management
12. **JobOffer.ts** ✅ (Implemented and Fixed)

#### Client and Agency Management
13. **ClientLocation.ts**
14. **CompanyLocation.ts**
15. **RecruitmentAgency.ts**
16. **RecruitmentAgencyLocation.ts**
17. **RecruiterData.ts**
18. **RecruiterDataLocation.ts**

#### Compliance
19. **ComplianceDashboard.ts**

#### Scheduling and Attendance
20. **AttendanceTracking.ts**

#### Communication
21. **ContactUs.ts**
22. **ContactUsReply.ts**
23. **ContactDetails.ts**
24. **MessageTemplate.ts**
25. **FollowUp.ts**
26. **NotificationLog.ts**

#### Financial
27. **Invoice.ts**
28. **StripeCredentials.ts**
29. **SubscriptionPlan.ts**

#### Logging and Reporting
30. **ApplicationCrashLog.ts**
31. **SystemLog.ts**
32. **DbLoggerStatus.ts**
33. **DbMigration.ts**
34. **AuditLog.ts**

#### Miscellaneous
35. **Device.ts**
36. **UserSession.ts**
37. **SiteInfo.ts**
38. **Faq.ts**
39. **InterviewScheduled.ts**
40. **ProjectLogo.ts**
41. **RecruiterCandidateReview.ts**
42. **RecruiterFeedback.ts**
43. **SmtpSettings.ts**
44. **StaticPage.ts**
45. **DbBackup.ts**
46. **EscalationWorkflow.ts**
47. **OncallRecruiterHandoverNote.ts**
48. **ReferralProgram.ts**
49. **CancellationPolicy.ts**

## Implementation Priority
We'll implement the models in the following order:

### High Priority (Core Functionality)
1. User Management models
2. Job and Application models
3. Worker/Candidate models
4. Client and Agency models
5. Compliance models

### Medium Priority (Supporting Functionality)
1. Scheduling and Attendance models
2. Communication models
3. Financial models
4. Reporting models

### Low Priority (Nice-to-Have)
1. Miscellaneous models

## Implementation Approach
For each model, we'll:
1. Create or update the interface in `src/interfaces/`
2. Create or update the schema in `src/schemas/`
3. Create or update the model in `src/models/`
4. Update related DTOs in `src/dtos/`
5. Update related services in `src/services/`
6. Update related controllers in `src/controllers/`

## Implementation Progress

### Completed Models
1. **JobOffer.ts** - Implemented with:
   - Interface: `src/interfaces/job-offer.interface.ts`
   - Schema: `src/schemas/job-offer.schema.ts`
   - Model: `src/models/JobOffer.ts`
   - DTOs: `src/dtos/job-offer.dto.ts`
   - Service: `src/services/job-offer.service.ts` (Fixed TypeScript errors)
   - Controller: `src/controllers/job-offer.controller.ts`

2. **Payroll.ts** - Enhanced with:
   - Added job_id field to link payroll to specific jobs
   - Added tax_code field for payroll processing
   - Enhanced tax deductions with detailed breakdown
   - Added payment_status and payment_date fields
   - Added net salary calculation with pre-save middleware
   - Updated PayrollService with new methods for tax code management and payment failure handling

3. **Availability.ts** - Enhanced with:
   - Added recurrence pattern field with support for daily, weekly, biweekly, and monthly patterns
   - Added reliability score field with metrics for tracking worker reliability
   - Added conflict detection and resolution capabilities
   - Added recruiter assignment functionality
   - Enhanced the AvailabilityService with methods to support the new fields and features

4. **Document.ts** - Enhanced with:
   - Added compliance status field with enum for tracking document compliance
   - Added verification details with verification levels and methods
   - Added expiry tracking with notifications for expiring documents
   - Added document type enhancements with additional document types
   - Added document tracking features for views, downloads, and sharing
   - Added helper methods for document verification, rejection, and sharing
   - Added pre-save middleware for automatic status updates
   - Updated DocumentService with methods to support the enhanced model

5. **Client.ts** - Enhanced with:
   - Added company registration fields
   - Added billing contact information with detailed structure
   - Added purchase order number
   - Added website URL and contact information
   - Added support for multiple locations with detailed information
   - Added service agreements with status tracking
   - Added rate cards for different job types
   - Added client preferences for communication and invoicing
   - Added helper methods for location management and service agreement validation
   - Added virtual properties for active service agreements

### Next Model to Implement
1. **Timesheet.ts** - Enhance existing model with:
   - Add period/week tracking
   - Add clock-in/clock-out tracking
   - Add duration calculations
   - Add audit information

### In Progress Models
None currently.

### Pending Models
All other models listed above.

## MongoDB Schema Template Example
Here's an example of how we'll implement a new model:

```typescript
// src/interfaces/user-group.interface.ts
import { Document } from 'mongoose';

export interface IUserGroup extends Document {
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

// src/schemas/user-group.schema.ts
import { Schema } from 'mongoose';

export const UserGroupSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: String,
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// src/models/UserGroup.ts
import mongoose from 'mongoose';
import { IUserGroup } from '../interfaces/user-group.interface';
import { UserGroupSchema } from '../schemas/user-group.schema';

export const UserGroup = mongoose.model<IUserGroup>('UserGroup', UserGroupSchema);
```

## Models to Enhance

### JobOffer.ts ✅
- [x] Add fields for job linking
- [x] Add fields for candidate linking
- [x] Add fields for offer status tracking
- [x] Add fields for offer expiration
- [x] Add fields for compensation details
- [x] Add fields for benefits details
- [x] Add fields for start date
- [x] Add fields for offer acceptance/rejection
- [x] Add fields for offer terms and conditions

### Payroll.ts ✅
- [x] Add fields for job linking
- [x] Add fields for worker linking
- [x] Add fields for payment status tracking
- [x] Add fields for payment method
- [x] Add fields for payment date
- [x] Add fields for payment amount
- [x] Add fields for tax processing
- [x] Add fields for deductions
- [x] Add fields for payment tracking

### Availability.ts ✅
- [x] Add fields for worker linking
- [x] Add fields for time slot definition
- [x] Add fields for recurrence patterns
- [x] Add fields for availability status
- [x] Add fields for blackout periods
- [x] Add fields for preferred hours
- [x] Add fields for maximum hours
- [x] Add fields for location preferences
- [x] Add fields for reliability score
- [x] Add fields for conflict resolution

### Document.ts ✅
- [x] Add fields for document type
- [x] Add fields for document status
- [x] Add fields for document expiration
- [x] Add fields for document verification
- [x] Add fields for document owner
- [x] Add fields for document issuer
- [x] Add fields for document metadata
- [x] Add fields for compliance tracking
- [x] Add fields for document history

### Client.ts ✅
- [x] Add fields for company registration information
- [x] Add fields for billing contact information
- [x] Add fields for multiple locations
- [x] Add fields for service agreements
- [x] Add fields for rate cards
- [x] Add fields for purchase orders
- [x] Add fields for client preferences
- [x] Add fields for client status
- [x] Add fields for client industry
- [x] Add fields for client size

### Timesheet.ts ✅
- [x] Add fields for period/week tracking
- [x] Add fields for clock-in/clock-out tracking
- [x] Add fields for duration calculations
- [x] Add fields for audit information
- [x] Add fields for expense tracking and approval
- [x] Add fields for timesheet status management
- [x] Add fields for approval workflow
- [x] Add fields for payroll processing status
- [x] Add fields for soft deletion support
- [x] Add support for verification of clock events

### Next: Rating.ts
- [ ] Add fields for job linking
- [ ] Add fields for worker linking
- [ ] Add fields for client linking
- [ ] Add fields for rating categories
- [ ] Add fields for rating scores
- [ ] Add fields for rating comments
- [ ] Add fields for rating date
- [ ] Add fields for rating visibility
- [ ] Add fields for rating response

## Conclusion
By following this implementation plan, we'll ensure that all required functionality from MODS.md is available in the application while maintaining code quality and minimizing duplication. The enhanced models will provide a solid foundation for the application's features and future development. 