const inspect = require("util").inspect;
const Promise = require("bluebird");
const moment = require("moment");

const validate = require("./mapita-validate/validate");

const linkEndings = require("./linkEndings");

validate.addValidator("timestamp", function(value, options, strict){
    const timestamp = moment(value);
    if(!timestamp.isValid){
        throw new validate.error(
            `Value must be a timestamp. ` +
            `Use UTC and the datetime format "YYYY-MM-DD HH:MM:SS".`
        );
    }
    return timestamp;
});

validate.addValidator("enumeration", function(value, options, strict){
    if(!options.enumeration){
        throw new Error("No enumeration specified in validation options.");
    }
    for(let item of options.enumeration){
        if(value === item){
            return item;
        }
    }
    const enumerationText = options.enumeration.map(i => inspect(i)).join(', ');
    throw validate.error(`Value must be one of: ${enumerationText}.`);
});

const routes = [
    {
        "path": "/api/v1/shorten",
        "method": "POST",
        "authenticated": true,
        "description": "Shorten a single link.",
        "requestAttributes": {
            "url": {"type": "string", "required": true},
            "ending": {"type": "string?", "required": false},
            "tags": {
                "type": "list?",
                "required": false,
                "each": {"type": "string"},
            },
        },
        "responseAttributes": {
            "url": {"type": "string"},
            "ending": {"type": "string"},
            "shortUrl": {"type": "string"},
            "creationTime": {"type": "timestamp"},
            "lastModifiedTime": {"type": "timestamp"},
            "tags": {
                "type": "list",
                "each": {"type": "string"},
            },
        },
    },
    {
        "path": "/api/v1/shorten/batch",
        "method": "POST",
        "authenticated": true,
        "description": "Shorten a list of links.",
        "requestAttributes": {
            "items": {
                "type": "list",
                "required": true,
                "each": {
                    "type": "object",
                    "attributes": {
                        "url": {"type": "string", "required": true},
                        "ending": {"type": "string?", "required": false},
                        "tags": {
                            "type": "list?",
                            "required": false,
                            "minimumLength": 1,
                            "maximumLength": 1000,
                            "each": {"type": "string"},
                        },
                    },
                },
            },
        },
        "responseAttributes": {
            "items": {
                "type": "list",
                "each": {
                    "type": "object",
                    "attributes": {
                        "url": {"type": "string"},
                        "ending": {"type": "string"},
                        "shortUrl": {"type": "string"},
                        "creationTime": {"type": "timestamp"},
                        "lastModifiedTime": {"type": "timestamp"},
                        "tags": {
                            "type": "list",
                            "each": {"type": "string"},
                        },
                    },
                },
            },
        },
    },
    {
        "path": "/api/v1/stats/histogram",
        "method": "POST",
        "authenticated": true,
        "description": "Get a breakdown of clicks by time.",
        "requestAttributes": {
            "ending": {"type": "string", "required": true},
            "startTime": {"type": "timestamp?", "required": false},
            "endTime":  {"type": "timestamp?", "required": false},
            "interval": {
                "type": "enumeration?",
                "required": false,
                "default": "day",
                "enumeration": [
                    "hour", "day", "month",
                ]
            },
        },
        "responseAttributes": {
            "ending": {"type": "string"},
            "shortUrl": {"type": "string"},
            "startTime": {"type": "timestamp"},
            "endTime": {"type": "timestamp"},
            "interval": {"type": "enumeration", "enumeration": ["hour", "day", "month"]},
            "histogram": {
                "type": "list",
                "each": {
                    "type": "object",
                    "attributes": {
                        "startTime": {"type": "timestamp"},
                        "endTime": {"type": "timestamp"},
                        "count": {"type": "integer"},
                    },
                },
            }
        },
    },
    {
        "path": "/api/v1/stats/geography",
        "method": "POST",
        "authenticated": true,
        "description": "Get a breakdown of clicks by location.",
        "requestAttributes": {
            "ending": {"type": "string", "required": true},
            "startTime": {"type": "timestamp?", "required": false},
            "endTime":  {"type": "timestamp?", "required": false},
            "type": {
                "type": "enumeration?",
                "required": false,
                "default": "country",
                "enumeration": [
                    "country", "region", "city", "postalCode"
                ]
            },
        },
    },
];

async function getLinkIdByEnding(app, ending){
    return await app.db.Link.select("linkId").where({
        "ending": ending,
        "disabled": false,
    });
}

