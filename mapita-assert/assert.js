const inspect = require('util').inspect;

const test = require("../mapita-test/test");

// Throws an error when the input is falsey.
function assert(value){
    if(!value) throw new Error(assert.util.message({
        expected: "a truthy value",
        butFoundValue: value,
    }));
    return value;
}

module.exports = assert;

// Throws an error when the input is truthy.
assert.not = function(value){
    if(value) throw new Error(assert.util.message({
        expected: "a falsey value",
        butFoundValue: value,
    }));
    return value;
};

// Throws an error when the input is not undefined.
assert.undefined = function(value){
    if(value !== undefined) throw new Error(assert.util.message({
        expected: "an undefined value",
        butFoundValue: value,
    }));
    return value;
};

// Throws an error when the input is not null.
assert.null = function(value){
    if(value !== null) throw new Error(assert.util.message({
        expected: "a null value",
        butFoundValue: value,
    }));
    return value;
};

// Throws an error when the input is not either null or undefined.
assert.nil = function(value){
    if(value !== undefined && value !== null) throw new Error(assert.util.message({
        expected: "either a null or an undefined value",
        butFoundValue: value,
    }));
    return value;
};

// Throws an error when all arguments are not identical to one another;
// identity is determined using the === operator.
assert.is = function(...values){
    for(let i = 1; i < values.length; i++){
        if(values[i] !== values[i - 1]) throw new Error(assert.util.message({
            expected: "values to be identical",
            butFoundValues: values,
        }));
    }
    return values[0];
};

// Throws an error when all arguments are not deeply equal to one another.
assert.equal = function(...values){
    for(let i = 1; i < values.length; i++){
        if(!assert.util.equal(values[i], values[i - 1])) throw new Error(assert.util.message({
            expected: "values to be equal",
            butFoundValues: values,
        }));
    }
    return values[0];
};

// Throws an error when the arguments are identical; identity is determined
// using the === operator.
assert.isNot = function(a, b){
    if(a === b) throw new Error(assert.util.message({
        expected: "values to not be identical",
        butFoundValues: [a, b],
    }));
    return a;
};

// Throws an error when the arguments are deeply equal.
assert.notEqual = function(a, b){
    if(assert.util.equal(a, b)) throw new Error(assert.util.message({
        expected: "values to be unequal",
        butFoundValues: [a, b],
    }));
    return a;
};

// Throws an error when the input was not a list of the given length.
assert.lengthIs = function(length, list){
    if(!list || !assert.util.isNumber(list.length)) throw new Error(assert.util.message({
        expected: `a list of length ${length}`,
        butFoundValue: list,
    }));
    if(list.length !== length) throw new Error(assert.util.message({
        expected: `a list of length ${length}`,
        collection: list,
        butFoundLength: list.length,
    }));
    return list;
};

// Throws an error when the list does not contain any value deeply equal
// to the one provided.
assert.contains = function(list, value){
    if(!assert.util.isIterable(list)) throw new Error(assert.util.message({
        expected: "a list",
        butFoundValue: list,
    }));
    for(listValue of list){
        if(assert.util.equal(value, listValue)){
            return list;
        }
    }
    throw new Error(assert.util.message({
        expected: "the list to contain an equal value",
        collection: list,
        butDidNotFindValue: value,
    }));
};

// Throws an error when the list does not contain any value identical
// to the one provided.
assert.containsExactly = function(list, value){
    if(!assert.util.isIterable(list)) throw new Error(assert.util.message({
        expected: "a list",
        butFoundValue: list,
    }));
    for(listValue of list){
        if(value === listValue){
            return list;
        }
    }
    throw new Error(assert.util.message({
        expected: "the list to contain an identical value",
        collection: list,
        butDidNotFindValue: value,
    }));
};

// Throws an error when the list contains any value deeply equal
// to the one provided.
assert.doesNotContain = function(list, value){
    if(!assert.util.isIterable(list)) throw new Error(assert.util.message({
        expected: "a list",
        butFoundValue: list,
    }));
    for(listValue of list){
        if(assert.util.equal(value, listValue)) throw new Error(assert.util.message({
            expected: "the list to not contain any equal value",
            collection: list,
            butDidNotFindValue: value,
        }));
    }
    return list;
};

