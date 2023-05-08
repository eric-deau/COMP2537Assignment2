const express = require('express')
const app = express();
const session = require('express-session');
const usersModel = require('./models/w1users')
const bcrypt = require('bcrypt');
const Joi = require('joi');
const url = require('url');
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
    sessionReq.loggedUser = true
}

const signedInNavLinks = [
    { url: "/", name: "Home" },
    { url: "/members", name: "Members" },
    { url: "/logout", name: "Sign Out" },
];

const navLinks = [
    { url: "/", name: "Home" },
    { url: "/login", name: "Login" },
    { url: "/signup", name: "Sign Up" },
];

const footerLinks = [
    { url: "#", icon: "bi bi-facebook h1 text-light p-2" },
    { url: "#", icon: "bi bi-instagram h1 text-light p-2" },
    { url: "#", icon: "bi bi-twitter h1 text-light p-2" },
    { url: "https://www.twitch.tv/rakshasa_sw", icon: "bi bi-twitch h1 text-light p-2" },]

app.use(session({
    secret: process.env.SESSION_SECRET,
    store: dbStore,
    resave: true,
    saveUninitialized: false,
}));

app.use("/", (req, res, next) => {
    app.locals.navlinks = navLinks;
    app.locals.signedInNavLinks = signedInNavLinks;
    app.locals.footerLinks = footerLinks;
    app.locals.currentURL = url.parse(req.url).pathname;
    next();
});

app.get('/', async (req, res) => {
    const result = await usersModel.findOne({
        email: req.session.loggedEmail,
    });
    if (result) {
        return res.render('home', {
            isUser: req.session.loggedUser,
            isAdmin: result.type === 'administrator',
            username: req.session.loggedUsername,
        })
    } else {
        return res.render('home', {
            isUser: req.session.loggedUser,
            isAdmin: false,
            username: null,
        })
    }
});

app.get('/signup', (req, res) => {
    return res.render('signup', { error: null, isUser: req.session.loggedUser })
});

app.use(express.urlencoded({ extended: false }))
app.post('/signup', async (req, res, next) => {
    // check if email is formatted correctly
    try {
        const value = await signUpValidationSchema.validateAsync(req.body);
    } catch (err) {
        return res.render('signup', { error: err.details[0].message, isUser: req.session.loggedUser })
    }
    try {
        const result = await usersModel.findOne({
            email: req.body.email
        });
        // check if email already exists in db
        if (result?.email) {
            return res.render('signup', { error: "Email already exists", isUser: req.session.loggedUser })
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
        res.redirect('/members');
    } catch (err) {
        return res.render('signup', { error: err, isUser: req.session.loggedUser })
    }
});

// /login is endpoint method='post' is the http method
app.get('/login', (req, res) => {
    return res.render("login", { error: null, isUser: req.session.loggedUser })
});

app.use(express.urlencoded({ extended: false })) // built-in express middleware
app.post('/login', async (req, res, next) => {
    // set global variable to true
    try {
        const value = await loginValidationSchema.validateAsync(req.body);
    } catch (err) {
        return res.render('login', { error: err.details[0].message, isUser: req.session.loggedUser })
    }
    try {
        const result = await usersModel.findOne({
            email: req.body.email,
        });
        if (!req.body.email && !req.body.password) {
            return res.render('login', { error: "Please input an email and password.", isUser: req.session.loggedUser })
        }
        if (!req.body.password) {
            return res.render('login', { error: "Please input a password.", isUser: req.session.loggedUser })
        }
        if (!req.body.email) {
            return res.render('login', { error: "Please input an email.", isUser: req.session.loggedUser })
        }
        if (result) {
            if (bcrypt.compareSync(req.body.password, result?.password)) {
                setUserSessions(result, req.session, req.body);
                res.redirect('/members');
            } else {
                return res.render('login', { error: "Invalid email/password combination.", isUser: req.session.loggedUser })
            }
        } else {
            return res.render('login', { error: "Invalid email/password combination.", isUser: req.session.loggedUser })
        }
    } catch (error) {
        console.log(error)
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// only for authenticated users
const authenticatedOnly = async (req, res, next) => {
    if (!req.session.AUTHENTICATED) {
        res.status(401)
        return res.render('notAMember', { error: "You are not a member.", isUser: req.session.loggedUser, isAdmin: req.session.loggedType === 'administrator' })
    }
    try {
        const result = await usersModel.findOne({
            email: req.session.loggedEmail
        })
    } catch (error) {
        console.log('Authentication Error');
    }
    next(); // allow next route to run
}

app.get('/members', authenticatedOnly, (req, res) => {
    if (req.session.AUTHENTICATED) {
        var catPics = new Array();
        for (var i = 1; i <= 10; i++) {
            catPics.push(`images/cat${i}.jpg`);
        }
        return res.render('members.ejs', {
            username: req.session.loggedUsername,
            catPics: catPics,
            isUser: req.session.loggedUser,
            isAdmin: req.session.loggedType === 'administrator',
        });
    } else {
        return res.render('notAMember', { error: "You are not a member.", isUser: req.session.loggedUser, isAdmin: req.session.loggedType === 'administrator' })
    }
});

// only for admin users
const adminAuthorization = (req, res, next) => {
    if (req.session.loggedType === 'administrator') {
        next();
    } else {
        res.status(403)
        return res.render('notAnAdmin', { error: "You do not have access to this page.", isUser: req.session.loggedUser, isAdmin: req.session.loggedType === 'administrator' })
    }
}

app.get('/dashboard', authenticatedOnly, adminAuthorization, async (req, res) => {
    try {
        const result = await usersModel.find({})
        if (req.session.AUTHENTICATED && req.session.loggedType === 'administrator') {
            return res.render('dashboard', {
                isAdmin: req.session.loggedType === 'administrator',
                isUser: req.session.loggedUser,
                users: result,
                currentUser: req.session.loggedEmail,
            })
        } else {
            res.status(403)
            return res.render('notAnAdmin', { error: "You do not have access to this page.", isUser: req.session.loggedUser, isAdmin: req.session.loggedType === 'administrator' })
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

app.use(express.static(__dirname + "/public"));

app.get('*', (req, res) => {
    res.status(404)
    return res.render('pageNotFound', { error: "404 Page Not Found.", isUser: req.session.loggedUser, isAdmin: req.session.loggedType === 'administrator' })
});

module.exports = app;