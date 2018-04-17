const type = require("../mapita-type/type");

// Get an error to be thrown when validation fails.
function ValidationError(message){
    const error = new Error(message);
    error.validationError = true;
    return error;
}

// Validate any value.
function validateValue(value, options, strict, location){
    // Handle validators implemented/referenced directly in a spec object.
    if(options.validate){
        try{
            return options.validate(value, options, strict, location);
        }catch(error){
            if(error.validationError){
                throw ValidationError(`Failed to validate attribute ${location}` + (
                    error.message ? ": " + error.message : "."
                ));
            }else{
                throw error;
            }
        }
    }
    // Types that end with "?" can also legally be null or undefined.
    let typeName = options.type;
    if(typeName.endsWith("?")){
        if(value === null || value === undefined){
            return value;
        }
        typeName = options.type.slice(0, -1);
    }
    // Finally, evaluate the actual validator function.
    if(typeName in validators){
        try{
            return validators[typeName](value, options, strict, location);
        }catch(error){
            if(error.validationError){
                throw ValidationError(
                    `Expected a value of type "${options.type}" ` +
                    `for attribute "${location}"` + (
                        error.message ? ": " + error.message : "."
                    )
                );
            }else{
                throw error;
            }
        }
    }
    // Oops, no valid validator was given!
    throw new Error(
        `Unrecognized validator type "${options.type}".`
    );
}

// Validate an iterable (such as an array).
function validateList(value, options, strict, location){
    // Not actually iterable? Abort immediately.
    if(!type.isIterable(value)){
        throw ValidationError("Value must be iterable.");
    }
    // Apply an "each" validator to every element in the array.
    const validatedArray = [];
    const eachValidator = options.each || (value => value);
    let maxLength = "maximum" in options ? options.maximum : 1000;
    let i = 0;
    for(let element of value){
        if(i >= maxLength){
            throw ValidationError(
                `List must contain at maximum ` +
                `${maxLength} elements.`
            );
        }
        validatedArray.push(validateValue(
            element, eachValidator, strict, `${location}[${i}]`
        ));
        i++;
    }
    // Validate length options.
    return validateLength(
        "List", "elements", options, validatedArray
    );
}

// Validate an object.
function validateObject(value, options, strict, location){
    // Not actually an object? Abort immediately.
    if(!type.isObject(value)){
        throw ValidationError("Value must be an object.");
    }
    // No attribute validators? Skip the following attribute validation logic.
    const attributes = options.attributes;
    if(!attributes){
        return value;
    }
    // Handle missing attributes
    for(key in attributes){
        // Handle missing, non-optional keys
        if(attributes[key].required){
            if(!(key in value)){
                throw ValidationError(`Object is missing required attribute "${key}".`);
            }
        // Populate default values for missing optional keys
        }else if(("default" in attributes[key]) && !(key in value)){
            value[key] = attributes[key].default;
        }
    }
    // Construct a new object with validated attributes
    let validatedObject = {};
    for(key in value){
        if(key in attributes){
            validatedObject[key] = validateValue(
                value[key], attributes[key], strict,
                location ? location + "." + key : key
            );
        }else if(strict){
            // In strict mode, unexpected object attributes produce an error.
            throw ValidationError(`Object has an unexpected attribute "${key}".`);
        }
    }
    // All done!
    return validatedObject;
}

// Validate an object given its expected attributes.
function validateAttributes(object, attributes, strict){
    const options = {
        "type": "object",
        "attributes": attributes
    };
    return validateObject(object, options, strict);
}

// Remove values marked "sensitive" in validation options.
function removeSensitive(value, options){
    if(options.sensitive){
        return undefined;
    }else if(type.isIterable(value) && !type.isString(value)){
        if(options.each){
            const array = [];
            for(let element of value){
                array.push(removeSensitive(element, options.each));
            }
            return array;
        }else{
            return value;
        }
    }else if(type.isObject(value)){
        if(options.attributes){
            const object = {};
            for(let key in options.attributes){
                object[key] = removeSensitive(value[key], options.attributes[key]);
            }
            return object;
        }else{
            return value;
        }
    }else{
        return value;
    }
}

// Remove values marked "sensitive" given an object and its expected attributes.
function removeSensitiveAttributes(object, attributes){
    const options = {
        "type": "object",
        "attributes": attributes
    };
    return removeSensitive(object, options);
}

// This object stores validator functions.
// Validator functions should coerce the value to the correct type when sensible
// and should throw any error otherwise.
// The call site shall catch this error and throw a more informative one.
// A validator may throw a string with details to have that included in the more
// informative error, too.
const validators = {};

// Can be used by applications to add their own data validators.
function addValidator(name, implementation){
    validators[name] = implementation;
    return implementation;
}

// Shortcut for adding a data validator that is a copy of another,
// only referenced by a different name.
function addValidatorAlias(name, target){
    return addValidator(name, function(value, options, strict, location){
        const validator = validators[target];
        if(!validator){
            throw new Error(`Unrecognized validator type "${target}"`);
        }
        return validator(value, options, strict, location);
    });
}

// Helper for validating that a value is within bounds.
function validateBounds(value, options){
    if("minimum" in options && value < options.minimum){
        throw ValidationError(`Value must be at minimum ${options.minimum}.`);
    }else if("maximum" in options && value > options.maximum){
        throw ValidationError(`Value must be at maximum ${options.maximum}.`);
    }else{
        return value;
    }
}

// Helper for validating that a list's length is within bounds.
function validateLength(type, element, options, value){
    if("minimum" in options && value.length < options.minimum){
        throw ValidationError(
            `${type} must contain at minimum ${options.minimum} ${element}.`
        );
    }else if("maximum" in options && value.length > options.maximum){
        throw ValidationError(
            `${type} must contain at maximum ${options.maximum} ${element}.`
        );
    }else if("length" in options && value.length !== options.length){
        throw ValidationError(
            `${type} must contain exactly ${options.length} ${element}.`
        );
    }else{
        return value;
    }
}

module.exports = {
    // Normal usage API
    attributes: validateAttributes,
    object: validateObject,
    list: validateList,
    value: validateValue,
    removeSensitive: removeSensitive,
    removeSensitiveAttributes: removeSensitiveAttributes,
    // Extension API
    bounds: validateBounds,
    length: validateLength,
    error: ValidationError,
    validators: validators,
    addValidator: addValidator,
    addValidatorAlias: addValidatorAlias,
};

require("./addDefaultValidators")(module.exports);
