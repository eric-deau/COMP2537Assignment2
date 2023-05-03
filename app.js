const express = require('express')
const app = express();
const session = require('express-session');
const usersModel = require('./models/w1users')
const bcrypt = require('bcrypt');
const Joi = require('joi');
let ejs = require('ejs');

app.set('view engine', 'ejs');

// var MongoDBStore = require('connect-mongodb-session')(session);
var MongoStore = require('connect-mongo')

// expire time for 1 hour
const timeExpiration = 1000 * 60 * 60;

const signUpValidationSchema = Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    password: Joi.string().min(5).max(20).required(),
    email: Joi.string().email().required()
});

const loginValidationSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(5).max(20).required()
});

const dotenv = require('dotenv');
dotenv.config({});

var dbStore = MongoStore.create({
    mongoUrl: `mongodb+srv://${process.env.ATLAS_DB_USER}:${process.env.ATLAS_DB_PASSWORD}@${process.env.ATLAS_DB_HOST}/${process.env.ATLAS_DB_DATABASE}`,
    crypto: {
        secret: process.env.SESSION_COLLECTION
    }
});

const setUserSessions = (user, sessionReq, bodyReq) => {
    sessionReq.AUTHENTICATED = true;
    sessionReq.loggedEmail = bodyReq.email;
    sessionReq.cookie.maxAge = timeExpiration;
    sessionReq.loggedUsername = user.username;
    sessionReq.loggedType = user.type
}

app.use(session({
    secret: process.env.SESSION_SECRET,
    store: dbStore,
    resave: true,
    saveUninitialized: false,
}));

app.get('/', async (req, res) => {
    const result = await usersModel.findOne({
        email: req.session.loggedEmail,
    });
    if (result && result.type === 'administrator') {
        return res.render('home', {
            isUser: true,
            isAdmin: result.type === 'administrator'
        })
    } else if (result && result.type === 'non-administrator') {
        return res.render('home', {
            isUser: true,
            isAdmin: false
        })
    } else {
        return res.render('home', {
            isUser: false,
            isAdmin: false
        })
    }
});

app.get('/signup', (req, res) => {
    // res.send(cssFormInjection + signupForm);
    return res.render('signup', { error: null })
});

app.use(express.urlencoded({ extended: false }))
app.post('/signup', async (req, res, next) => {
    // check if email is formatted correctly
    try {
        const value = await signUpValidationSchema.validateAsync(req.body);
    } catch (err) {
        return res.render('signup', { error: err.details[0].message })
    }
    try {
        const result = await usersModel.findOne({
            email: req.body.email
        });
        // check if email already exists in db
        if (result?.email) {
            return res.render('signup', { error: "Email already exists" })

        }
    } catch (err) {
        return res.render('signup', { error: err })
    }
    // hash password
    const hashedPassword = bcrypt.hashSync(req.body.password, 10);
    // create new user
    try {
        const newUser = new usersModel({
            username: req.body.username,
            password: hashedPassword,
            email: req.body.email,
            type: 'non-administrator'
        });
        await newUser.save();
        setUserSessions(newUser, req.session, req.body);
        next();
    } catch (err) {
        return res.render('signup', { error: err })
    }
});

// /login is endpoint method='post' is the http method
app.get('/login', (req, res) => {
    return res.render("login", { error: null })
});

app.use(express.urlencoded({ extended: false })) // built-in express middleware
app.post('/login', async (req, res, next) => {
    // set global variable to true
    try {
        const value = await loginValidationSchema.validateAsync(req.body);
        console.log(value)
    } catch (err) {
        return res.render('login', { error: err.details[0].message })

    }
    try {
        const result = await usersModel.findOne({
            email: req.body.email,
        });
        console.log(result)
        if (!req.body.email && !req.body.password) {
            return res.render('login', { error: "Please input an email and password." })

        }
        if (!req.body.password) {
            return res.render('login', { error: "Please input a password." })

        }
        if (!req.body.email) {
            return res.render('login', { error: "Please input an email." })
        }
        if (result) {
            if (bcrypt.compareSync(req.body.password, result?.password)) {
                setUserSessions(result, req.session, req.body);
                next();
            } else {
                return res.render('login', { error: "Invalid email/password combination." })

            }
        } else {
            return res.render('login', { error: "Invalid email/password combination/" })

        }
    } catch (error) {
        console.log(error)
    }

});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.use(express.static(__dirname + "/public"));
app.get('/members', (req, res) => {
    if (req.session.AUTHENTICATED) {
        const randomImage = Math.floor(Math.random() * 10) + 1;
        const imageName = `cat${randomImage}.jpg`;
        return res.render('members.ejs', {
            username: req.session.loggedUsername,
            imageName: imageName,
            isUser: true,
            isAdmin: req.session.loggedType === 'administrator'
        });
    } else {
        return res.render('notAMember', { error: "You are not a member" })
    }
});

app.get('/dashboard', (req, res) => {
    try {
        if (req.session.AUTHENTICATED && req.session.loggedType === 'administrator') {
            return res.render('dashboard', { isAdmin: true })
            // res.send(
            //     cssFormInjection + `
            //     <div class="container">
            //         <h1> Welcome to the Dashboard ${req.session.loggedUsername} </h1>
            //         <a class="button" type="button" href="/"> Go to Home </a>
            //         <a class="button" type="button" href="/logout"> Logout </a>
            //     </div>
            // `);
        } else {
            return res.render('dashboard', { isAdmin: false })
            // res.send(cssFormInjection + `
            // <div class="container">
            //     <h1> You are not an administrator </h1>
            //     <a class="button" type="button" href="/"> Go to Home </a>
            // </div>
            // `);
        }
    } catch (error) {
        console.log('Admin Error');
    }
});

app.get('*', (req, res) => {
    res.status(404)
    return res.render('pageNotFound', { error: true })
    // res.send(`<h1> 404 Page Not Found </h1>
    // <br>
    // <a href="/"> Go to Home </a>`);
});

// only for authenticated users
const authenticatedOnly = async (req, res, next) => {
    if (!req.session.AUTHENTICATED) {
        console.log('Authentication', req.session.AUTHENTICATED)
        return res.status(401).json({ msg: 'You are not authenticated' });
    }
    try {
        const result = await usersModel.findOne({
            email: req.session.loggedEmail
        })
        if (result?.type != 'administrator') {
            res.redirect('/members')
        } else {
            res.redirect('/dashboard')
        }
    } catch (error) {
        console.log('Authentication Error');
    }
    next(); // allow next route to run
}
app.use(authenticatedOnly);

module.exports = app;