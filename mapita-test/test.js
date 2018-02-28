const axios = require("axios");

// Helper function to retrieve the current time in milliseconds.
function getTime(){
    return new Date().getTime();
}

// Test runner object. It contains a collection of test series, all of which
// are run upon a call to an instance's `run` method.
class TestRunner{
    constructor(){
        // NOTE: An `app` attribute must be assigned for tests to function.
        // TODO: Generalize the test runner to address this
        this.sessionId = undefined;
        this.respondentId = undefined;
        this.tests = {};
    }
    assignApp(app){
        this.app = app;
        this.reset();
    }
    reset(){
        this.sessionId = undefined;
        this.respondentId = undefined;
    }
    get hostUrl(){
        return this.app.config.unitTestHostUrl;
    }
    // Called by unit tests to make API requests
    get(url, data){
        return this.request("get", url, data);
    }
    post(url, data){
        return this.request("post", url, data);
    }
    async request(method, url, data){
        const headers = {};
        // Add session ID header for an authenticated session
        if(this.sessionId){
            headers["Authorization"] = `Bearer ${this.sessionId}`;
        }
        // Add respondent ID to request body for an identified respondent
        if(this.respondentId){
            data["respondentId"] = this.respondentId;
        }
        // Actually make the request
        // Note that this call may throw an error!
        const response = await axios({
            method: method,
            url: `${this.hostUrl}${url}`,
            headers: headers,
            data: data,
        })
        // If the response contained a session ID, use it to authenticate
        // future requests.
        if(response.data.response && response.data.response.sessionId){
            this.sessionId = response.data.response.sessionId;
        }
        // If the response contained a respondent ID, use it to identify
        // the respondent in future requests.
        if(response.data.response && response.data.response.respondentId){
            this.respondentId = response.data.response.respondentId;
        }
        // All done! Return the response json object.
        return response.data;
    }
    // Called in source to add unit tests to the runner
    series(title, body){
        const series = new TestSeries(this, title, body);
        this.tests[series.title] = series;
        return series;
    }
    test(title, body){
        const series = new TestSeries(this, title, undefined);
        series.add(title, body);
        this.tests[series.title] = series;
        return series;
    }
    // Return a promise that resolves after completing all tests that were
    // added to this TestRunner instance.
    async run(){
        for(let testTitle in this.tests){
            const test = this.tests[testTitle];
            // Support for e.g. --test-series CLI argument when testing only
            // a particular series of tests; in this case, all other tests will
            // be skipped/ignored.
            if(this.app.config.testSeries && test.title !== this.app.config.testSeries){
                continue;
            }
            try{
                await test.run();
            }catch(error){
                test.success = false;
                test.error = error;
            }
        }
        return this.report();
    }
    // Get an object containing a list of passed and failed tests
    report(){
        const errors = [];
        const attemptedSeries = [];
        const attemptedTests = [];
        const failedSeries = [];
        const failedTests = [];
        const successfulSeries = [];
        const successfulTests = [];
        for(let seriesTitle in this.tests){
            const series = this.tests[seriesTitle];
            attemptedSeries.push(series);
            if(!series.success){
                failedSeries.push(series);
                errors.push({
                    title: series.title,
                    series: series,
                    error: series.error
                });
            }else{
                successfulSeries.push(series);
            }
            for(let testTitle in series.tests){
                const test = series.tests[testTitle];
                attemptedTests.push(test);
                if(!test.success){
                    failedTests.push(test);
                    errors.push({
                        title: `${test.series.title}.${test.title}`,
                        test: test,
                        error: test.error
                    });
                }else{
                    successfulTests.push(test);
                }
            }
        }
        return {
            errors: errors,
            attempted: {
                series: attemptedSeries,
                tests: attemptedTests,
            },
            failed: {
                series: failedSeries,
                tests: failedTests,
            },
            successful: {
                series: successfulSeries,
                tests: successfulTests,
            },
        };
    }
}

