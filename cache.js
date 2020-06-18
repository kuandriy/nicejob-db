
const sizeof = require('object-sizeof');
const moment = require('moment');
class Service {
    init(cacheSize, lifeTime) {
        this.store = {};
        this.cacheSize = cacheSize;
        this.lifeTime = lifeTime;
        setInterval(() => { this.truncateCache(); }, this.lifeTime);
    }

    getSize() {
        return sizeof(this.store);
    }

    add(data) {
        if (this.getSize() > this.cacheSize) {
            this.truncateCache();
        }
        data.record.created = moment().format();
        this.store[data.key] = data.record;
    }
    get(key) {
        //update key timestamp on new request
        this.store[key].created = moment().format();
        return this.store[key];
    }
    truncateCache() {
        //truncate old cache
        for (let record in this.store) {
            if (moment().diff(moment(this.store[record].created)) > this.lifeTime) {
                delete this.store[record];
            }
        };
    }
}

const app = new Service();

// singeltone 
module.exports = app;