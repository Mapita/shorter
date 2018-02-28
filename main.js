function run(){
    const config = require("./mapita-config-loader/config")({
        jsPaths: [
            __dirname + "/public_config.json",
            __dirname + "/private_config.json",
        ],
        knexClientOptions: {
            "production": {
                client: "pg",
                host: "productionDatabaseHost",
                port: "productionDatabasePort",
                database: "productionDatabaseName",
                user: "productionDatabaseUser",
                password: "productionDatabasePassword",
                poolMin: "productionDatabasePoolMin",
                poolMax: "productionDatabasePoolMax",
            },
        },
    });

    const app = require("./app")({
        config: config,
        knex: config.knex("production"),
    });
    
    const port = config.port || 8080;
    app.listen(port, function(){
        console.log(`Now listening on port ${port}.`);
    });
}

run();
