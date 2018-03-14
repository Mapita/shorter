const express = require('express');

const objection = require("objection");
const Model = objection.Model;

const models = require("./models/models");
const linkEndings = require("./linkEndings");

module.exports = function(options){
    app = express();
    app.config = options.config;
    app.knex = options.knex;
    app.db = {Model: Model};
    app.db.Model.knex(app.knex);
    for(const modelName in models){
        app.db[modelName] = models[modelName];
    }
    
    // Allows testing in a local environment
    // http://stackoverflow.com/a/18311469/4099022
    app.use(function(request, response, next){
        response.header('Access-Control-Allow-Origin', '*');
        response.header('Access-Control-Allow-Methods', 'GET,POST,DELETE');
        response.header('Access-Control-Allow-Headers', 'X-Access-Token,content-type');
        next();
    });
    
    app.use(require('express-useragent').express());
    
    const router = require("./mapita-express-router/express-router");
    router.extend(function(app, route, middleware){
        if(route.authenticated){
            middleware.push(router.middleware.requireApiKey);
        }
    });
    router.middleware.requireApiKey = function(request, response, next){
        if(request.body.apiKey){
            for(let key of app.config.apiKeys){
                if(key === request.body.apiKey){
                    return next();
                }
            }
        }
        response.unauthorized();
    };
    
    const api = require("./api")(app);
    for(let route of api.routes){
        route.call = api[route.path];
    }
    router.apply(app, api.routes);
    
    app.get('*', async function(request, response){
        let ending = request.url.slice(1);
        // Get the requested link ID and target URL
        let link = await app.db.Link.select("linkId", "url").first().where({
            "ending": ending,
        });
        // If not found, try again after replacing easily-confused symbols and
        // ignoring hypens.
        if(!link){
            // Replace easily-confused symbols in generated endings, and ignore hyphens.
            const replacementMap = {
                "1": "I",
                "0": "O",
                "Q": "O",
                "5": "S",
                "-": "",
            };
            for(let character in replacementMap){
                ending = ending.replace(character, replacementMap[character]);
            }
            // Try to get the link again, with the newly processed ending
            let link = await app.db.Link.select("linkId", "url").first().where({
                "ending": ending,
            });
        }
        // Record this click in the database (but don't wait up)
        if(link){
            linkEndings.visitLink(app, request, {
                "linkId": link.linkId,
                "ending": ending,
                "url": link.url,
            }).then(() => {});
            // Redirect to the destination URL
            response.redirect(link.url);
        // Redirect to the not-found page if the ending didn't exist
        }else{
            response.redirect(app.config.pageNotFoundUrl);
        }
    });
    
    return app;
}
