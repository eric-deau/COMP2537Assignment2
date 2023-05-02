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

// const cssFormInjection = `
//         <head>
//             <style media="screen">
//                 *,
//             *:before,
//             *:after{
//                 padding: 0;
//                 margin: 0;
//                 box-sizing: border-box;
//             }
//             body{
//                 background-color: #080710;
//             }
//             .background{
//                 width: 430px;
//                 height: 520px;
//                 position: absolute;
//                 transform: translate(-50%,-50%);
//                 left: 50%;
//                 top: 50%;
//             }
//             .background .shape{
//                 height: 200px;
//                 width: 200px;
//                 position: absolute;
//                 border-radius: 50%;
//             }
//             .shape:first-child{
//                 background: linear-gradient(
//                     #1845ad,
//                     #23a2f6
//                 );
//                 left: -80px;
//                 top: -80px;
//             }
//             .shape:last-child{
//                 background: linear-gradient(
//                     to right,
//                     #ff512f,
//                     #f09819
//                 );
//                 right: -30px;
//                 bottom: -80px;
//             }
//             form{
//                 height: 520px;
//                 width: 400px;
//                 background-color: rgba(255,255,255,0.13);
//                 position: absolute;
//                 transform: translate(-50%,-50%);
//                 top: 50%;
//                 left: 50%;
//                 border-radius: 10px;
//                 backdrop-filter: blur(10px);
//                 border: 2px solid rgba(255,255,255,0.1);
//                 box-shadow: 0 0 40px rgba(8,7,16,0.6);
//                 padding: 50px 35px;
//             }
//             form *{
//                 font-family: 'Poppins',sans-serif;
//                 color: #ffffff;
//                 letter-spacing: 0.5px;
//                 outline: none;
//                 border: none;
//             }
//             form h3{
//                 font-size: 32px;
//                 font-weight: 500;
//                 line-height: 42px;
//                 text-align: center;
//             }

//             label{
//                 display: block;
//                 margin-top: 30px;
//                 font-size: 16px;
//                 font-weight: 500;
//             }
//             input{
//                 display: block;
//                 height: 50px;
//                 width: 100%;
//                 background-color: rgba(255,255,255,0.07);
//                 border-radius: 3px;
//                 padding: 0 10px;
//                 margin-top: 8px;
//                 font-size: 14px;
//                 font-weight: 300;
//             }
//             ::placeholder{
//                 color: #e5e5e5;
//             }
//             button{
//                 margin-top: 50px;
//                 width: 100%;
//                 background-color: #ffffff;
//                 color: #080710;
//                 padding: 15px 0;
//                 font-size: 18px;
//                 font-weight: 600;
//                 border-radius: 20px;
//                 cursor: pointer;
//             }
//             button:hover{
//                 color: #ffffff;
//                 background: rgb(238,174,202);
//                 background: radial-gradient(circle, rgba(238,174,202,1) 0%, rgba(148,187,233,1) 100%);
//             }
//             .social{
//             margin-top: 30px;
//             display: flex;
//             }
//             .social div{
//             background: red;
//             width: 150px;
//             border-radius: 3px;
//             padding: 5px 10px 10px 5px;
//             background-color: rgba(255,255,255,0.27);
//             color: #eaf0fb;
//             text-align: center;
//             }
//             .social div:hover{
//             background-color: rgba(255,255,255,0.47);
//             }
//             .social .fb{
//             margin-left: 25px;
//             }
//             .social i{
//             margin-right: 4px;
//             }
//             h1 {
//                 color: #ffffff;
//                 font-size: 50px;
//                 text-align: center;
//                 margin-top: 50px;
//             }
//             a {
//                 color: #ffffff;
//                 font-size: 20px;
//                 text-align: center;
//                 margin-top: 50px;
//                 text-decoration: none;
//             }
//             a:hover {
//                 color: #ffffff;
//                 background: rgb(238,174,202);
//                 background: radial-gradient(circle, rgba(238,174,202,1) 0%, rgba(148,187,233,1) 100%);
//             }
//             .container {
//                 margin-top: 50px;
//                 display: flex;
//                 flex-direction: column;
//                 justify-content: center;
//                 align-items: center;
//             }
//             .button {
//                 margin-top: 50px;
//                 width: 100%;
//                 background-color: #ffffff;
//                 color: #080710;
//                 padding: 15px 0;
//                 font-size: 18px;
//                 font-weight: 600;
//                 border-radius: 20px;
//                 cursor: pointer;
//             }
//             img {
//                 margin-top: 50px;
//             }


//     </style>
//         </head>
//         `

// const loginForm = `
// <div class="background">
// <div class="shape"></div>
// <div class="shape"></div>
// </div>
// <form action="/login" method="post">
// <input type="text" name="email" placeholder="email" />
// <br>
// <input type="password" name="password" placeholder="password" />
// <br>
// <button type="submit">Login</button>
// </form>
// <br>
//                 `

