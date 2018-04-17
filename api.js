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
            "links": {
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
            "links": {
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
        "path": "/api/v1/get",
        "method": "POST",
        "authenticated": true,
        "description": "Get information about the link with a certain ending.",
        "requestAttributes": {
            "ending": {"type": "string", "required": true}
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
        "path": "/api/v1/update",
        "method": "POST",
        "authenticated": true,
        "description": "Update a shortened link.",
        "requestAttributes": {
            "url": {"type": "string?", "required": false},
            "ending": {"type": "string", "required": true},
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
        "path": "/api/v1/delete",
        "method": "POST",
        "authenticated": true,
        "description": "Delete a single shortened link.",
        "requestAttributes": {
            "ending": {"type": "string", "required": true}
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
        "path": "/api/v1/delete/batch",
        "method": "POST",
        "authenticated": true,
        "description": "Delete many shortened links.",
        "requestAttributes": {
            "endings": {
                "type": "list",
                "required": true,
                "each": {
                    "type": "string",
                    "required": true,
                },
            }
        },
        "responseAttributes": {
            "links": {
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
        "path": "/api/v1/list",
        "method": "POST",
        "authenticated": true,
        "description": "Get information about registered links.",
        "requestAttributes": {
            "url": {"type": "string?", "required": false,
                "description": "Get short links targeting this url."
            },
            "domain": {"type": "string?", "required": false,
                "description": "Get short links targeting a url with this domain."
            },
            "tags": {
                "type": "list?",
                "required": false,
                "each": {"type": "string"},
                "description": "Get short links having all of these tags.",
            },
            "count": {"type": "integer", "required": false,
                "minimum": 0, "maximum": 100, "default": 10
            },
            "offset": {"type": "integer", "required": false,
                "minimum": 0, "default": 0
            },
        },
        "responseAttributes": {
            "links": {
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
                    }
                }
            }
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
    {
        "path": "/api/v1/stats/clicks",
        "method": "POST",
        "authenticated": true,
        "description": "Get a list of recent clicks.",
        "requestAttributes": {
            "ending": {"type": "string", "required": true},
            "limit": {"type": "number", "required": false, "default": 100, "maximum": 100},
            "offset": {"type": "number", "required": false, "default": 0},
        },
    },
];

async function getLinkIdByEnding(app, ending){
    return (await app.db.Link.select("linkId").first().where({
        "ending": ending,
    })).linkId;
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
        const manualEndings = request.body.links.filter(
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
        const generateEndings = request.body.links.filter(
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
        const links = request.body.links.map(item => ({
            "url": item.url,
            "ending": item.ending,
            "shortUrl": `${app.config.hostName}/${item.ending}`,
            "tags": item.tags || [],
            "creationTime": timestamp,
            "lastModifiedTime": timestamp,
        }));
        await linkEndings.insertLinks(app, links);
        // All done!
        response.success({
            "links": links,
        });
    },
    
    "/api/v1/get": async (request, response) => {
        // Get the row for the link with this ending
        const link = await app.db.Link.select(
            "linkId", "url", "ending", "creationTime", "lastModifiedTime"
        ).first().where({
            "ending": request.body.ending,
        });
        // If there was no such link, give an error response
        if(!link){
            return response.parametersError("Link ending does not exist.");
        }
        // Query for link tags
        const tags = await app.db.LinkTag.select("tagName").where({
            "linkId": link.linkId,
        });
        // All done!
        return response.success({
            "url": link.url,
            "ending": link.ending,
            "shortUrl": `${app.config.hostName}/${link.ending}`,
            "tags": tags.map(tag => tag.tagName),
            "creationTime": link.creationTime,
            "lastModifiedTime": link.lastModifiedTime,
        });
    },
    
    "/api/v1/update": async (request, response) => {
        // If nothing is being updated, respond with an error
        if(!request.body.url && !request.body.tags){
            return response.parametersError(
                "The request must supply either a new url or a new list of tags."
            );
        }
        // Get the current time; the lastModifiedTime column will be set to this
        const timestamp = moment();
        // Get the link row from the database
        const link = await app.db.Link.select(
            "linkId", "url", "ending", "creationTime"
        ).first().where({
            "ending": request.body.ending,
        });
        // If no link was found with this ending, respond immediately
        if(!link){
            return response.success({
                "url": null,
                "ending": request.body.ending,
                "shortUrl": `${app.config.hostName}/${request.body.ending}`,
                "tags": [],
                "creationTime": null,
                "lastModifiedTime": null,
            });
        }
        // Update link information according to the request
        let linkTags = undefined;
        const linkUrl = request.body.url || link.url;
        // Update lastModifiedTime, as well as the url if specified
        await app.db.Link.update({
            "url": linkUrl,
            "lastModifiedTime": timestamp,
        }).where({
            "ending": request.body.ending,
        });
        // Update tags if the request provided a tag list
        if(request.body.tags){
            linkTags = request.body.tags;
            // Clear existing tags
            await app.db.LinkTag.delete().where({"linkId": link.linkId});
            // Then insert the new tags
            if(request.body.tags.length){
                await linkEndings.insertLinkTags(app, request.body.tags.map(
                    tagName => ({
                        "linkId": link.linkId,
                        "tagName": tagName,
                    })
                ));
            }
        }
        // If the request didn't specify a new tags list, get the existing tags
        // for inclusion in the response.
        else{
            linkTags = (await app.db.LinkTag.select("tagName").where({
                "linkId": link.linkId,
            })).map(tag => tag.tagName);
        }
        // All done!
        return response.success({
            "url": linkUrl,
            "ending": request.body.ending,
            "shortUrl": `${app.config.hostName}/${request.body.ending}`,
            "tags": linkTags,
            "creationTime": link.creationTime,
            "lastModifiedTime": timestamp,
        });
    },
    
    "/api/v1/delete": async (request, response) => {
        // Delete the row for this link ending
        const link = await app.db.Link.delete().first().where({
            "ending": request.body.ending,
        }).returning(
            "linkId", "url", "creationTime", "lastModifiedTime"
        );
        // If no row was deleted, then the link ending doesn't exist
        // and the server should respond with a parameters error
        if(!link){
            return response.parametersError("Link ending does not exist.");
        }
        // Delete tags for this link ending
        const tags = await app.db.LinkTag.delete().where({
            "linkId": link.linkId,
        }).returning("tagName");
        // All done!
        return response.success({
            "url": link.url,
            "ending": request.body.ending,
            "shortUrl": `${app.config.hostName}/${request.body.ending}`,
            "tags": tags.map(tag => tag.tagName),
            "creationTime": link.creationTime,
            "lastModifiedTime": link.lastModifiedTime,
        });
    },
    
    "/api/v1/delete/batch": async (request, response) => {
        // Delete the row for this link ending
        const links = await app.db.Link.delete().whereIn(
            "ending", request.body.endings,
        ).returning(
            "linkId", "url", "creationTime", "lastModifiedTime"
        );
        // Delete tags for this link ending
        const tags = await app.db.LinkTag.delete().whereIn(
            "linkId", links.map(link => link.linkId)
        ).returning("linkId", "tagName");
        // Add tags to link objects for inclusion in the response
        const linksById = {};
        for(let link of links){
            linksById[link.linkId] = link;
        }
        for(let tag of tags){
            const link = linksById[tag.linkId];
            if(link){
                link.tags = link.tags || [];
                link.tags.push(tag.tagName);
            }
        }
        // All done!
        return response.success({
            "links": links,
        });
    },
    
    "/api/v1/list": async (request, response) => {
        // Helper function to escape user input for use in a regular expression
        // From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
        function escapeRegExp(string){
            return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }
        // Handle the special case where 0 links were requested
        if(request.body.count <= 0){
            return response.success({
                "links": [],
            });
        }
        // For the normal case: Build a query to get all links matching the request
        let query = app.db.Link.alias("link").select(
            "link.linkId", "link.url", "link.ending",
            "link.creationTime", "link.lastModifiedTime"
        );
        // Filter links by target url
        if(request.body.url){
            query = query.where({
                "url": request.body.url,
            });
        // Filter links by the domain of their target url, e.g. find all shortlinks
        // pointing to anywhere on "maptionnaire.com"
        }else if(request.body.domain){
            // Build a regular expression to match links with a given domain
            // Ought to behave generally as one should expect
            const domain = (request.body.domain.endsWith("/") ?
                request.body.domain.slice(0, request.body.domain.length - 1) : request.body.domain
            );
            const regex = `^([a-z]+://)?(www\.)?${escapeRegExp(request.body.domain)}(/.*|$)`;
            query = query.where("link.url", "~", regex);
        }
        // Filter links by the presence of certain tags
        if(request.body.tags){
            for(let tag of request.body.tags){
                query = query.whereExists(
                    app.db.LinkTag.select(1).where({
                        "linkId": app.knex.raw("??", "link.linkId"),
                        "tagName": tag,
                    })
                );
            }
        }
        // Apply pagination. Note that the request validator has already
        // ensured that these values are appropriate
        query = query.limit(request.body.count).offset(request.body.offset);
        // And finally, query those links!
        const links = await query;
        // Get ready to retrieve tags - to this end, get a list of unique link IDs
        // and map them to their respective link objects for quick access later.
        // Also, since the links are being enumerated now anyway, attach an empty
        // tags list and a computed "shortUrl" attribute to each entry.
        const linkIds = [];
        const linksById = {};
        for(let link of links){
            linkIds.push(link.linkId);
            linksById[link.linkId] = link;
            link.tags = [];
            link.shortUrl = `${app.config.hostName}/${link.ending}`;
        }
        // Query all tags belonging to these links
        const tags = await app.db.LinkTag.select("linkId", "tagName").whereIn(
            "linkId", linkIds
        );
        // Attach the tags to their respective link objects
        for(let tag of tags){
            linksById[tag.linkId].tags.push(tag.tagName);
        }
        // All done!
        response.success({
            "links": links,
        });
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
        ).andWhere({
            "linkId": linkId, 
        }).andWhere(
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
    
    "/api/v1/stats/clicks": async (request, response) => {
        const linkId = await getLinkIdByEnding(app, request.body.ending);
        const query = app.db.Click.select(
            "ending", "url", "clickTime",
            "countryCode", "countryName",
            "referrerUrl"
        ).where({
            "linkId": linkId, 
        }).limit(
            request.body.limit
        ).offset(
            request.body.offset
        ).orderBy(
            "clickTime", "desc"
        );
        const clicks = await query;
        response.success({
            "ending": request.body.ending,
            "shortUrl": `${app.config.hostName}/${request.body.ending}`,
            "clicks": clicks,
        });
    },
});
