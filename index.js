
// Provides a simple interface for saving and retrieving data to and from a database
const MongoClient = require('mongodb').MongoClient;
const SHA256 = require("crypto-js/sha256");
const cache = require('./cache.js');
const Joi = require('@hapi/joi');

class Service {
    // connect to DB
    async connect(dbConnection, dbName, cacheSize, lifeTime) {
        // Validate input
        const schema = Joi.object().keys({
            dbConnection: Joi.string().required(),
            dbName: Joi.string().required(),
            cacheSize: Joi.number().required(),
            lifeTime: Joi.number().required()
        });

        let { error, value } = schema.validate({
            dbConnection: dbConnection,
            dbName: dbName,
            cacheSize: cacheSize,
            lifeTime: lifeTime
        });

        if (error) {
            throw ({ error: error });
        }

        try {
            const client = await MongoClient.connect(dbConnection, { useNewUrlParser: true, useUnifiedTopology: true });
            this.db = client.db(dbName);
        } catch (error) {
            throw error;
        }
        // set initial cache params
        cache.init(cacheSize, lifeTime);

        return { status: "OK" };
    }

    async find(query, collection) {
        return new Promise(async (resolve, reject) => {
            // First look in cache
            const key = SHA256(query).toString();
            const result = cache.get(key);
            if (result) {
                return resolve(result);
            }
            // query db
            await this.db.collection(collection).find(query, { projection: { _id: 0 } }).toArray((err, result) => {
                if (err) {
                    return reject(err);
                }
                // save to cache    
                for (let record of result) {
                    cache.add({
                        key: key,
                        record: record
                    });
                }
                resolve(result)
            });
        });
    }

    async save(options) {
        // Validate input
        let { id, data, collection } = options;
        const schema = Joi.object().keys({
            id: Joi.number().allow(null),
            data: Joi.object().required(),
            collection: Joi.string().required()
        });

        let { error, value } = schema.validate({
            id: id,
            data: data,
            collection: collection
        });

        if (error) {
            throw ({ error: error });
        }
        return new Promise(async (resolve, reject) => {
            let query = {};
            const key = Math.random() * Date.now();
            query.id = id ? id : SHA256(key.toString()).toString();
            await this.db.collection(collection).updateOne(
                query,
                {
                    $currentDate: { "created_at": { $type: "date" } },
                    $set: data
                },
                { upsert: true }, (error, result) => {
                    if (error) {
                        return reject(error);
                    }
                    resolve({ id: query.id });
                }
            );
        });
    }
}

// singleton 
module.exports = new Service();