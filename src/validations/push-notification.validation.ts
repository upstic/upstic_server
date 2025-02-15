import Joi from 'joi';

export const pushNotificationValidation = {
  registerToken: Joi.object({
    token: Joi.string().required().pattern(/^ExponentPushToken\[.*\]$/)
  })
}; 