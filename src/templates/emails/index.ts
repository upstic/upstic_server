export const emailTemplates = {
  'job-match': {
    subject: 'New Job Matches Found',
    html: `
      <h2>Hello {{recipientName}},</h2>
      <p>We've found some new job matches that might interest you:</p>
      {{#each jobs}}
        <div style="margin-bottom: 20px;">
          <h3>{{this.title}}</h3>
          <p>{{this.description}}</p>
          <p>Location: {{this.location}}</p>
          <p>Rate: {{this.hourlyRate}}/hour</p>
          <a href="{{../baseUrl}}/jobs/{{this._id}}">View Job</a>
        </div>
      {{/each}}
    `
  },
  'application-update': {
    subject: 'Application Status Update',
    html: `
      <h2>Hello {{recipientName}},</h2>
      <p>Your application for <strong>{{job.title}}</strong> has been {{status}}.</p>
      {{#if note}}
        <p>Note: {{note}}</p>
      {{/if}}
      <a href="{{baseUrl}}/applications/{{applicationId}}">View Application</a>
    `
  },
  'document-expiry': {
    subject: 'Document Expiry Notice',
    html: `
      <h2>Hello {{recipientName}},</h2>
      <p>Your {{document.type}} is due to expire on {{expiryDate}}.</p>
      <p>Please update this document to maintain compliance.</p>
      <a href="{{baseUrl}}/documents">Manage Documents</a>
    `
  },
  'timesheet-approval': {
    subject: 'Timesheet {{status}}',
    html: `
      <h2>Hello {{recipientName}},</h2>
      <p>Your timesheet for the week of {{weekStarting}} has been {{status}}.</p>
      {{#if note}}
        <p>Note: {{note}}</p>
      {{/if}}
      <a href="{{baseUrl}}/timesheets/{{timesheetId}}">View Timesheet</a>
    `
  }
}; 