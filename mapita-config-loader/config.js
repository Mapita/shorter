// Helper for converting kebab-case to camelCase
// Used to convert --command-line-arguments to camelCase attributes
function kebabCaseToCamelCase(text){
    let result = "";
    let nextUpperCase = false;
    for(let ch of text){
        if(ch === "-"){
            nextUpperCase = true;
        }else if(nextUpperCase){
            result += ch.toUpperCase();
            nextUpperCase = false;
        }else{
            result += ch;
        }
    }
    return result;
}

module.exports = function(options){
    // Config attributes will be stored in this object as camelCase keys.
    let config = {};
    // Load configuration options from json or other js files.
    if(options.jsPaths){
        for(configPath of options.jsPaths){
            console.log(`Loading configuration from path "${configPath}"...`);
            try{
                let configPart = require(configPath);
                Object.assign(config, configPart);
            }catch(error){
                // Notify of loading failures, but don't abort.
                console.error(`Failed to load configuration from path "${configPath}".`);
            }
        }
    }
    // Load configuration options from command-line arguments.
    const commandLineOptions = require('minimist')(process.argv.slice(2));
    for(let optionName in commandLineOptions){
        config[kebabCaseToCamelCase(optionName)] = commandLineOptions[optionName];
    }
    // Load configuration from environment variables
    if(options.environmentVariables){
        for(let variableName in options.environmentVariables){
            if(process.env[variableName]){
                const configName = options.environmentVariables[variableName];
                console.log(
                    `Reading ${configName} config value ` +
                    `from environment variable ${variableName}.`
                );
                config[configName] = process.env[variableName];
            }
        }
    }
    // Add a function for constructing a knex client from config options
    if(options.knexClientOptions){
        config.knex = function(client){
            const clientOptions = options.knexClientOptions[client];
            if(!clientOptions){
                throw new Error(`Invalid knex client name "${client}".`);
            }
            return require("knex")({
                client: "pg",
                connection: {
                    host: this[clientOptions.host] || "127.0.0.1",
                    port: this[clientOptions.port] || 5432,
                    database: this[clientOptions.database],
                    user: this[clientOptions.user],
                    password: this[clientOptions.password],
                },
                pool: {
                    min: this[clientOptions.poolMin] || 2,
                    max: this[clientOptions.poolMax] || 10
                }
            });
        };
    }
    // All done loading configuration options!
    console.log("Finished loading configuration.");
    return config;
};
    