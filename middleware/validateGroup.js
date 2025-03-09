const Joi = require('joi');

const validateGroup = (req, res, next) => {
    const schema = Joi.object({
        name: Joi.string().required().min(3).max(30).messages({
            'string.empty': 'Group name is required',
            'string.min': 'Group name must be at least 3 characters long',
            'string.max': 'Group name cannot exceed 30 characters'
        }),
        maxMembers: Joi.number().min(2).max(10).default(10).messages({
            'number.base': 'Group size must be a number',
            'number.min': 'Group size must be at least 2 members',
            'number.max': 'Group size cannot exceed 10 members'
        })
    });

    const { error } = schema.validate(req.body, { 
        abortEarly: false,  // Show all errors at once
        stripUnknown: true  // Remove unknown fields
    });

    if (error) {
        return res.status(400).json({
            success: false,
            message: error.details[0].message
        });
    }
    next();
};

module.exports = validateGroup;