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
    if (result) {
        return res.render('home', {
            isUser: true,
            isAdmin: result.type === 'administrator',
            isActive: "/"
        })
    } else {
        return res.render('home', {
            isUser: false,
            isAdmin: false,
            isActive: "/"
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
    } catch (err) {
        return res.render('login', { error: err.details[0].message })
    }
    try {
        const result = await usersModel.findOne({
            email: req.body.email,
        });
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
            return res.render('login', { error: "Invalid email/password combination." })
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
        const imageName = `images/cat${randomImage}.jpg`;
        return res.render('members.ejs', {
            username: req.session.loggedUsername,
            imageName: imageName,
            isUser: true,
            isAdmin: req.session.loggedType === 'administrator',
            isActive: "/members"
        });
    } else {
        return res.render('notAMember', { error: "You are not a member." })
    }
});

app.get('/dashboard', async (req, res) => {
    try {
        const result = await usersModel.find({})
        console.log(req.session.email)
        if (req.session.AUTHENTICATED && req.session.loggedType === 'administrator') {
            return res.render('dashboard', {
                isAdmin: req.session.loggedType === 'administrator',
                isUser: true,
                users: result,
                currentUser: req.session.loggedEmail,
                isActive: "/dashboard"
            })
        } else {
            return res.render('notAnAdmin', { error: "This is a secret." })
        }
    } catch (error) {
        console.log('Admin Error');
    }
});

app.post('/promoteAdmin', async (req, res) => {
    try {
        const result = await usersModel.findOne({
            _id: req.body.userId
        });
        await usersModel.updateOne({
            _id: req.body.userId
        }, {
            $set: {
                type: 'administrator'
            }
        })
        res.redirect('/dashboard')
    } catch (error) {
        console.log('Add Admin Privileges Error');
    }
});

app.post('/demoteAdmin', async (req, res) => {
    try {
        const result = await usersModel.findOne({
            _id: req.body.userId
        });
        await usersModel.updateOne({
            _id: req.body.userId
        }, {
            $set: {
                type: 'non-administrator'
            }
        })
        res.redirect('/dashboard')
    } catch (error) {
        console.log('Remove Admin Privileges Error');
    }
});

app.get('*', (req, res) => {
    res.status(404)
    return res.render('pageNotFound', { error: "404 Page Not Found." })
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