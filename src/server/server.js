const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const axios = require('axios');
const mongoose = require('mongoose');
const expressJWT = require('express-jwt');
const jwt = require('jsonwebtoken');

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
 * User Auth
**/
app.use(expressJWT({ secret: 'bakedbread 5 ever' }).unless({path:['/login', '/register']}));

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
        })
        .then((data) => {
          return res.json(newUser);
        })
        .catch(err => console.log(err));
      }
    })
    .catch((err) => console.log(err));
});

// Handle login
app.post('/login', (req, res) => {
  if (!req.body.username || !req.body.password) {
    return res.status(400).send('Username and/or password required');
  }
  User.findOne({username: req.body.username})
  .then((user) => {
    user.comparePassword(req.body.password, (err, isMatch) => {
      if (err) return console.log(err);
      if (!isMatch) {
        return res.status(401).send('Invalid password');
      }
      else {
        const myToken = jwt.sign({username: req.body.username}, 'bakedbread 5 ever')
        return res.status(200).json(myToken);
      }
    })
  })
});

// Return user info
app.get('/auth/isauth', (req, res) => {
    return res.send(req.user);
  });

// API routes
app.use('/api', require('./api'))

app.get('*', (req, res) => {
  res.sendFile(path.join(DIST, 'index.html'));
})

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Express server listening on port ${port}...`)
});