const mongoose = require('mongoose');
const redis = require('redis');
const util = require('util');
const keys = require('../config/keys');

const client = redis.createClient(keys.redisUrl);
client.hget = util.promisify(client.hget);

const exec = mongoose.Query.prototype.exec;

mongoose.Query.prototype.cache = function(options = {}) {
    this.useCache = true;

    this.hashKey = JSON.stringify(options.key || '');

    return this;
};

mongoose.Query.prototype.exec = async function() {
    // TODO: ver si se puede preguntar si redis está corriendo, y si no es así
    // fallback a mongo directo
    if (!this.useCache) {
        console.log('Cache off');

        return exec.apply(this, arguments);
    }

    console.log('PRE QUERY');

    const key = JSON.stringify(Object.assign({}, this.getQuery(), {
        collection: this.mongooseCollection.name
    }));

    // Do we have cached data?
    const cachedValue = await client.hget(this.hashKey, key);

    // If we do, return the cached data
    if (cachedValue) {
        console.log('Serving from Cache');

        let parsedValue = JSON.parse(cachedValue);

        return Array.isArray(parsedValue) ?
            parsedValue.map(pVal => new this.model(pVal)) :
            new this.model(parsedValue);
    }

    console.log('Serving from MongoDB');

    // If not, get the data...
    const value = await exec.apply(this, arguments);

    // Save it to cache...
    client.hset(this.hashKey, key, JSON.stringify(value), 'EX', 10);

    return value;
};

module.exports = {
    clearHash(hashKey) {
        client.del(JSON.stringify(hashKey));
    }
};