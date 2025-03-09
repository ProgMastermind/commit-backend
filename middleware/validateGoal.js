const Joi = require('joi');

const validateGoal = (req, res, next) => {
  const schema = Joi.object({
    gameName: Joi.string().required().messages({
      'string.empty': 'Game name is required',
      'any.required': 'Game name is required'
    }),
    goalName: Joi.string().required().messages({
      'string.empty': 'Goal name is required',
      'any.required': 'Goal name is required'
    }),
    deadline: Joi.date().greater('now').required().messages({
      'date.greater': 'Deadline must be a future date',
      'any.required': 'Deadline is required'
    }),
    isGroupGoal: Joi.boolean().default(false),
    groupId: Joi.string().when('isGroupGoal', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional()
    })
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ 
      success: false, 
      message: error.details[0].message 
    });
  }
  next();
};

module.exports = validateGoal;