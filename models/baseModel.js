const objection = require("objection");

const MapitaQueryBuilder = require("./queryBuilder.js");

class MapitaModel extends objection.Model{
    static get QueryBuilder(){return MapitaQueryBuilder;}
    static alias(...args){
        return this.query().alias(...args);
    }
    static delete(...args){
        return this.query().delete(...args);
    }
    static findById(...args){
        return this.query().findById(...args);
    }
    static findOne(...args){
        return this.query().findOne(...args);
    }
    static first(...args){
        return this.query().first(...args);
    }
    static insert(...args){
        return this.query().insert(...args);
    }
    static insertElseUpdate(...args){
        return this.query().insertElseUpdate(...args);
    }
    static select(...args){
        return this.query().select(...args);
    }
    static update(...args){
        return this.query().update(...args);
    }
    static upsert(...args){
        return this.query().upsert(...args);
    }
    static where(...args){
        return this.query().where(...args);
    }
    static whereExists(...args){
        return this.query().whereExists(...args);
    }
    static whereNotExists(...args){
        return this.query().whereNotExists(...args);
    }
}

module.exports = MapitaModel;
