import Joi from 'joi';
import { DayOfWeek, ShiftType } from '../models/Availability';

export const availabilityValidation = {
  updateRegularSchedule: Joi.object({
    schedule: Joi.array().items(
      Joi.object({
        dayOfWeek: Joi.string()
          .valid(...Object.values(DayOfWeek))
          .required(),
        shifts: Joi.array().items(
          Joi.object({
            type: Joi.string()
              .valid(...Object.values(ShiftType))
              .required(),
            startTime: Joi.string()
              .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
              .required(),
            endTime: Joi.string()
              .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
              .required()
          })
        ).required()
      })
    ).required()
  }),

  addException: Joi.object({
    date: Joi.date().greater('now').required(),
    available: Joi.boolean().required(),
    shifts: Joi.when('available', {
      is: true,
      then: Joi.array().items(
        Joi.object({
          type: Joi.string()
            .valid(...Object.values(ShiftType))
            .required(),
          startTime: Joi.string()
            .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
            .required(),
          endTime: Joi.string()
            .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
            .required()
        })
      ),
      otherwise: Joi.forbidden()
    }),
    note: Joi.string().max(500)
  }),

  updatePreferences: Joi.object({
    maxHoursPerWeek: Joi.number().min(0).max(168),
    maxHoursPerDay: Joi.number().min(0).max(24),
    preferredShiftTypes: Joi.array()
      .items(Joi.string().valid(...Object.values(ShiftType)))
      .required(),
    minimumHourlyRate: Joi.number().positive().required(),
    travelDistance: Joi.number().positive(),
    locations: Joi.array().items(Joi.string()).required()
  }),

  getAvailableWorkers: Joi.object({
    date: Joi.date().required(),
    shiftType: Joi.string()
      .valid(...Object.values(ShiftType))
      .required(),
    location: Joi.string().required()
  })
}; 