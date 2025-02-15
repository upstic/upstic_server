import Joi from 'joi';

export const availabilitySchema = {
  update: Joi.object({
    workerId: Joi.string().required(),
    schedule: Joi.array().items(
      Joi.object({
        day: Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday').required(),
        shifts: Joi.array().items(
          Joi.object({
            startTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
            endTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
            type: Joi.string().valid('day', 'evening', 'night').required()
          })
        ).required()
      })
    ).required(),
    preferences: Joi.object({
      maxHoursPerWeek: Joi.number().min(0).max(168),
      preferredShifts: Joi.array().items(
        Joi.string().valid('day', 'evening', 'night')
      ),
      preferredLocations: Joi.array().items(
        Joi.object({
          city: Joi.string(),
          state: Joi.string(),
          maxDistance: Joi.number().min(0)
        })
      ),
      notice: Joi.object({
        required: Joi.boolean(),
        days: Joi.number().min(0)
      })
    }),
    unavailability: Joi.array().items(
      Joi.object({
        startDate: Joi.date().required(),
        endDate: Joi.date().greater(Joi.ref('startDate')).required(),
        reason: Joi.string().required()
      })
    )
  }),

  getAvailability: Joi.object({
    workerId: Joi.string().required(),
    startDate: Joi.date().required(),
    endDate: Joi.date().greater(Joi.ref('startDate')).required()
  })
}; 