// Throws an error when the list contains any value identical
// to the one provided.
assert.doesNotContainExactly = function(list, value){
    if(!assert.util.isIterable(list)) throw new Error(assert.util.message({
        expected: "a list",
        butFoundValue: list,
    }));
    for(listValue of list){
        if(value === listValue) throw new Error(assert.util.message({
            expected: "the list to not contain any identical value",
            collection: list,
            butDidNotFindValue: value,
        }));
    }
    return list;
};

// Throws an error when the list does not contain any value matching a predicate.
// Returns the first matching element, if any.
assert.containsMatch = function(list, predicate){
    if(!assert.util.isIterable(list)) throw new Error(assert.util.message({
        expected: "a list",
        butFoundValue: list,
    }));
    for(listValue of list){
        if(predicate(listValue)){
            return listValue;
        }
    }
    throw new Error(assert.util.message({
        expected: "the list to contain a value matching the predicate function",
        collection: list,
        function: predicate,
    }));
};

// Throws an error when the list does contains any value matching a predicate.
assert.doesNotContainMatch = function(list, predicate){
    if(!assert.util.isIterable(list)) throw new Error(assert.util.message({
        expected: "a list",
        butFoundValue: list,
    }));
    for(listValue of list){
        if(predicate(listValue)){
            throw new Error(assert.util.message({
                expected: "the list to not contain any value matching the predicate function",
                collection: list,
                function: predicate,
                butFoundValue: listValue,
            }));
        }
    }
    return list;
};

// Throws an error when the first value is not an object having attributes
// equal to those given by the second object.
// Attributes belonging to the first object but not to the second object are
// ignored; the existence of these attributes does not produce assertion errors.
assert.hasAttributes = function(object, attributes){
    if(!assert.util.isObject(object)) throw new Error(assert.util.message({
        expected: "an object",
        butFoundValue: object,
    }));
    for(let key in attributes){
        if(!assert.util.equal(object[key], attributes[key])){
            throw new Error(assert.util.message({
                expected: "object attributes to be equal",
                collection: object,
                butFoundValues: [object[key], attributes[key]],
            }));
        }
    }
    return object;
};

// Throws an error when the first value is not an object having attributes
// identical to those given by the second object.
// Attributes belonging to the first object but not to the second object are
// ignored; the existence of these attributes does not produce assertion errors.
assert.hasExactAttributes = function(object, attributes){
    if(!assert.util.isObject(object)) throw new Error(assert.util.message({
        expected: "an object",
        butFoundValue: object,
    }));
    for(let key in attributes){
        if(object[key] !== attributes[key]){
            throw new Error(assert.util.message({
                expected: "object attributes to be identical",
                collection: object,
                butFoundValues: [object[key], attributes[key]],
            }));
        }
    }
    return object;
};

// Throws an error when the first input was not a list containing at least one
// object having the attributes given by the second input. Attribute equality is
// determined via a deep-equals function. An object in the list having attributes
// not in the given attributes object will not prevent a match.
// The function returns the first list element to match the given attributes.
assert.containsObjectWithAttributes = function(list, attributes){
    if(!assert.util.isIterable(list)) throw new Error(assert.util.message({
        expected: "a list",
        butFoundValue: list,
    }));
    for(listValue of list){
        if(!assert.util.isObject(listValue)) throw new Error(assert.util.message({
            expected: "an object",
            collection: list,
            butFoundValue: listValue,
        }));
        let match = true;
        for(let key in attributes){
            if(!assert.util.equal(listValue[key], attributes[key])){
                match = false;
                break;
            }
        }
        if(match){
            return listValue;
        }
    }
    throw new Error(assert.util.message({
        expected: "the list to contain an object with equal attributes",
        collection: list,
        butDidNotFind: attributes,
    }));
};

