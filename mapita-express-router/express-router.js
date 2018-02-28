const bodyParser = require("body-parser");
const bodyParserJson = bodyParser.json();

const validate = require("../mapita-validate/validate");

module.exports = {
    // This object may contain middleware functions used when applying routes.
    middleware: {},
    // A list of extensions to be applied to each route
    extensions: [],
    extend: function(extension){
        this.extensions.push(extension);
    },
    // To be raised or used to reject promises where an API request should
    // abort and fail with a given status code and error message.
    HandledServerError: function(status, message){
        const error = new Error(message);
        error.handledServerError = true;
        error.status = status;
        return error;
    },
    // Apply a list of routes to an express app object.
    apply: function(app, routes){
        for(const route of routes) this.applyRoute(app, route);
        return app;
    },
    // Apply a single route to an express app object.
    applyRoute: function(app, route){
        if(!route.method){
            throw new Error(
                `Method not specified for path "${route.path}".`
            );
        }
        const methodName = route.method.toLowerCase();
        if(!app[methodName]){
            throw new Error(
                `Unsupported HTTP method "${method}" for path "${route.path}".`
            );
        }
        const middleware = [
            bodyParserJson, 
            this.responseHelperMiddleware(route)
        ];
        for(let extension of this.extensions){
            extension(app, route, middleware);
        }
        if(route.request || route.requestAttributes){
            middleware.push(this.validateRequestMiddleware(route));
        }
        for(const middle of route.middleware || []){
            if(middle instanceof Function) middleware.push(middle);
            else middleware.push(this.middleware[middle]);
        }
        app[methodName](route.path, ...middleware, (request, response) => {
            try{
                // TODO: Currently only some routes have been written to
                // return promises, but at some point in the future ALL
                // routes ought to return promises and this conditional
                // ought to be eliminated.
                const promise = route.call(request, response);
                if(promise && promise instanceof Promise){
                    promise.then(data => {
                        // Better than leaving the client hanging until timeout
                        // when I forgot to complete the response in an endpoint.
                        if(!response.finished){
                            console.error("Route did not complete its response.");
                            response.serverError();
                        }
                    }).catch(error => {
                        response.catchError(error);
                    });
                }
            }catch(error){
                response.catchError(error);
            }
        });
    },
    // Add helpful methods to the response object
    responseHelperMiddleware: route => function(request, response, next){
        // Helper to respond with a success code and a given json payload.
        response.success = (data) => {
            // Provide in the response the request data as the API saw it
            // after validation - but first, remove sensitive fields such as
            // passwords or API keys.
            let requestObject = request.body;
            if(route.request){
                requestObject = validate.removeSensitive(
                    request.body, route.request
                );
            }else if(route.requestAttributes){
                requestObject = validate.removeSensitiveAttributes(
                    request.body, route.requestAttributes
                );
            }
            // Actually give a success response
            response.status(200).json({
                "success": true,
                "path": route.path,
                "response": data,
                "request": requestObject,
            });
        };
        // Helper to response with an HTML error code and error message string.
        response.error = (code, message) => {
            response.status(code).json({
                "success": false,
                "error": {
                    "code": code,
                    "message": message
                }
            });
        };
        // Helper to handle an error encoutered while processing a request.
        response.catchError = (error) => {
            if(error.handledServerError){
                response.error(error.status, error.message);
            }else if(error.validationError){
                response.error(400, error.message);
            }else{
                console.error("Encountered unhandled server error.");
                console.error(error);
                response.serverError();
            }
        };
        // Helper to report a status code 500 server error with optional message.
        response.serverError = (message=undefined) => {
            response.error(500, message || "Internal server error.");
        };
        // Helper to report a status code 400 parameters error.
        response.parametersError = (message) => {
            response.error(400, message);
        };
        // Helper to report a status code 401 unauthorized request error.
        response.unauthorized = () => {
            response.setHeader("WWW-Authenticate", `Basic realm="User Visible Realm"`);
            response.error(401, "Unauthorized request.");
        };
        next();
    },
    // Validate the request body
    validateRequestMiddleware: route => function(request, response, next){
        try{
            request.unvalidatedBody = request.body;
            if(route.request){
                request.body = validate.value(
                    request.body, route.request
                );
            }else if(route.requestAttributes){
                request.body = validate.attributes(
                    request.body, route.requestAttributes
                );
            }
            next();
        }catch(error){
            response.catchError(error);
        }
    },
};
