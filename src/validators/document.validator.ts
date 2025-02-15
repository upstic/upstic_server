import Joi from 'joi';

export const documentSchema = {
  upload: Joi.object({
    userId: Joi.string().required(),
    type: Joi.string().valid(
      'id',
      'passport',
      'work_permit',
      'visa',
      'certification',
      'qualification',
      'background_check',
      'medical_certificate',
      'training_record',
      'reference'
    ).required(),
    file: Joi.object({
      originalname: Joi.string().required(),
      mimetype: Joi.string().valid(
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/jpg'
      ).required(),
      size: Joi.number().max(5242880).required(), // 5MB max
    }).required(),
    metadata: Joi.object({
      issueDate: Joi.date(),
      expiryDate: Joi.date().greater('now'),
      issuingAuthority: Joi.string(),
      documentNumber: Joi.string(),
      verificationStatus: Joi.string().valid('pending', 'verified', 'rejected')
    }),
    tags: Joi.array().items(Joi.string())
  }),

  verify: Joi.object({
    documentId: Joi.string().required(),
    verifiedBy: Joi.string().required(),
    status: Joi.string().valid('verified', 'rejected').required(),
    comments: Joi.string().when('status', {
      is: 'rejected',
      then: Joi.required()
    }),
    verificationDetails: Joi.object({
      method: Joi.string().valid('manual', 'automated', 'third_party').required(),
      provider: Joi.string(),
      referenceNumber: Joi.string()
    })
  })
}; 