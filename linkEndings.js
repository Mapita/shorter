const axios = require("axios");
const bcrypt = require("bcrypt");
const crypto = require('crypto');
const moment = require("moment");

const encoder = require("./encoder");
const anonymizeIp = require("./anonymizeIp");

async function fetchLinkEnding(app, hashLength){
    return (await fetchLinkEndings(app, hashLength, 1))[0];
}
async function fetchLinkEndings(app, hashLength, count){
    // Get link endings from the queue
    const endings = await app.db.LinkEnding.select("ending").limit(count).map(i => i.ending);
    // Remove those now-used endings from the queue
    if(endings.length){
        await app.db.LinkEnding.delete().whereIn("ending", endings);
    }
    // If there weren't enough endings in the queue, then generate more
    while(endings.length < count){
        const remainingLength = count - endings.length;
        const generatedEndings = await generateLinkEndings(
            app, hashLength, Math.max(100, count)
        );
        if(generatedEndings.length < remainingLength){
            endings.push(...generatedEndings);
        }else{
            endings.push(...generatedEndings.slice(0, remainingLength));
            // Insert left over link endings into the database (But don't wait up)
            insertLinkEndings(
                app, generatedEndings.slice(remainingLength)
            ).then(() => {}).catch(console.error);
            break;
        }
    }
    return endings;
}

async function insertLinkEndings(app, endings){
    const timestamp = moment();
    const insertions = endings.map(ending => ({
        "ending": ending,
        "creationTime": timestamp,
    }));
    return await app.knex.batchInsert(
        "shorter.LinkEndings", insertions
    );
}

async function insertLink(app, link){
    return await insertLinks(app, [link]);
}

async function insertLinks(app, links){
    // Build an array of link rows to insert
    const timestamp = moment();
    const insertLinks = links.map(link => ({
        "url": link.url,
        "ending": link.ending,
        "creationTime": (link.creationTime || timestamp).toDate(),
        "lastModifiedTime": (link.lastModifiedTime || timestamp).toDate(),
    }));
    // Insert links and get their serial unique IDs back
    const linkIds = await app.knex.batchInsert(
        "shorter.Links", insertLinks
    ).returning("linkId");
    // Insert LinkTag rows
    await insertLinkTags(app, Array.from((function*(){
        for(let i = 0; i < links.length; i++){
            const link = links[i];
            if(link.tags){
                const linkId = linkIds[i];
                for(let tagName of link.tags){
                    yield {
                        "linkId": linkId,
                        "tagName": tagName,
                    };
                }
            }
        }
    })()));
}

function insertLinkTags(app, tags){
    return app.knex.batchInsert(
        "shorter.LinkTags", tags
    );
}

async function generateLinkEndings(app, hashLength, count){
    const usableEndingsList = [];
    const usableEndingsObject = {};
    let totalAttempts = 0;
    while(usableEndingsList.length < count && totalAttempts < count){
        totalAttempts++;
        // Generate N possible link endings
        const possibleEndings = generatePossibleLinkEndings(hashLength,
            Math.min(500, count * 1.5)
        );
        // Check for endings that were previously generated
        const existingList = [];
        existingList.push(...await app.db.Link.select("ending").whereIn(
            "ending", possibleEndings
        ));
        existingList.push(...await app.db.LinkEnding.select("ending").whereIn(
            "ending", possibleEndings
        ));
        const existingObject = {};
        for(let existingEnding of existingList){
            existingObject[existingEnding] = existingEnding;
        }
        // Add new unique endings to the list to be returned
        for(let ending of possibleEndings){
            if(!existingObject[ending] && !usableEndingsObject[ending]){
                usableEndingsObject[ending] = ending;
                usableEndingsList.push(ending);
            }
        }
    }
    // All done!
    return usableEndingsList;
}

