const { MongoClient } = require('mongodb');
const { EC2_MONGO_URI, LOCAL_MONGO_URI } = require('../config/config');
// const url = LOCAL_MONGO_URI;
const url = EC2_MONGO_URI;

let _db;

module.exports = {
  connectToServer: function(callback) {
    MongoClient.connect(url, { useUnifiedTopology: true}, (err, client) => {
      _db = client.db('raw_review_data');
      return callback(err);
    });
  },
  getDb: function() {
    return _db;
  }
}


