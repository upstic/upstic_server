import Joi from 'joi';
import { JobType, JobStatus } from '../models/Job';

export const jobValidation = {
  createJob: Joi.object({
    title: Joi.string().required(),
    description: Joi.string().required(),
    requirements: Joi.array().items(Joi.string()),
    skills: Joi.array().items(Joi.string()).required(),
    location: Joi.object({
      coordinates: Joi.array().items(Joi.number()).length(2).required(),
      address: Joi.string().required()
    }).required(),
    salary: Joi.object({
      min: Joi.number().required(),
      max: Joi.number().required(),
      currency: Joi.string().default('USD'),
      rateType: Joi.string().valid('hourly', 'daily', 'monthly').required()
    }).required(),
    startDate: Joi.date().required(),
    endDate: Joi.date().greater(Joi.ref('startDate')),
    shifts: Joi.array().items(
      Joi.object({
        startTime: Joi.string().required(),
        endTime: Joi.string().required(),
        days: Joi.array().items(
          Joi.string().valid('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')
        ).required()
      })
    ).required(),
    jobType: Joi.string().valid(...Object.values(JobType)).required()
  }),

  searchJobs: Joi.object({
    query: Joi.string(),
    lat: Joi.number().min(-90).max(90),
    lng: Joi.number().min(-180).max(180),
    distance: Joi.number().positive(),
    skills: Joi.string(),
    minSalary: Joi.number().positive(),
    maxSalary: Joi.number().positive().greater(Joi.ref('minSalary')),
    jobType: Joi.string().valid(...Object.values(JobType)),
    page: Joi.number().positive(),
    limit: Joi.number().positive().max(100)
  })
};

export const jobSchema = {
  create: Joi.object({
    title: Joi.string().required(),
    description: Joi.string().required(),
    skills: Joi.array().items(Joi.string()),
    budget: Joi.number().min(0),
    deadline: Joi.date().greater('now')
  }),
  update: Joi.object({
    title: Joi.string(),
    description: Joi.string(),
    skills: Joi.array().items(Joi.string()),
    budget: Joi.number().min(0),
    deadline: Joi.date().greater('now')
  }),
  updateApplication: Joi.object({
    status: Joi.string().valid('accepted', 'rejected', 'pending')
  })
}; 