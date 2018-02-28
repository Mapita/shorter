const MapitaModel = require("./baseModel");

class Link extends MapitaModel{
    static get tableName(){return "shorter.Links";}
    static get idColumn(){return ["linkId"];}
}

class LinkEnding extends MapitaModel{
    static get tableName(){return "shorter.LinkEndings";}
    static get idColumn(){return ["ending"];}
}

class LinkTag extends MapitaModel{
    static get tableName(){return "shorter.LinkTags";}
    static get idColumn(){return ["linkId", "tagName"];}
}

class Click extends MapitaModel{
    static get tableName(){return "shorter.Clicks";}
    static get idColumn(){return ["linkId", "clickTime", "identifyingHash"];}
}

module.exports = {
    Link: Link,
    LinkEnding: LinkEnding,
    LinkTag: LinkTag,
    Click: Click,
};