// Throws an error when the first input was not a list containing at least one
// object having the attributes given by the second input. Attribute identity is
// determined via the === operator. An object in the list having attributes
// not in the given attributes object will not prevent a match.
// The function returns the first list element to match the given attributes.
assert.containsObjectWithExactAttributes = function(list, attributes){
    if(!assert.util.isIterable(list)) throw new Error(assert.util.message({
        expected: "a list",
        butFoundValue: list,
    }));
    for(listValue of list){
        if(!assert.util.isObject(listValue)) throw new Error(assert.util.message({
            expected: "an object",
            collection: list,
            butFoundValue: listValue,
        }));
        let match = true;
        for(let key in attributes){
            if(listValue[key] !== attributes[key]){
                match = false;
                break;
            }
        }
        if(match){
            return listValue;
        }
    }
    throw new Error(assert.util.message({
        expected: "the list to contain an object with identical attributes",
        collection: list,
        butDidNotFind: attributes,
    }));
};

// Throws an error when the callback did NOT throw any error itself.
// The function returns the error that was thrown by the callback, if any.
assert.throws = function(callback){
    let caughtError = undefined;
    try{
        callback();
    }catch(error){
        caughtError = error || new Error();
    }
    if(!caughtError){
        throw new Error(assert.util.message({
            expected: `the function to throw an error`,
            function: callback,
        }));
    }
    return caughtError;
};

// Throws an error when the promise was NOT rejected
assert.rejects = async function(getPromise){
    let caughtError = undefined;
    try{
        await getPromise();
    }catch(error){
        caughtError = error || new Error();
    }
    if(!caughtError){
        throw new Error(assert.util.message({
            expected: `the generated promise to be rejected`,
            function: getPromise,
        }));
    }
    return caughtError;
};

assert.util = {};

// True when the input is NaN.
assert.util.isNaN = function(value){
    return value !== value;
};

// True when the input is a number or NaN.
assert.util.isNumber = function(value){
    return typeof(value) === "number" || value instanceof Number;
};

// True when the input is an array.
assert.util.isArray = function(value){
    return value instanceof Array;
};

// True when the input is a function.
assert.util.isFunction = function(value){
    return value instanceof Function;
};

// True when the input is iterable. (Using the "of" keyword)
assert.util.isIterable = function(value){
    return (
        value !== undefined && value !== null &&
        assert.util.isFunction(value[Symbol.iterator])
    );
};

// True when the input is a primitive; i.e. not an object.
assert.util.isPrimitive = function(value){
    return !assert.util.isObject(value);
};

// True when the input is an object; i.e. not a primitive.
assert.util.isObject = function(value){
    if(
        value === null || value === undefined || value instanceof Boolean ||
        value instanceof Number || value instanceof String
    ){
        return false;
    }
    const type = typeof(value);
    return (
        type !== "boolean" && type !== "number" &&
        type !== "string" && type !== "symbol"
    );
};

// True when two inputs are deeply equal to one another.
assert.util.equal = function(a, b, visited=[]){
    function addVisited(a, b){
        if(assert.util.isObject(a)) visited.push(a);
        if(assert.util.isObject(b)) visited.push(b);
    }
    function wasVisited(a, b){
        let found = 0;
        for(let value of visited){
            if(value === a || value === b){
                if(found) return true;
                found++;
            }
        }
        return false;
    }
    if(a === b){
        return true;
    }else if(assert.util.isArray(a)){
        if(!assert.util.isArray(b)) return false;
        if(a.length !== b.length) return false;
        for(let i = 0; i < a.length; i++){
            if(wasVisited(a[i], b[i])){
                if(a[i] !== b[i]) return false;
            }else{
                addVisited(a[i], b[i]);
                if(!assert.util.equal(a[i], b[i])){
                    return false;
                }
            }
        }
        return true;
    }else if(assert.util.isObject(a)){
        if(!assert.util.isObject(b)) return false;
        const visitedKeys = {};
        for(const key in a){
            visitedKeys[key] = true;
            if(wasVisited(a[key], b[key])){
                if(a[key] !== b[key]) return false;
            }else{
                addVisited(a[key], b[key]);
                if(!assert.util.equal(a[key], b[key])){
                    return false;
                }
            }
        }
        for(const key in b){
            if(visitedKeys[key]){
                continue;
            }
            if(wasVisited(a[key], b[key])){
                if(a[key] !== b[key]) return false;
            }else{
                addVisited(a[key], b[key]);
                if(!assert.util.equal(a[key], b[key])){
                    return false;
                }
            }
        }
        return true;
    }else{
        return false;
    }
};