// const signupForm = `
// <div class="background">
// <div class="shape"></div>
// <div class="shape"></div>
// </div>
// <div class="container">
//     <form action="/signup" method="post">
//     <input type="text" name="username" placeholder="username" />
//     <br>
//     <input type="password" name="password" placeholder="password" />
//     <br>
//     <input type="email" name="email" placeholder="email" />
//     <br>
//     <button type="submit">Sign Up</button>
//     </form>
//     <br>                   
// </div>
//             `

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
        res.send("hello")
        // res.send(cssFormInjection + `
        // <div class="container">
        //     <h1> Home Page </h1>
        //     <br>
        //     <a class="button" href="/members" type="button"> Go to Members </a>
        //     <br>
        //     <a class="button" href="/logout" type="button"> Logout </a>
        // </div>
        // `);
    } else {
        res.send("hello")
        // res.send(cssFormInjection + `
        //     <div class="container">
        //         <h1> Login Page </h1>
        //         <br>
        //         <a class="button" href= "/signup" type="button"> Sign Up </a>
        //         <br>
        //         <a class="button" href= "/login" type="button"> Login </a>
        //     </div>`);
    }
});

app.get('/signup', (req, res) => {
    // res.send(cssFormInjection + signupForm);
    res.render('signup', { error: null })
});

app.use(express.urlencoded({ extended: false }))
app.post('/signup', async (req, res, next) => {
    // check if email is formatted correctly
    try {
        const value = await signUpValidationSchema.validateAsync(req.body);
    } catch (err) {
        // return res.send(`<h1>${err.details[0].message}</h1>` + cssFormInjection + signupForm);
        res.render('signup', { error: err.details[0].message })
    }
    try {
        const result = await usersModel.findOne({
            email: req.body.email
        });
        // check if email already exists in db
        if (result?.email) {
            // return res.send(`<h1>Email already exists</h1>` + cssFormInjection + signupForm);
            res.render('signup', { error: "Email already exists" })

        }
    } catch (err) {
        // return res.send(`<h1>${err}</h1>` + cssFormInjection + signupForm);
        res.render('signup', { error: err })
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
        // return res.send(`<h1>${err}</h1>` + cssFormInjection + signupForm);
        res.render('signup', { error: err })
    }
});

// /login is endpoint method='post' is the http method
app.get('/login', (req, res) => {
    // res.send(cssFormInjection + loginForm);
    res.render("login", { error: null })
});

app.use(express.urlencoded({ extended: false })) // built-in express middleware
app.post('/login', async (req, res, next) => {
    // set global variable to true
    try {
        const value = await loginValidationSchema.validateAsync(req.body);
    } catch (err) {
        // return res.send(`<h1>${err.details[0].message}</h1>` + cssFormInjection + loginForm);
        res.render('login', { error: err.details[0].message })

    }
    try {
        const result = await usersModel.findOne({
            email: req.body.email,
        });
        if (!req.body.email && !req.body.password) {
            // return res.send(`<h1>Please input an email and password.</h1>` + cssFormInjection + loginForm);
            res.render('login', { error: "Please input an email and password." })

        }
        if (!req.body.password) {
            // return res.send(`<h1>Please input a password.</h1>` + cssFormInjection + loginForm);
            res.render('login', { error: "Please input a password." })

        }
        if (!req.body.email) {
            // return res.send(`<h1>Please input an email.</h1>` + cssFormInjection + loginForm);
            res.render('login', { error: "Please input an email." })
        }
        if (result) {
            if (bcrypt.compareSync(req.body.password, result?.password)) {
                setUserSessions(result, req.session, req.body);
                next();
            } else {
                // return res.send(`<h1>Invalid email/password combination.</h1>` + cssFormInjection + loginForm);
                res.render('login', { error: "Invalid email/password combination." })

            }
        } else {
            // return res.send(`<h1>Invalid email/password combination.</h1>` + cssFormInjection + loginForm);
            res.render('login', { error: "Invalid email/password combination/" })

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
        res.render('members.ejs', {
            isMember: req.session.loggedType === 'non-administrator',
            username: req.session.loggedUsername,
            imageName: imageName
        });
        // res.send(cssFormInjection + `
        // <div class="container">
        //     <h1> Welcome back, ${req.session.loggedUsername}! </h1>
        //     <img src="${imageName}" alt="cat" style="width:250px; height: 250px;"/>
        //     <a class="button" type="button" href="/"> Go to Home </a>
        //     <a class="button" type="button" href="/logout"> Logout </a>
        // </div>
        // `);
    } else {
        res.render('notAMember', { error: "You are not a member" })
        // res.send(cssFormInjection + `
        // <div class="container">
        //     <h1> You are not a member </h1>
        //     <a class="button" type="button" href="/"> Go to Home </a>
        // </div>
        // `);
    }
});

app.get('/dashboard', (req, res) => {
    try {
        if (req.session.AUTHENTICATED && req.session.loggedType === 'administrator') {
            res.send("hello")
            // res.send(
            //     cssFormInjection + `
            //     <div class="container">
            //         <h1> Welcome to the Dashboard ${req.session.loggedUsername} </h1>
            //         <a class="button" type="button" href="/"> Go to Home </a>
            //         <a class="button" type="button" href="/logout"> Logout </a>
            //     </div>
            // `);
        } else {
            res.send("hello")
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
    res.send("hello")
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