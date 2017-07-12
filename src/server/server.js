const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const axios = require('axios');
const mongoose = require('mongoose');

const app = express();
const DIST = path.resolve(__dirname, '../../dist');

// For testing API locally
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Origin, X-Requested-With, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.header('Access-Control-Allow-Credentials', true);
  next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(DIST));

/**
 *  Database
**/

mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost:27017/cards', (err) => {
  if (err) console.log('DB connection error:', err);
  else console.log('DB connection successful')
})

const User = require('./models/User');
const Card = require('./models/Card');

/**
 * Passport
**/

const passport = require('passport');
const session = require('express-session');
const LocalStrategy = require('passport-local').Strategy
const bcrypt = require('bcrypt');

const MongoStore = require('connect-mongo')(session);

app.use(session({
  secret: 'baked bread',
  resave: false,
  saveUninitialized: true,
  store: new MongoStore({ mongooseConnection: mongoose.connection })
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  done(null, user.id);
})

passport.deserializeUser((id, done) => {
  User.findOne({ _id: id }, (err, user) => {
    done(err, user);
  });
});

passport.use(new LocalStrategy((username, password, done) => {
  User.findOne({ username: username })
    .then((user) => {
      bcrypt.compare(password, user.password, (err, res) => {
        if (err) return done(err);
        if (res === false) {
          return done(null, false);
        }
        else {
          return done(null, user);
        };
      });
    })
    .catch((err) => {
      return console.log(err);
    });
}));

/**
 *  Routes
**/


// Handle logout
app.get('/logout', (req, res, next) => {
  req.logout();
  res.redirect('/');
});

// Handle register
app.post('/register', (req, res, next) => {
  User.findOne({ username: req.body.username })
    .then((user) => {
      if (user) {
        return res.redirect('/login');
      }
      else {
        const newUser = new User({
          username: req.body.username,
          password: req.body.password
        });
        // Create new user
        newUser.save((err) => {
          if (err) return next(err);
        });
      }
    })
    .catch((err) => console.log(err));
});

// Handle login
app.post('/login',
  passport.authenticate('local', {
    failureRedirect: '/login'
  }),
  (req, res) => {
    console.log(req.user, 'this login worked');
    return new Promise((resolve, reject) => {
      resolve(req.user);
    })
  }
);

// Return user info
app.get('/auth/isauth', (req, res) => {
  return res.send(req.user);
});

app.use('/api', require('./api'))

app.get('*', (req, res) => {
  res.sendFile(path.join(DIST, 'index.html'));
})

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Express server listening on port ${port}...`)
});