const type = require("../mapita-type/type");

// This function is called using the `validate` exported object as its input.
// Its purpose is to add a number of common-sense default validators.
module.exports = function(validate){
    // Additional options: None.
    validate.addValidator("any", function(value, options, strict){
        return value;
    });
    
    // Additional options: None.
    validate.addValidator("boolean", function(value, options, strict){
        if(strict && value !== true && value !== false){
            throw validate.error("Value must be a boolean.");
        }
        return !!value;
    });
    
    // Additional options:
    // minimum: The minimum acceptable length of the string.
    // maximum: The maximum acceptable length of the string.
    // length: An exact length the string is expected to be.
    validate.addValidator("string", function(value, options, strict){
        if(strict && !type.isString(value)){
            throw validate.error("Value must be a string.");
        }else{
            return validate.length("String", "characters", options, String(value));
        }
    });
    
    // Additional options:
    // each: Validation options to apply to each element.
    // minimum: The minimum acceptable number of items in the list.
    // maximum: The maximum acceptable number of items in the list.
    // length: An exact length the list is expected to be.
    validate.addValidator("list", function(value, options, strict, location){
        const list = validate.list(value, options, strict, location);
        return validate.length("List", "elements", options, list);
    });
    
    // Additional options:
    // each: Validation options to apply to each element.
    // minimum: The minimum acceptable number of items in the array.
    // maximum: The maximum acceptable number of items in the array.
    // length: An exact length the array is expected to be.
    validate.addValidator("array", function(value, options, strict, location){
        if(struct && !type.isArray(value)){
            throw validate.error("Value must be an array.");
        }
        return validate.list(value, options, strict, location);
    });
    
    // Additional options:
    // attributes: Validation options to apply to each attribute.
    // Note that attributes present in the input object but not in this
    // validation object will be ignored and excluded from the output.
    validate.addValidator("object", function(value, options, strict, location){
        return validate.object(value, options, strict, location);
    });
    
    // Additional options: None.
    validate.addValidator("function", function(value, options, strict){
        if(!type.isFunction(value)){
            throw validate.error("Value must be a function.");
        }
        return value;
    });
    
    // Additional options:
    // minimum: The minimum value of the number.
    // maximum: The maximum value of the number.
    // allowInfinity: Positive and negative infinity are valid inputs.
    // allowNaN: NaN is a valid input.
    validate.addValidator("number", function(value, options, strict){
        const number = strict ? value : +value;
        if(!type.isNumber(number)){
            throw validate.error("Value must be a number.");
        }
        if(number !== number && !options.allowNaN){
            throw validate.error("Value must be a number, not NaN.");
        }
        if((number === Infinity || number === -Infinity) && !options.allowInfinity){
            throw validate.error("Value must be a finite number.");
        }
        return validate.bounds(+value, options);
    });
    
    // Additional options:
    // minimum: The minimum value of the integer.
    // maximum: The maximum value of the integer.
    validate.addValidator("integer", function(value, options, strict){
        const number = strict ? value : +value;
        if(!type.isRealNumber(number)){
            throw validate.error("Value must be an integer.");
        }
        const integer = Math.floor(number);
        if(strict && number !== integer){
            throw validate.error("Value must be an integer.");
        }
        return validate.bounds(integer, options);
    });
    
    // Additional options:
    // minimum: The minimum value of the index.
    // maximum: The maximum value of the index.
    validate.addValidator("index", function(value, options, strict){
        const number = strict ? value : +value;
        if(!type.isRealNumber(number)){
            throw validate.error("Value must be a numeric index.");
        }
        const integer = Math.floor(number);
        if(integer < 0){
            throw validate.error("Value must be a non-negative index.");
        }else if(strict && number !== integer){
            throw validate.error("Value must be an integer index.");
        }
        return validate.bounds(number, options);
    });
};
