const { MongoClient } = require('mongodb');
const url = "mongodb://localhost:27017";

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