function generatePossibleLinkEndings(hashLength, count){
    let endingsObject = {};
    let endingsList = [];
    let totalAttempts = 0;
    while(endingsList.length < count && totalAttempts < count * 64){
        totalAttempts++;
        const ending = generatePossibleLinkEnding(hashLength);
        if(!endingsObject[ending]){
            endingsObject[ending] = ending;
            endingsList.push(ending);
        }
    }
    return endingsList;
}

function generatePossibleLinkEnding(hashLength){
    // Helper to get a random digit "0" - "9"
    function randomDigit(){
        return String(Math.floor(Math.random() * 10));
    }
    function randomCharacter(){
        return encoder.encodingDigits[
            Math.floor(Math.random() + encoder.encodingBase)
        ];
    }
    // Helper to determine if a character is a letter
    function characterIsLetter(character){
        return "ABCDEFGHIJKLMNOPQRSTUVWXYZ".indexOf(character) >= 0;
    }
    // Randomly generate an initial candidate ending
    const maxHash = encoder.encodingBase ** hashLength;
    const value = Math.floor(Math.random() * maxHash);
    let encodedValue = encoder.encode(value);
    while(encodedValue.length < hashLength){
        encodedValue = "A" + encodedValue;
    }
    // Make sure the ending follows all the rules
    let ending = "";
    let alphaRun = 0;
    let totalAlpha = 0;
    let anyRun = 0;
    let anyRunCharacter = undefined;
    // Forbid runs of 3+ letters or 2+ of any one character
    for(let character of encodedValue){
        let characterToPush = character;
        if(characterToPush === anyRunCharacter){
            anyRun++;
            if(anyRun > 2){
                const newCharacter = randomCharacter();
                if(newCharacter === characterToPush){
                    characterToPush = characterToPush === "A" ? "B" : "A";
                }else{
                    characterToPush = newCharacter;
                }
                anyRun = 0;
            }
        }else{
            anyRunCharacter = characterToPush;
            anyRun = 0;
        }
        if(characterIsLetter(characterToPush)){
            totalAlpha++;
            alphaRun++;
            if(alphaRun > 3){
                characterToPush = randomDigit();
                alphaRun  = 0;
            }
        }else{
            alphaRun = 0;
        }
        ending += characterToPush;
    }
    // Ensure there is at least one letter
    if(totalAlpha === 0){
        const endingIndex = Math.floor(Math.random(ending.length));
        const letterIndex = Math.floor(Math.random(4));
        ending = (
            ending.slice(0, endingIndex) +
            ["A", "B", "C", "D"][letterIndex] +
            ending.slice(endingIndex + 1)
        );  
    }
    // Prevent questionable substrings, e.g. "ASS"
    for(let forbidden of app.config.forbiddenEndingSubstrings){
        const index = ending.indexOf(forbidden);
        if(index >= 0){
            ending = (
                ending.slice(0, index) +
                randomDigit() +
                ending.slice(index + 1)
            );  
        }
    }
    console.log(ending);
    // All done!
    return ending;
}

async function requestManualLinkEnding(app, ending){
    const existing = await app.db.Link.select("ending").first().where({
        "ending": ending,
    });
    if(existing){
        const error = new Error("Ending already exists");
        error.existingEnding = ending;
        throw error;
    }
    await app.db.LinkEnding.delete().where({
        "ending": ending,
    });
}

async function requestManualLinkEndings(app, endings){
    // Check list for duplicates
    let endingsDictionary = {};
    for(let ending of endings){
        if(endingsDictionary[ending]){
            const error = new Error("Duplicate endings.");
            error.existingEnding = ending;
            throw error;
        }
        endingsDictionary[ending] = true;
    }
    // Check database for existing links with this ending
    const existing = await app.db.Link.select("ending").first().whereIn(
        "ending", endings
    );
    if(existing){
        const error = new Error("Ending already exists");
        error.existingEnding = existing;
        throw error;
    }
    // Remove any instances of these endings from the queue
    await app.db.LinkEnding.delete().whereIn(
        "ending", endings
    );
}

