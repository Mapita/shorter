const objection = require("objection");

class MapitaQueryBuilder extends objection.QueryBuilder{
    // If a row exists with the same primary keys - or other unique columns
    // passed via the conflictIds argument - then update it. Otherwise insert.
    // https://github.com/Vincit/objection.js/issues/447
    // insertion - This is an object mapping column names to the values to
    // update (if a same-id row exists) or insert (if no same-id row exists).
    // onlyInsertion - Maps column names to values to insert if no same-id
    // row exists, but NOT to update if such a row does exist.
    // conflictIds - if left undefined, this is automatically determined by
    // reading the primary key or keys from the objection model class.
    upsert(insertion, conflictIds = undefined){
        // Get conflict columns, default to ID columns
        let conflicts = conflictIds || this.modelClass().idColumn;
        if(typeof(conflicts) === "string") conflicts = [conflicts];
        // Build the "ON CONFLICT (...)" part of the query.
        let conflictSql = "";
        const conflictBindings = [];
        for(const conflictName of conflicts){
            if(conflictSql.length) conflictSql += ", ";
            conflictSql += "??";
            conflictBindings.push(conflictName);
        }
        const onConflict = this.modelClass().raw(
            "(" + conflictSql + ")", conflictBindings
        );
        // Build the "DO UPDATE SET ..." part of the query
        // Build the INSERT INTO <table> (...) part of the query
        // Build the VALUES(...) part of the query
        // Build the RETURNING ... part of the query
        let setSql = "";
        const setBindings = [];
        let insertColumnsSql = "";
        const insertColumnBindings = [];
        let valuesSql = "";
        const valuesBindings = [];
        let returningSql = "";
        const returningBindings = [];
        for(const columnName in insertion){
            if(setSql.length){
                setSql += ", ";
                insertColumnsSql += ", ";
                valuesSql += ", ";
                returningSql += ", ";
            }
            setSql += "?? = EXCLUDED.??";
            insertColumnsSql += "??";
            valuesSql += "?";
            returningSql += "??";
            setBindings.push(columnName, columnName);
            insertColumnBindings.push(columnName);
            valuesBindings.push(insertion[columnName]);
            returningBindings.push(columnName);
        }
        const onConflictSet = this.modelClass().raw(
            setSql, setBindings
        );
        const insertColumns = this.modelClass().raw(
            "(" + insertColumnsSql + ")", insertColumnBindings
        );
        const values = this.modelClass().raw(
            "(" + valuesSql + ")", valuesBindings
        );
        const returning = this.modelClass().raw(
            returningSql, returningBindings
        );
        return this.modelClass().raw(
            "insert into ?? ? values ? on conflict ? do update set ? returning ?", [
                this.modelClass().tableName, insertColumns, values,
                onConflict, onConflictSet, returning
            ]
        );
    }
    // Insert a row or, if there is a conflict, update that existing row instead.
    // The first argument defines the insertion and the second row the update on
    // conflict. An optional third argument specifies which unique columns to
    // check for conflict on; this defaults to the table's primary key or keys.
    insertElseUpdate(insertion, update, conflictIds = undefined){
        // Get conflict columns, default to ID columns
        let conflicts = conflictIds || this.modelClass().idColumn;
        if(typeof(conflicts) === "string") conflicts = [conflicts];
        // Build the "ON CONFLICT (...)" part of the query.
        let conflictSql = "";
        const conflictBindings = [];
        for(const conflictName of conflicts){
            if(conflictSql.length) conflictSql += ", ";
            conflictSql += "??";
            conflictBindings.push(conflictName);
        }
        const onConflict = this.modelClass().raw(
            "(" + conflictSql + ")", conflictBindings
        );
        // Build the "DO UPDATE SET ..." part of the query
        let setSql = "";
        const setBindings = [];
        for(const columnName in update){
            if(setSql.length) setSql += ", ";
            setSql += "?? = ?";
            setBindings.push(columnName, update[columnName]);
        }
        const onConflictSet = this.modelClass().raw(
            setSql, setBindings
        );
        // Build the INSERT INTO <table> (...) part of the query
        // Build the VALUES(...) part of the query
        // Build the RETURNING ... part of the query
        let insertColumnsSql = "";
        const insertColumnBindings = [];
        let valuesSql = "";
        const valuesBindings = [];
        let returningSql = "";
        const returningBindings = [];
        for(const columnName in insertion){
            if(insertColumnsSql.length){
                insertColumnsSql += ", ";
                valuesSql += ", ";
                returningSql += ", ";
            }
            insertColumnsSql += "??";
            valuesSql += "?";
            returningSql += "??";
            insertColumnBindings.push(columnName);
            valuesBindings.push(insertion[columnName]);
            returningBindings.push(columnName);
        }
        const insertColumns = this.modelClass().raw(
            "(" + insertColumnsSql + ")", insertColumnBindings
        );
        const values = this.modelClass().raw(
            "(" + valuesSql + ")", valuesBindings
        );
        const returning = this.modelClass().raw(
            returningSql, returningBindings
        );
        return this.modelClass().raw(
            "insert into ?? ? values ? on conflict ? do update set ? returning ?", [
                this.modelClass().tableName, insertColumns, values,
                onConflict, onConflictSet, returning
            ]
        );
    }
}

module.exports = MapitaQueryBuilder;