class TestSeries{
    constructor(api, title, body){
        this.title = title;
        this.body = body;
        this.tests = {};
        this.api = api;
        // Has the test been run yet?
        this.attempted = false;
        // Was the test run without producing errors?
        this.success = undefined;
        // What error did the test produce, if any?
        this.error = undefined;
        // When was the test started (if at all)?
        this.startTime = undefined;
        // When was the test aborted or completed (if at all)?
        this.endTime = undefined;
    }
    // Get duration of the test series (in milliseconds)
    get duration(){
        if(this.startTime && this.endTime){
            return this.endTime - this.startTime;
        }else{
            return undefined;
        }
    }
    // Called when this test begins execution.
    begin(){
        this.startTime = getTime();
        this.attempted = true;
        this.success = undefined;
        this.error = undefined;
        console.log(
            `Running test series "${this.title}"...`
        );
    }
    // Called when this test series fails or is otherwise aborted.
    abort(error=undefined){
        this.endTime = getTime();
        this.error = error;
        this.success = false;
        console.log(
            `Aborting test series "${this.title}" ` +
            `due to a test failure.`
        );
    }
    // Called when this test series is successfully completed.
    complete(){
        this.endTime = getTime();
        this.success = true;
        console.log(
            `Completed test series "${this.title}". ` +
            `(${this.duration * .001}s)`
        );
    }
    async run(){
        this.begin();
        // TODO: These first two reset steps should not be an inherent part of
        // the test runner code. They should be implemented by maptionnaire2
        // in onTestSeriesBegin or similar event handlers.
        // Reset the test runner
        this.api.reset();
        console.log("Resetting the database.");
        // Reset the database
        try{
            await this.api.app.knex.raw(this.api.app.db.schemaSource);
        }catch(error){
            return this.abort(error);
        }
        // Evaluate the test series body (provided it has one)
        // This is where unit tests are typically added to the series
        if(this.body){
            try{
                this.body(this);
            }catch(error){
                return this.abort(error);
            }
        }
        // Run every test in order
        for(let testTitle in this.tests){
            const test = this.tests[testTitle];
            try{
                await test.run();
            }catch(error){
                return this.abort(error);
            }
            if(test.error || !test.success){
                return this.abort();
            }
        }
        this.complete();
    }
    add(title, body){
        const test = new Test(this.api, this, title, body);
        this.tests[title] = test;
    }
    // Create a new account and login.
    // TODO: The user needs to have access to a permissive license
    // TODO: This registration must circumvent email confirmation
    // TODO: This should not be implemented in the core test runner code
    registerAndLogin(){
        this.add("registerAndLogin", async function(api){
            await api.post("/v1/auth/register", {
                "emailAddress": "test@test.com",
                "password": "ThisIs1CleverTestPassword!",
            });
            // api object automatically extracts session ID
            await api.post("/v1/auth/login", {
                "emailAddress": "test@test.com",
                "password": "ThisIs1CleverTestPassword!",
            });
        });
    }
    createQuestionnaire(attribute="questionnaireId"){
        this.add("createQuestionnaire", async (api) => {
            const response = await api.post("/v1/questionnaire/create", {
                "name": "Test Questionnaire",
            });
            this[attribute] = response.response.questionnaireId;
        });
    }
}

// Represents a single unit test.
class Test{
    constructor(api, series, title, body){
        this.api = api;
        this.series = series;
        this.title = title;
        this.body = body;
        // Has the test been run yet?
        this.attempted = false;
        // Was the test run without producing errors?
        this.success = false;
        // What error did the test produce, if any?
        this.error = undefined;
        // When was the test started (if at all)?
        this.startTime = undefined;
        // When was the test aborted or completed (if at all)?
        this.endTime = undefined;
    }
    // Get duration of the test (in milliseconds)
    get duration(){
        if(this.startTime && this.endTime){
            return this.endTime - this.startTime;
        }else{
            return undefined;
        }
    }
    // Called when this test begins execution.
    begin(){
        this.startTime = getTime();
        this.attempted = true;
        this.success = undefined;
        this.error = undefined;
    }
    // Called when this test fails or is otherwise aborted.
    abort(error=undefined){
        this.endTime = getTime();
        this.error = error;
        this.success = false;
        console.log(
            `Test "${this.series.title}.${this.title}" failed.`
        );
    }
    // Called when this test is successfully completed.
    complete(){
        this.endTime = getTime();
        this.success = true;
        console.log(
            `Test "${this.series.title}.${this.title}" ran successfully. ` +
            `(${this.duration * .001}s)`
        );
    }
    // Begins executing the test and returns a promise.
    async run(){
        this.begin();
        try{
            await this.body(this.api);
        }catch(error){
            return this.abort(error);
        }
        this.complete();
    }
}

TestRunner.Singleton = new TestRunner();

// Add a test series to the global TestRunner instance
function series(title, body){
    if(TestRunner.Singleton){
        return TestRunner.Singleton.series(title, body);
    }
}
// Add a single test to the global TestRunner instance
function test(title, body){
    if(TestRunner.Singleton){
        return TestRunner.Singleton.test(title, body);
    }
}

module.exports = {
    Runner: TestRunner,
    Series: TestSeries,
    Test: Test,
    series: series,
    test: test,
};
