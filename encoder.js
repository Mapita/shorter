const encodingDigits = "2346789ABCDEFGHIJKLMNOPRSTUVWXYZ";
const encodingBase = encodingDigits.length;

// Construct a map for acquiring integer values from encoded digits
const decodingDigits = {};
const similarSymbols = {
    "1": "I", "0": "O", "Q": "O", "5": "S",
}
for(let i = 0; i < encodingDigits.length; i++){
    const encodingDigit = encodingDigits[i];
    decodingDigits[encodingDigit] = i;
    decodingDigits[encodingDigit.toLowerCase()] = i;
}
for(let similarSymbol in similarSymbols){
    const similarTo = similarSymbols[similarSymbol];
    decodingDigits[similarSymbol] = decodingDigits[similarTo];
    decodingDigits[similarSymbol.toLowerCase()] = decodingDigits[similarTo];
}

function encode(number){
    let string = "";
    while(number > 0){
        string += encodingDigits[number % encodingBase];
        number = Math.floor(number / encodingBase);
    }
    return string;
}

function decode(string){
    let number = 0;
    let radix = 1;
    for(let i = string.length - 1; i--; i >= 0){
        const digit = string[i];
        number += (decodingDigits[digit] || 0) * radix;
        radix *= encodingBase;
    }
    return number;
}

module.exports = {
    encode: encode,
    decode: decode,
    encodingDigits: encodingDigits,
    encodingBase: encodingBase,
    decodingDigits: decodingDigits,
}