async function visitLink(app, request, link){
    // Completely ignore visits made by certain IP addresses, as specified by
    // the server config.
    if(app.config.ignoreVisitorIpAddresses.indexOf(request.ip) >= 0){
        return;
    }
    // Get the time of the visit
    const timestamp = moment();
    // Base object to be inserted into the database
    const click = {
        "linkId": link.linkId,
        "ending": link.ending,
        "url": link.url,
        "clickTime": timestamp,
        "countryCode": null,
        "countryName": null,
        "regionCode": null,
        "regionName": null,
        "postalCode": null,
        "latitude": null,
        "longitude": null,
        "referrerUrl": request.headers.referer || request.headers.referrer,
        "identifyingHash": null,
    };
    // Get whether the user has asked not to be tracked, or if this visitor's
    // IP address is in the list of IPs that the config says should be ignored.
    const doNotTrack = request.headers.dnt === "1";
    // If the user allows tracking, record an identifying hash so that the service
    // may report unique/repeat visitors; also record the rough geographic area
    // where the visitor is probably located.
    if(!doNotTrack){
        // Get the visitor's anonymized IP address. IP addresses are anonymized
        // using the same standardized method as Google Analytics.
        // See https://support.google.com/analytics/answer/2763052?hl=en
        const anonymizedIp = anonymizeIp(request.ip);
        // Build an identifying string to be hashed. This hash will allow
        // accurate-enough reporting of unique/repeat visitors, without compromising
        // data privacy. Information to be hashed includes the visitor's
        // anonymized IP address and their user-agent json string. To make
        // tracking the same visitor across different visited links impractical,
        // the unique link ID is additionally included in the string to hash.
        const identifyingData = (
            `${anonymizedIp}.${request.useragent.source}.${link.linkId}`
        );
        // Generate an SHA-256 hash and truncate to 32 hexadecimal digits.
        click.identifyingHash = (
            crypto.createHmac("sha256", identifyingData).digest("hex").slice(0, 32)
        );
        // Get the visitor's likely approximate location using their anonymized IP address
        // Note that only the country name/code is reliably accurate after anonymizing
        // the IP address, though the rest will be recorded anyway.
        // See https://www.conversionworks.co.uk/blog/2017/05/19/anonymize-ip-geo-impact-test/
        // for more detailed information.
        const location = (await axios({
            method: "get",
            url: `http://www.freegeoip.net/json/${anonymizedIp}`,
        })).data;
        // When latitude and longitude are both 0, the location was unknown.
        click.latitude = location.latitude;
        click.longitude = location.longitude;
        if(!click.latitude && !click.longitude){
            click.latitude = null;
            click.longitude = null;
        }
        // Also record the other information given by the geo IP service;
        // note that blank strings in the API response indicate unknown or
        // missing data; these should instead be inserted into the db as null.
        if(location.country_code.length){
            click.countryCode = location.country_code;
        }
        if(location.country_name.length){
            click.countryName = location.country_name;
        }
        if(location.region_code.length){
            click.regionCode = location.region_code;
        }
        if(location.region_name.length){
            click.regionName = location.region_name;
        }
        if(location.zip_code.length){
            click.zipCode = location.zip_code;
        }
    }
    // Actually insert the database row (But don't wait for the promise to resove)
    app.db.Click.insert(click).then(() => {}).catch(console.error);
};

module.exports = {
    fetchLinkEnding: fetchLinkEnding,
    fetchLinkEndings: fetchLinkEndings,
    insertLinkEndings: insertLinkEndings,
    insertLink: insertLink,
    insertLinks: insertLinks,
    insertLinkTags: insertLinkTags,
    generateLinkEndings: generateLinkEndings,
    generatePossibleLinkEndings: generatePossibleLinkEndings,
    generatePossibleLinkEnding: generatePossibleLinkEnding,
    requestManualLinkEnding: requestManualLinkEnding,
    requestManualLinkEndings: requestManualLinkEndings,
    visitLink: visitLink,
};
