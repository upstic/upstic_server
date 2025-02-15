import nodemailer from 'nodemailer';
import { config } from '../config/config';
import { logger } from './logger';

interface EmailOptions {
  to: string;
  subject: string;
  template: string;
  data: any;
}

// Add this to package.json dependencies: "nodemailer": "^6.9.7"
const transporter = nodemailer.createTransport({
  // Configure your email service here
  host: config.email.host,
  port: config.email.port,
  secure: config.email.secure,
  auth: {
    user: config.email.user,
    pass: config.email.password
  }
});

const templates: { [key: string]: (data: any) => string } = {
  'job-match': (data) => `
    Hello ${data.user.firstName},
    
    We found a new job matching your profile: ${data.job.title}
    
    Click here to view the job details and apply.
  `,
  // Add more email templates as needed
};

export const sendEmail = async (
  to: string,
  subject: string,
  template: string,
  data: any
): Promise<void> => {
  try {
    await transporter.sendMail({
      from: config.email.from,
      to,
      subject,
      html: await renderTemplate(template, data)
    });
    logger.info('Email sent successfully', { to, template });
  } catch (error) {
    logger.error('Email sending failed:', error);
    throw error;
  }
};

const renderTemplate = async (template: string, data: any): Promise<string> => {
  // Implement template rendering logic here
  return `<h1>Hello ${data.name}</h1>`; // Placeholder
}; 