module.exports = (app) => ({
    routes: routes,
    
    "/api/v1/shorten": async (request, response) => {
        const timestamp = moment();
        let ending = undefined;
        if(request.body.ending){
            try{
                await linkEndings.requestManualLinkEnding(app, request.body.ending);
            }catch(error){
                if(error.existingEnding){
                    response.parametersError(
                        `Link ending ${error.existingEnding} already exists.`
                    );
                    return;
                }else{
                    throw error;
                }
            }
            ending = request.body.ending;
        }else{
            ending = await linkEndings.fetchLinkEnding(app, 8);
        }
        const link = {
            "url": request.body.url,
            "ending": ending,
            "shortUrl": `${app.config.hostName}/${ending}`,
            "tags": request.body.tags || [],
            "creationTime": timestamp,
            "lastModifiedTime": timestamp,
        };
        await linkEndings.insertLink(app, link);
        response.success(link);
    },
    
    "/api/v1/shorten/batch": async (request, response) => {
        const timestamp = moment();
        // Verify specified endings
        const manualEndings = request.body.items.filter(
            item => item.ending
        ).map(
            item => item.ending
        );
        try{
            await linkEndings.requestManualLinkEndings(app, manualEndings);
        }catch(error){
            if(error.existingEnding){
                response.parametersError(
                    `Link ending ${error.existingEnding} already exists.`
                );
                return;
            }else{
                throw error;
            }
        }
        // Generate link endings for those left unspecified
        const generateEndings = request.body.items.filter(
            item => !item.ending
        );
        const endings = await linkEndings.fetchLinkEndings(
            app, 8, generateEndings.length
        );
        // Failed to generate enough endings
        if(endings.length < generateEndings.length){
            response.serverError();
            return;
        }
        // Attach generated endings to the urls to shorten
        for(let i = 0; i < generateEndings.length; i++){
            generateEndings[i].ending = endings[i];
        }
        // Now insert all of these as links
        const links = request.body.items.map(item => ({
            "url": item.url,
            "ending": item.ending,
            "shortUrl": `${app.config.hostName}/${item.ending}`,
            "tags": item.tags || [],
            "creationTime": timestamp,
            "lastModifiedTime": timestamp,
        }));
        await linkEndings.insertLinks(app, links);
        response.success(links.map(links));
    },
    
    "/api/v1/stats/histogram": async (request, response) => {
        const linkId = getLinkIdByEnding(app, request.body.ending);
        const interval = request.body.interval;
        const startTime = (
            request.body.startTime || moment().subtract(30, "days").startOf(interval)
        );
        const endTime = request.body.endTime || moment();
        const clicks = await app.db.Click.select(
            app.knex.raw(`date_trunc('${interval}', "clickTime") as bucket`),
            app.knex.raw("count(*)")
        ).where(
            "clickTime", ">=", startTime
        ).andWhere(
            "clickTime", "<", endTime
        ).groupBy("bucket").orderBy("bucket");
        response.success({
            "ending": request.body.ending,
            "shortUrl": `${app.config.hostName}/${request.body.ending}`,
            "startTime": startTime,
            "endTime": endTime,
            "interval": interval,
            "histogram": clicks.map(row => ({
                "startTime": row.bucket,
                "endTime": moment(row.bucket).add(1, interval),
                "count": +row.count,
            }))
        });
    },
    
    "/api/v1/stats/geography": async (request, response) => {
        const linkId = getLinkIdByEnding(app, request.body.ending);
        const startTime = (
            request.body.startTime || moment().subtract(30, "days").startOf("day")
        );
        const endTime = request.body.endTime || moment();
        const locationTypeColumns = {
            "country": ["countryName", "countryCode"],
            "region": ["regionName", "regionCode"],
            "city": ["city"],
            "postalCode": ["postalCode"],
        };
        const clicks = await app.db.Click.select(
             ...locationTypeColumns[request.body.type],
             app.knex.raw("count(*) as count")
        ).whereNotNull(
            locationTypeColumns[request.body.type][0]
        ).andWhere(
            "clickTime", ">=", startTime
        ).andWhere(
            "clickTime", "<", endTime
        ).groupBy(...locationTypeColumns[request.body.type]);
        response.success({
            "ending": request.body.ending,
            "shortUrl": `${app.config.hostName}/${request.body.ending}`,
            "startTime": startTime,
            "endTime": endTime,
            "type": request.body.type,
            "locations": clicks.map(click => {
                click.count = +click.count;
                return click;
            }),
        });
    },
});