// Get a nice readable message describing an assertion failure
// These are the attributes that the options object can have.
// expected: A string describing the value or behavior that was expected. This
// attribute is always required.
// collection: An array or other collection that was handled by the assertion,
// function: A callable object that was handled by the assertion.
// if any. This is meant for e.g. assertions that check if an element is in a list.
// butFoundValue: A value that was found unexpectedly.
// butFoundValues: An array of values that were found unexpectedly.
// butFoundLength: A length of some collection that was found unexpectedly.
// butDidNotFindValue: A value that was expected, but not found.
// butDidNotFindValues: An array of values that were expected, but not found.
assert.util.message = function(options){
    const lines = [
        "Assertion error",
        `- Expected: ${options.expected}`,
    ];
    if("butFoundLength" in options){
        lines.push(`- But found length: ${inspect(options.butFoundLength)}`);
    }
    if("collection" in options){
        lines.push(`- Collection: ${inspect(options.collection)}`);
    }
    if("function" in options){
        lines.push(`- Function: ${options.function.toString()}`);
    }
    if("butFoundValue" in options){
        lines.push(`- But found: ${inspect(options.butFoundValue)}`);
    }
    if("butDidNotFindValue" in options){
        lines.push(`- But did not find: ${inspect(options.butDidNotFindValue)}`);
    }
    if("butFoundValues" in options){
        lines.push("- But found values:");
        for(let value of options.butFoundValues){
            lines.push(`-   ${inspect(value)}`);
        }
    }
    if("butDidNotFindValues" in options){
        lines.push("- But did not find values:");
        for(let value of options.butDidNotFindValue){
            lines.push(`-   ${inspect(value)}`);
        }
    }
    return lines.join("\n");
};

test.series("assertUtilEquals", series => {
    series.add("comparePrimitives", async function(api){
        assert(assert.util.equal(0, 0));
        assert(assert.util.equal("test", "test"));
        assert.not(assert.util.equal("test1", "test2"));
    });
    series.add("compareArrays", async function(api){
        const l = [1, 2, 3];
        assert(assert.util.equal(l, l));
        assert(assert.util.equal(l, [1, 2, 3]));
        assert.not(assert.util.equal(l, [1, 2, 3, 4]));
        assert.not(assert.util.equal(l, []));
        assert.not(assert.util.equal(l, {}));
        assert.not(assert.util.equal(l, 1));
        assert.not(assert.util.equal(l, null));
    });
    series.add("compareObjects", async function(api){
        const o = {a: 1, b: 2, c: 3};
        assert(assert.util.equal(o, o));
        assert(assert.util.equal(o, {a: 1, b: 2, c: 3}));
        assert.not(assert.util.equal(o, {a: 1, b: 2, c: 4}));
        assert.not(assert.util.equal(o, {a: 1, b: 2, c: 3, d: 4}));
        assert.not(assert.util.equal(o, {a: 1, b: 2}));
        assert.not(assert.util.equal(o, {}));
        assert.not(assert.util.equal(o, []));
        assert.not(assert.util.equal(o, 1));
        assert.not(assert.util.equal(o, null));
    });
    series.add("compareArraysWithCyclicReferences", async function(api){
        const l1 = [1, 2, null];
        l1[2] = l1;
        const l2 = [1, 2, l1];
        assert(assert.util.equal(l1, l1));
        assert(assert.util.equal(l1, l2));
        assert(assert.util.equal(l1, [1, 2, l2]));
        assert.not(assert.util.equal(l1, [1, 2, 3]));
    });
    series.add("compareObjectsWithCyclicReferences", async function(api){
        const o1 = {a: 1, b: 2};
        o1.c = o1;
        const o2 = {a: 1, b: 2, c: o1};
        assert(assert.util.equal(o1, o1));
        assert(assert.util.equal(o1, o2));
        assert(assert.util.equal(o1, {a: 1, b: 2, c: o2}));
        assert.not(assert.util.equal(o1, {a: 1, b: 2, c: 3}));
    });
});

