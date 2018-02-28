// True when the input is null.
module.exports.isNull = function(value){
    return value === null;
};

// True when the input is undefined.
module.exports.isUndefined = function(value){
    return value === undefined;
};

// True when the input is null or undefined.
module.exports.isNil = function(value){
    return value === null || value === undefined;
};

// True when the input is a primitive, i.e. not an object.
module.exports.isPrimitive = function(value){
    if(
        value === null || value === undefined || value instanceof Boolean ||
        value instanceof Number || value instanceof String
    ){
        return true;
    }
    const type = typeof(value);
    return type === "boolean" || type === "number" || type === "string" || type === "symbol";
};

// True when the input is any object, i.e. not a primitive.
module.exports.isObject = function(value){
    if(
        value === null || value === undefined || value instanceof Boolean ||
        value instanceof Number || value instanceof String
    ){
        return false;
    }
    const type = typeof(value);
    return type !== "boolean" && type !== "number" && type !== "string" && type !== "symbol";
};

// True when the input is a plain object.
// A plain object is one with the Object prototype, or no prototype at all.
module.exports.isPlainObject = function(value){
    if(!value) return false;
    const prototype = Object.getPrototypeOf(value);
    return !prototype || prototype.constructor === Object;
};

// True when the input is a function.
module.exports.isFunction = function(value){
    return value instanceof Function;
};

// True when the input is iterable.
// Iterable objects are those supporting `for(element of iterable)` syntax.
module.exports.isIterable = function(value){
    return (
        value !== undefined && value !== null &&
        value[Symbol.iterator] instanceof Function
    );
};

// True when the input is an array.
module.exports.isArray = function(value){
    return value instanceof Array;
};

// True when the input is a string.
module.exports.isString = function(value){
    return typeof(value) === "string" || value instanceof String;
};

// True when the input is a boolean.
module.exports.isBoolean = function(value){
    return typeof(value) === "boolean" || value instanceof Boolean;
};

// True when the input is a symbol.
module.exports.isSymbol = function(value){
    return typeof(value) === "symbol";
};

// True when the input is a number, including +Infinity, -Infinity, and NaN.
module.exports.isNumber = function(value){
    return typeof(value) === "number" || value instanceof Number;
};

// True when the input is a number, excluding +Infinity, -Infinity, and NaN.
module.exports.isRealNumber = function(value){
    return typeof(value) === "number" || value instanceof Number && (
        value === value && value !== Infinity && value !== -Infinity
    );
};

// True when the input is an integer.
module.exports.isInteger = function(value){
    return Number.isInteger(value);
};

// True when the input is NaN.
// See https://tc39.github.io/ecma262/#sec-isnan-number
module.exports.isNaN = function(value){
    return value !== value;
};

// True when the input is positive or negative Infinity.
module.exports.isInfinity = function(value){
    return value === +Infinity || value === -Infinity;
};

// True when the input is positive Infinity.
module.exports.isPositiveInfinity = function(value){
    return value === +Infinity;
};

// True when the input is negative Infinity.
module.exports.isNegativeInfinity = function(value){
    return value === -Infinity;
};

// True when the input is positive zero.
// See https://www.ecma-international.org/ecma-262/5.1/#sec-8.5
module.exports.isPositiveZero = function(value){
    return value === 0 && (1 / value > 0);
};

// True when the input is negative zero.
// See https://www.ecma-international.org/ecma-262/5.1/#sec-8.5
module.exports.isNegativeZero = function(value){
    return value === 0 && (1 / value < 0);
};

// True when the input is any positive number, including positive Infinity.
module.exports.isPositive = function(value){
    return value > 0 || (value === 0 && (1 / value > 0));
};

// True when the input is any negative number, including negative Infinity.
module.exports.isNegative = function(value){
    return value < 0 || (value === 0 && (1 / value < 0));
};
