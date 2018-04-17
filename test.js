const assert = require("assert");
const axios = require("axios");
const canary = require("canary-test");
const moment = require("moment");

const shorter = new canary.Group("Shorter");

module.exports = app => {
    if(!app.config.apiKeys || !app.config.apiKeys.length){
        app.config.apiKeys = ["testapikey"];
    }
    
    async function request(method, url, data){
        if(data){
            data.apiKey = app.config.apiKeys[0];
        }
        const response = await axios({
            method: method,
            url: `${app.config.unitTestHostUrl}${url}`,
            validateStatus: status => !!status,
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
            assert(response.response.tags && response.response.tags.length === 0);
            assert(response.response.creationTime);
            assert(response.response.lastModifiedTime);
        });
        this.test("visit", async function(){
            const response = await request("get", `/${linkEnding}`);
            // Assumes that the google.com homepage is accessible and normal
            assert(response.indexOf("google"));
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
            assert(response.response.clicks && response.response.clicks.length === 1);
        });
    });
    
    shorter.series("shorten one with custom ending", function(){
        this.test("shorten", async function(){
            const response = await request("post", "/api/v1/shorten", {
                url: "http://www.google.com",
                ending: "testending",
            });
            assert(response.success);
            assert(response.response.url === "http://www.google.com");
            assert(response.response.ending === "testending");
        });
        this.test("visit", async function(){
            const response = await request("get", `/testending`);
            // Assumes that the google.com homepage is accessible and normal
            assert(response.indexOf("google"));
        });
    });
    
    shorter.series("shorten one then update", function(){
        let linkEnding;
        let lastTime;
        this.test("shorten", async function(){
            const response = await request("post", "/api/v1/shorten", {
                url: "http://www.google.com",
            });
            linkEnding = response.response.ending;
            lastTime = moment(response.response.creationTime);
            assert(response.success);
            assert(response.response.url === "http://www.google.com");
            assert(response.response.tags && response.response.tags.length === 0);
            assert(linkEnding);
            assert(lastTime);
        });
        this.test("update tags", async function(){
            const response = await request("post", "/api/v1/update", {
                ending: linkEnding,
                tags: ["firstTag", "secondTag"],
            });
            assert(response.success);
            assert(response.response.url === "http://www.google.com");
            assert(response.response.tags && response.response.tags.length === 2);
            assert(response.response.tags[0] === "firstTag");
            assert(response.response.tags[1] === "secondTag");
            const newTime = moment(response.response.lastModifiedTime);
            assert(newTime > lastTime);
            lastTime = newTime;
        });
        this.test("update url", async function(){
            const response = await request("post", "/api/v1/update", {
                ending: linkEnding,
                url: "http://www.maptionnaire.com",
            });
            assert(response.success);
            assert(response.response.url === "http://www.maptionnaire.com");
            assert(response.response.tags && response.response.tags.length === 2);
            const newTime = moment(response.response.lastModifiedTime);
            assert(newTime > lastTime);
            lastTime = newTime;
        });
        this.test("get link properties", async function(){
            const response = await request("post", "/api/v1/get", {
                ending: linkEnding,
            });
            assert(response.success);
            assert(response.response.url === "http://www.maptionnaire.com");
            assert(response.response.tags && response.response.tags.length === 2);
            assert(response.response.tags[0] === "firstTag");
            assert(response.response.tags[1] === "secondTag");
        });
        this.test("remove tags", async function(){
            const response = await request("post", "/api/v1/update", {
                ending: linkEnding,
                tags: [],
            });
            assert(response.success);
            assert(response.response.url === "http://www.maptionnaire.com");
            assert(response.response.tags && response.response.tags.length === 0);
            const newTime = moment(response.response.lastModifiedTime);
            assert(newTime > lastTime);
            lastTime = newTime;
        });
    });
    
    shorter.series("shorten one then delete", function(){
        let linkEnding;
        this.test("shorten", async function(){
            const response = await request("post", "/api/v1/shorten", {
                url: "http://www.google.com",
            });
            linkEnding = response.response.ending;
            assert(response.success);
            assert(linkEnding);
        });
        this.test("delete", async function(){
            const response = await request("post", "/api/v1/delete", {
                ending: linkEnding,
            });
            assert(response.success);
        });
        this.test("confirm deletion", async function(){
            const response = await request("post", "/api/v1/get", {
                ending: linkEnding,
            });
            assert(!response.success);
            assert(response.error.code === 400);
        });
    });
    
    shorter.series("batch shorten", function(){
        let links;
        this.test("shorten", async function(){
            const response = await request("post", "/api/v1/shorten/batch", {
                links: [
                    {url: "a.com"},
                    {url: "b.com"},
                    {url: "c.com", ending: "linkc"},
                ],
            });
            assert(response.success);
            links = response.response.links;
            assert(links && links.length === 3);
            assert(links[0].url === "a.com");
            assert(links[1].url === "b.com");
            assert(links[2].url === "c.com");
            assert(links[2].ending === "linkc");
        });
        for(let i = 0; i < 3; i++){
            this.test(`confirm creation of link #${1 + i}`, async function(){
                const link = links[i];
                const response = await request("post", "/api/v1/get", {
                    ending: link.ending,
                });
                assert(response.success);
                assert(response.response.url === link.url);
            });
        }
    });
    
    return shorter;
};