test.series("assertions", series => {
    series.add("assertThrows", async function(api){
        assert.throws(() => {throw new Error("!!");});
        let caughtError = undefined;
        try{
            assert.throws(() => "doesn't throw an error");
        }catch(error){
            caughtError = error;
        }
        if(!caughtError){
            throw new Error("Assertion failed to produce an error.");
        }
    });
    series.add("assertTruthy", async function(api){
        assert(true);
        assert(1);
        assert("some string");
        assert.throws(() => assert(false));
        assert.throws(() => assert(0));
        assert.throws(() => assert(null));
        assert.throws(() => assert(undefined));
    });
    series.add("assertNot", async function(api){
        assert.not(false);
        assert.not(0);
        assert.not(null);
        assert.not(undefined);
        assert.throws(() => assert.not(true));
        assert.throws(() => assert.not(1));
        assert.throws(() => assert.not("some string"));
    });
    series.add("assertNull", async function(api){
        assert.null(null);
        assert.throws(() => assert.null(false));
        assert.throws(() => assert.null(undefined));
    });
    series.add("assertUndefined", async function(api){
        assert.undefined(undefined);
        assert.throws(() => assert.undefined(false));
        assert.throws(() => assert.undefined(null));
    });
    series.add("assertNil", async function(api){
        assert.nil(null);
        assert.nil(undefined);
        assert.throws(() => assert.nil(false));
        assert.throws(() => assert.nil(1));
    });
    series.add("assertIs", async function(api){
        const object = {a: 1};
        assert.is(0, 0);
        assert.is(object, object);
        assert.throws(() => assert.is(1, 0));
        assert.throws(() => assert.is(object, {a: 1}));
    });
    series.add("assertIsNot", async function(api){
        const object = {a: 1};
        assert.isNot(1, 0);
        assert.isNot(object, {a: 1});
        assert.throws(() => assert.isNot(0, 0));
        assert.throws(() => assert.isNot(object, object));
    });
    series.add("assertEqual", async function(api){
        assert.equal(0, 0);
        assert.equal([1, 2], [1, 2]);
        assert.equal({a: 1}, {a: 1});
        assert.throws(() => assert.equal(1, 0));
        assert.throws(() => assert.equal([1, 2], [3, 4]));
        assert.throws(() => assert.equal({a: 1}, {b: 2}));
    });
    series.add("assertNotEqual", async function(api){
        assert.notEqual(1, 0);
        assert.notEqual([1, 2], [3, 4]);
        assert.notEqual({a: 1}, {b: 2});
        assert.throws(() => assert.notEqual(0, 0));
        assert.throws(() => assert.notEqual([1, 2], [1, 2]));
        assert.throws(() => assert.notEqual({a: 1}, {a: 1}));
    });
    series.add("assertLengthIs", async function(api){
        assert.lengthIs(0, []);
        assert.lengthIs(3, [1, 2, 3]);
        assert.throws(() => assert.lengthIs(0, [1, 2, 3]));
        assert.throws(() => assert.lengthIs(4, [1, 2, 3]));
    });
    series.add("assertContains", async function(api){
        assert.contains([1, 2, 3], 1);
        assert.contains([{a: 1}, {b: 2}], {a: 1});
        assert.throws(() => assert.contains([1, 2, 3], 4));
        assert.throws(() => assert.contains([{a: 1}, {b: 2}], {c: 3}));
    });
    series.add("assertContainsExactly", async function(api){
        const object = {a: 1};
        assert.containsExactly([1, 2, 3], 1);
        assert.containsExactly([object, {b: 2}], object);
        assert.throws(() => assert.containsExactly([1, 2, 3], 4));
        assert.throws(() => assert.containsExactly([object, {b: 2}], {a: 1}));
        assert.throws(() => assert.containsExactly([object, {b: 2}], {c: 3}));
    });
    series.add("assertDoesNotContain", async function(api){
        assert.doesNotContain([1, 2, 3], 4);
        assert.doesNotContain([{a: 1}, {b: 2}], {c: 3});
        assert.throws(() => assert.doesNotContain([1, 2, 3], 1));
        assert.throws(() => assert.doesNotContain([{a: 1}, {b: 2}], {a: 1}));
    });
    series.add("assertDoesNotContainExactly", async function(api){
        const object = {a: 1};
        assert.doesNotContainExactly([1, 2, 3], 4);
        assert.doesNotContainExactly([object, {b: 2}], {a: 1});
        assert.doesNotContainExactly([object, {b: 2}], {c: 3})
        assert.throws(() => assert.doesNotContainExactly([1, 2, 3], 1));
        assert.throws(() => assert.doesNotContainExactly([object, {b: 2}], object));
    });
    series.add("assertContainsMatch", async function(api){
        assert.containsMatch([1, 2, 3], i => i === 1);
        assert.containsMatch(["a", "b", "c"], i => i === "b");
        assert.throws(() => assert.containsMatch([1, 2, 3], i => i === 4));
    });
    series.add("assertDoesNotContainMatch", async function(api){
        assert.doesNotContainMatch([1, 2, 3], i => i === 4);
        assert.doesNotContainMatch(["a", "b", "c"], i => i === "d");
        assert.throws(() => assert.doesNotContainMatch([1, 2, 3], i => i === 1));
    });
    series.add("assertHasAttributes", async function(api){
        const object = {a: 1, b: 2, c: {a: 1}};
        assert.hasAttributes(object, {a: 1});
        assert.hasAttributes(object, {a: 1, b: 2});
        assert.hasAttributes(object, {a: 1, b: 2, c: {a: 1}});
        assert.throws(() => assert.hasAttributes(object, {a: 1, d: 4}));
    });
    series.add("assertHasExactAttributes", async function(api){
        const nestedObject = {a: 1};
        const object = {a: 1, b: 2, c: nestedObject};
        assert.hasExactAttributes(object, {a: 1});
        assert.hasExactAttributes(object, {a: 1, b: 2});
        assert.hasExactAttributes(object, {a: 1, b: 2, c: nestedObject});
        assert.throws(() => assert.hasExactAttributes(object, {a: 1, d: 4}));
        assert.throws(() => assert.hasExactAttributes(object, {a: 1, c: {a: 1}}));
    });
    series.add("assertContainsObjectWithAttributes", async function(api){
        assert.containsObjectWithAttributes([{a: 1, b: 2}], {a: 1, b: 2});
        assert.containsObjectWithAttributes([{a: 1, b: {a: 1}}], {b: {a: 1}});
        assert.throws(() => {
            assert.containsObjectWithAttributes([{a: 1, b: 2}], {c: 3});
        });
    });
    series.add("assertContainsObjectWithExactAttributes", async function(api){
        const object = {a: 1};
        assert.containsObjectWithExactAttributes([{a: 1, b: 2}], {a: 1, b: 2});
        assert.containsObjectWithExactAttributes([{a: 1, b: object}], {b: object});
        assert.throws(() => {
            assert.containsObjectWithExactAttributes([{a: 1, b: 2}], {c: 3});
        });
        assert.throws(() => {
            containsObjectWithExactAttributes([{a: 1, b: object}], {b: {a: 1}});
        });
    });
    series.add("assertRejects", async function(api){
        await assert.rejects(
            () => new Promise((resolve, reject) => reject())
        );
        let caughtError = undefined;
        try{
            await assert.rejects(
                () => new Promise((resolve, reject) => resolve())
            );
        }catch(error){
            caughtError = error;
        }
        assert(caughtError);
    });
});
