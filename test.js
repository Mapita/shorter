const assert = require("assert");
const axios = require("axios");
const canary = require("canary-test");

const shorter = new canary.Group("Shorter");

module.exports = app => {
    async function request(method, url, data){
        if(data){
            data.apiKey = app.config.apiKeys[0];
        }
        const response = await axios({
            method: method,
            url: `${app.config.unitTestHostUrl}${url}`,
            data: data,
        })
        return response.data;
    }

    shorter.onEachBegin("reset the database", async function(){
        await app.knex.raw(app.db.schemaSource);
    });

    shorter.series("shorten one then visit", function(){
        let linkEnding;
        this.test("shorten", async function(){
            const response = await request("post", "/api/v1/shorten", {
                url: "http://www.google.com",
            });
            linkEnding = response.response.ending;
            assert(response.success);
            assert(response.response.url === "http://www.google.com");
            assert(linkEnding);
            assert(response.response.shortUrl === `${app.config.hostName}/${linkEnding}`);
            assert(response.response.tags instanceof Array);
            assert(response.response.tags.length === 0);
            assert(response.response.creationTime);
            assert(response.response.lastModifiedTime);
        });
        this.test("visit", async function(){
            const response = await request("get", `/${linkEnding}`);
            // Assumes that the google.com homepage is accessible and normal
            assert(response.startsWith("<!doctype html>"));
        });
        this.test("wait for click to be inserted into the database", function(){
            // Important because the server doesn't wait for the insertion to
            // redirect to the target url
            return new Promise(resolve => setTimeout(resolve, 500));
        });
        this.test("check for click", async function(){
            const response = await request("post", "/api/v1/stats/clicks", {
                ending: linkEnding,
            });
            assert(response.success);
            assert(response.response.ending === linkEnding);
            assert(response.response.clicks instanceof Array);
            assert(response.response.clicks.length === 1);
        });
    });
    
    return shorter;
};
