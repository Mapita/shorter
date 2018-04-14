function run(){
    const config = require("./mapita-config-loader/config")({
        jsPaths: [
            __dirname + "/public_config.json",
            __dirname + "/private_config.json",
        ],
        environmentVariables: {
            "MAPITA_TEST_DATABASE_HOST": "testDatabaseHost",
            "MAPITA_TEST_DATABASE_PORT": "testDatabasePort",
            "MAPITA_TEST_DATABASE_NAME": "testDatabaseName",
            "MAPITA_TEST_DATABASE_USER": "testDatabaseUser",
            "MAPITA_TEST_DATABASE_PASSWORD": "testDatabasePassword",
        },
        knexClientOptions: {
            "test": {
                client: "pg",
                host: "testDatabaseHost",
                port: "testDatabasePort",
                database: "testDatabaseName",
                user: "testDatabaseUser",
                password: "testDatabasePassword",
                poolMin: "testDatabasePoolMin",
                poolMax: "testDatabasePoolMax",
            },
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
        knex: (config.runUnitTests ?
            config.knex("test") : config.knex("production")
        ),
    });
    
    const port = config.port || 8080;
    app.listen(port, function(){
        console.log(`Now listening on port ${port}.`);
        if(config.runUnitTests){
            require("./test")(app).doReport();
        }
    });
}

run();
