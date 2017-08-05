require('dotenv').config();
const express = require('express');
const db = require('./database/dbsetup.js');

const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const path = require('path');
const router = require('./server/router.js');
const scrapeMovies = require('./server/facebookScraper.js');
const { createTrophiesAtFirstLogin } = require('./server/apiController.js');

const session = require('express-session');
const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;

// EXPRESS
const app = express();


// MODELS
// const User = db.users;
// const Movie = db.movies;
// const Tag = db.tags;
// const MovieTag = db.movieTags;
// const UserTag = db.userTags;
// const UserMovie = db.userMovies;

// MIDDLEWARE
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(morgan('dev'));

app.use(session({ secret: 'Binary Hundred', resave: true, saveUninitialized: false }));

app.use(passport.initialize());
app.use(passport.session());

// ROUTES
app.use(express.static(path.resolve(__dirname, './public')));
app.use('/', router);

// PASSPORT MIDDLEWARE
// Facebook
passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID,
  clientSecret: process.env.FACEBOOK_APP_SECRET,
  callbackURL: process.env.FACEBOOK_OAUTH_CALLBACK_URL,
  profileFields: ['id', 'displayName', 'photos', 'emails', 'movies']
},
(accessToken, refreshToken, profile, done) => {
  db.users.findOne({ where: { authId: profile.id } })
  .then((user) => {
    if (!user) {
      console.log('Creating new user!!!!!');
      return db.users.create({
        name: profile.displayName,
        picture: profile.photos[0].value,
        email: profile.emails[0].value,
        authId: profile.id,
        loginNumber: 1
      })
      .then(newUser => createTrophiesAtFirstLogin(newUser))
      .then(newUser => {
        done(null, newUser);
        return newUser;
      })
      .catch(err => console.error('Failed to create user:', err));
    } else {
      console.log('User found and already exists:', user);
      return user.update({ loginNumber: user.loginNumber + 1 })
        .then((updatedUser) => {
          console.log('Got updatedUser: ', updatedUser);
          done(null, updatedUser);
          return updatedUser;
        });
    }
  })
  .then((user) => { // Only scrape at first login
    if (user.loginNumber === 1) { scrapeMovies(profile); }
  })
  .catch((err) => {
    console.error('Error finding user:', err);
    return done(err);
  });
}));

// Google
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_OAUTH_CALLBACK_URL,
  profileFields: ['id', 'displayName', 'photos', 'emails']
},
(accessToken, refreshToken, profile, done) => {
  db.users.findOne({ where: { authId: profile.id } })
  .then((user) => {
    if (!user) {
      console.log('Creating new user!!!!!');
      db.users.create({
        name: profile.displayName,
        picture: profile.photos[0].value,
        email: profile.emails[0].value,
        authId: profile.id,
        loginNumber: 1
      })
      .then(newUser => createTrophiesAtFirstLogin(newUser))
      .then(newUser => {
        done(null, newUser);
        return newUser;
      })
      .catch(err => console.error('Failed to create user:', err));
    } else {
      console.log('User found and already exists:', user);
      return user.update({ loginNumber: user.loginNumber + 1 })
        .then((updatedUser) => {
          console.log('Got updatedUser: ', updatedUser);
          done(null, updatedUser);
          return updatedUser;
        });
    }
  })
  .catch((err) => {
    console.error('Error finding user:', err);
    return done(err);
  });
}));

// Serialize and Deserialize user
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  db.users.findById(id)
  .then(user => {
    done(null, user);
  })
  .catch(err => console.error(err));
});

// INITIALIZE
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log('listening ', port);
});

module.exports = app;
