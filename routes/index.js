var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
const localStorage = require('localStorage');
var jwt = require('jsonwebtoken');
const app = express();


const MongoClient  = require('mongodb').MongoClient;
// const url = 'mongodb://localhost:27017';
const url = 'mongodb+srv://e_mongo:e_dz_mongo_db@cluster0.r28tm.mongodb.net/test';

const cors = require('cors');
router.use(express.urlencoded({extended: true}));
router.use(express.json());
router.use(cors());


/* GET home page. */
var movie = {};//i ovaj dio preko loaclstorage-a uradit jer ako mi vise usera bude odjednom pokupit ce podatke samo od usera koji je zadnji odabrao film
var user_email = "";
var token = null;

function logInCheck(req, res, next){
  const auth_token = req.headers.authorization.split(" ")[1]
  if (token === null){
    return res.send("Not logged in!");
  }else{
    if (token !== auth_token){
      return res.send("Invalid cookie!");
    }
  }
  next();
}

router.use("/movies_list", logInCheck);
router.use("/movie", logInCheck);


router.post('/movie',async function(req, res, next) {
  if (!req.body.comment && !req.body.saved){
    movie = {
      movieId: req.body.movieId,
      image: req.body.image,
      title: req.body.title,
      actors: req.body.actors,
      year: req.body.year,
      rating: req.body.rating,
      runtime: req.body.runtime,
      genre: req.body.genre,
      plot: req.body.plot
    }
  }else{
    if(!req.body.saved){
      await MongoClient.connect(url, function(err, db) {
        if (err) throw err;
        const dbo = db.db('movie_rec_db');
        dbo.collection("comments").insertOne( {
          user: user_email,
          movieId: movie.movieId,
          comment: req.body.comment
        })
        res.send("New post!");
      });
    }else {
      await MongoClient.connect(url, function(err, db) {
        if (err) throw err;
        const dbo = db.db('movie_rec_db');
        dbo.collection("saved_movies").insertOne( {
          user: user_email,
          movieId: movie.movieId,
          title: movie.title,
          image: movie.image
        })
        res.send("Saved!");
      });
    }

  }

});

router.get('/movie', async function(req, res, next) {
    await MongoClient.connect(url, function(err, db) {
      if (err) throw err;
      const dbo = db.db('movie_rec_db');
      dbo.collection("comments").find({
        movieId: movie.movieId
      }).toArray(async function(err, result) {
        if (err) throw err;

        dbo.collection("saved_movies").find({
          user: user_email,
          movieId: movie.movieId
        }).toArray(async function(err, result2) {
          if (err) throw err;
          if(result2.length === 0){
            res.send({
              status: "false",
              movieInfo: JSON.stringify(movie),
              comments: JSON.stringify(result)
            });
          }else{
            res.send({
              status: "true",
              movieInfo: JSON.stringify(movie),
              comments: JSON.stringify(result)
            });
          }
          db.close();
        });
      });
    });

});

router.post('/registration', async function(req, res, next) {
  const salt = await bcrypt.genSaltSync();
  const hash = await bcrypt.hashSync(req.body.password, salt);

  await MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    const dbo = db.db('movie_rec_db');
    dbo.collection("users").insertOne( {
      firstName: req.body.first_name,
      lastName: req.body.last_name,
      dob: req.body.dob,
      email: req.body.email,
      password: hash
    })
    res.send("Registered!");
  });
});

router.post('/login', async function(req, res, next) {

  await MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    const dbo = db.db('movie_rec_db');
    dbo.collection("users").find({
      email: req.body.email
    }).toArray(async function(err, result) {
      if (err) throw err;
      await bcrypt.compare(req.body.password, result[0].password).then(function(result_2) {

        if(result_2 === true){

          localStorage.setItem("user", req.body.email);
          user_email = localStorage.getItem("user");

          token = jwt.sign({
            email: user_email,
            date: (new Date()).toString()
          }, 'shhhhh', { expiresIn: '1h' });

          res.send({
            status: "Login passed!",
            token: token
          });
        }else{
          console.log("Login failed!");
        }
      });
      db.close();
    });
  });
});

router.get('/movies_list', async function(req, res, next) {
  await MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    const dbo = db.db('movie_rec_db');
    //Find all documents in the customers collection:
    dbo.collection("saved_movies").find({
      user: user_email
    }).toArray(async function(err, result) {
      if (err) throw err;
      dbo.collection("users").find({
        email: user_email
      }).toArray(async function (err, result_2){
        if (err) return  err;
        res.send({
          savedMovies: JSON.stringify(result),
          firstName: result_2[0].firstName,
          lastName: result_2[0].lastName
        })
        db.close();
      })
    });
  });
});


router.delete('/movies_list', async function(req, res, next) {
  await MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    const dbo = db.db('movie_rec_db');

    dbo.collection("saved_movies").deleteOne({
      title: req.body.title,
      movieId: req.body.movieId
    }).then(function (result){
      res.send("Deleted!")
    })
  });
});


module.exports = router;
