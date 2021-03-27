const express = require('express');
const { connectToServer, getDb } = require('./db/db');

let db;

connectToServer((err) => {
  if (err) {
    console.log(err);
  } else {
    console.log('Connected to MongoDB!');
    db = getDb();
  }
});

const app = express();
app.use(express.json());

const port = process.env.PORT || 3000;

app.get('/reviews/meta', (req, res) => {
  const productId = Number(req.query.product_id);
  db.collection('final_products').findOne({_id: productId}, function(err, result) {
    if (err) {
      res.sendStatus(404);
    };
    const metaData = {
      product_id: productId.toString(),
      ratings: {},
      recommended: {
        true: 0,
        false: 0
      },
      characteristics: {}
    };

    const charNamesAndIds = result.characteristics[0].characteristics;

    // loop over reviews and extract data to put in metaData object
    result.reviews.forEach((r) => {
      // add rating data
      metaData.ratings[r.rating] = metaData.ratings[r.rating] ? metaData.ratings[r.rating] + 1 : 1;

      // add "recommended" data
      if (r.recommend) {
        metaData.recommended.true += 1;
      } else {
        metaData.recommended.false += 1;
      }

      // add characteristics data
      const revChars = r.characteristics[0].characteristics;
      for (let i = 0; i < revChars.length; i += 1) {
        // use characteristic_id to get characteristic name
        const charId = revChars[i].characteristic_id;
        const charValue = revChars[i].value;

        for (let j = 0; j < charNamesAndIds.length; j += 1) {
          const char = charNamesAndIds[j];
          if (char.id === charId) {
            const charName = char.name;
            if(!metaData.characteristics[charName]) {
              metaData.characteristics[charName] = {
                id: charId,
                value: [charValue]
              };
              break;
            } else {
              metaData.characteristics[charName].value = [...metaData.characteristics[charName].value, charValue];
              break;
            }
          }
        }
      }
    });

    // stringify rating values
    for (const key in metaData.ratings) {
      metaData.ratings[key] = metaData.ratings[key].toString();
    }

    // find the mean of characteristic values and stringify the mean
    for (const key in metaData.characteristics) {
      let valueTotal = 0;
      for (let i = 0; i < metaData.characteristics[key].value.length; i += 1) {
        const v = metaData.characteristics[key].value[i];
        valueTotal += v;
      }
      metaData.characteristics[key].value = (valueTotal / metaData.characteristics[key].value.length).toString();
    }

    res.json(metaData);
  });
});

app.get('/reviews', (req, res) => {
  const productId = Number(req.query.product_id);
  const sortValue = req.query.sort;

  db.collection('final_products').findOne({_id: productId}, function(err, result) {
    if (err) {
      res.sendStatus(404);
    };

    const reviews = {
      results: []
    };

    result.reviews.forEach((r) => {
      if (r.reported == false || r.reported === 'false') {
        const photos = r.photos.length === 0 ? [] : r.photos[0].photos;
        reviews.results.push({
          review_id: r.id,
          rating: r.rating,
          summary: r.summary,
          recommend: r.recommend,
          response: r.response,
          body: r.body,
          date: r.date,
          reviewer_name: r.reviewer_name,
          helpfulness: r.helpfulness,
          photos
        });
      }
    });

    // sort results
    if (sortValue) {
      if (sortValue === 'helpful') {
        reviews.results.sort((a, b) => b.helpfulness - a.helpfulness);
      } else if (sortValue === 'newest') {
        reviews.results.sort((a, b) => {
          const splitBDate = b.date.split('-');
          const bDate = Date.UTC(splitBDate[0], splitBDate[1], splitBDate[2]);
          const splitADate = a.date.split('-');
          const aDate = Date.UTC(splitADate[0], splitADate[1], splitADate[2]);
          return bDate - aDate;
        });
      }
    }

    res.json(reviews);
  });
});

app.post('/reviews', (req, res) => {
  // pull fields off req body
  const {
    product_id,
    rating,
    summary,
    body,
    recommend,
    name,
    email,
    photos,
    characteristics
  } = req.body;

  // reformat the characteristics for the database
  const reformattedChars = [];
  for (const key in characteristics) {
    const charObj = {};
    charObj.characteristic_id = Number(key);
    charObj.value = Number(characteristics[key]);
    reformattedChars.push(charObj);
  }

  // format date for database
  const dateObj = new Date();
  const year = dateObj.getUTCFullYear();
  const month = dateObj.getUTCMonth() + 1;
  const day = dateObj.getUTCDate();
  const date = `${year}-${month}-${day}`;

  // reformat photos for database
  const reformattedPhotos = [];
  if (photos) {
    photos.forEach((url) => {
      reformattedPhotos.push({ url });
    });
  }

  const newReview = {
    body: body || '',
    characteristics: [
      {
        characteristics: reformattedChars
      }
    ],
    date,
    helpfulness: 0,
    id: new Date().valueOf(),
    photos: [
      {
        photos: reformattedPhotos
      }
    ],
    product_id,
    rating,
    recommend,
    reported: false,
    response: '',
    reviewer_email: email,
    reviewer_name: name,
    summary: summary || ''
  };

  db.collection('final_products').updateOne({_id: product_id}, {$push: {'reviews': newReview }}, (err) => {
    if (err) {
      res.sendStatus(500);
    } else {
      res.sendStatus(201);
    }
  });
});

app.put('/reviews/:review_id/helpful', (req, res) => {
  const review_id = Number(req.params.review_id);
  const { product_id } = req.body;

  db.collection('final_products').updateOne({_id: product_id, 'reviews.id': review_id}, {$inc: {'reviews.$.helpfulness': 1 }}, (err) => {
    if (err) {
      res.sendStatus(500);
    } else {
      res.sendStatus(204);
    }
  });
});

app.put('/reviews/:review_id/helpful', (req, res) => {
  const review_id = Number(req.params.review_id);
  const { product_id } = req.body;

  db.collection('final_products').updateOne({_id: product_id, 'reviews.id': review_id}, {$inc: {'reviews.$.helpfulness': 1 }}, (err) => {
    if (err) {
      res.sendStatus(500);
    } else {
      res.sendStatus(204);
    }
  });
});

app.put('/reviews/:review_id/report', (req, res) => {
  const review_id = Number(req.params.review_id);
  const { product_id } = req.body;

  db.collection('final_products').updateOne({_id: product_id, 'reviews.id': review_id}, {$set: {'reviews.$.reported': true }}, (err) => {
    if (err) {
      res.sendStatus(500);
    } else {
      res.sendStatus(204);
    }
  });
});

app.listen(port, () => {
  console.log(`Server is up on port ${port}`);
});
