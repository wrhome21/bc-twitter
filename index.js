// Send back headers
// 400 on bad arguments/user error
// 500 if we screw up 


// Import file system library
var fs = require('fs-extra');

// Import Express library
var express = require('express');
var app = express();

var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

var session = require('express-session')
app.use(session({
    secret: 'currentUser',
    resave: false,
    saveUninitialized: false
}));

// Set up resources directory to server static files
app.use(express.static('resources'));

var stringUtil = require('string');

var dao = require('./db.js');

// Port constant
var port = 8080;

function readFile(fileName, encoding) {

    return new Promise(function (resolve, reject) {

        fs.readFile(fileName, encoding, function (err, contents) {
            if (err) {
                reject(err);
            }
            else {
                resolve(contents);
            }
        });
    });
};

function checkAuth(req, res, next) {
    if (!req.session.currentUser) {
        readFile('login.html', 'utf8').then(function (html) {
            res.send(html);
        });
    } else {
        next();
    }
}

function emptyIfNull(txt) {
    if (!txt)
    {
        return '';
    }
    else
    {
        return txt;
    }
}

function addCurrentUserToPage(req, html) {

    var currentUser = req.session.currentUser;

    if (currentUser)
    {
        return html.replace('%currentUser.userName%', currentUser.userName).
            replace("%currentUser.firstName%", currentUser.firstName).
            replace("%currentUser.middleName%", emptyIfNull(currentUser.middleName)).
            replace('%currentUser.lastName%', currentUser.lastName);
    }
    else
    {
        return html;
    }
}

app.get('/', checkAuth, function (req, res) {

    var out = "";

    readFile('header.html', 'utf8').then(
        function (html) {
            out +=  addCurrentUserToPage(req, html);
            return readFile('tweet-page.html', 'utf8');
        }
    ).then(
        function (html) {
            out += html;
            return readFile('footer.html', 'utf8');
        }
        ).then(
        function (html) {
            out += html;
            res.send(out);
        }
        ).catch(
        function (err) {
            console.log("Unable to send html: " + err);
        }
        );
}).get('/logout', checkAuth, function(req, res) {

    delete req.session.currentUser;
    res.redirect('/'); 

}).post('/addFollowing', function(req, res) {
    dao.createFollower(req.body.followerUserName, req.body.followingUserName, function(err, status) {
        if (err) {
            res.status(500).send(err);
        } else {
            res.send("ok");
        }
    });

}).post('/searchUser', function(req, res) {

    dao.searchUsers(req.session.currentUser.userName, req.body.searchText, function(err, users) {

        if (err)
        {
            res.status(500).send(err);
        } 
        else
        {
            res.send(users);
        }
    });

}).get('/profile', function(req, res) {

    readFile('profile.html', 'utf8').then(function(html) {
        res.send(html);
    }).catch(function(err) {
        console.log("Unable to read profile html: " + err);
        res.end();
    })

}).get('/settings', function(req, res) {

    readFile('settings.html', 'utf8').then(function(html) {
        res.send(html);
    }).catch(function(err) {
        console.log("Unable to read settings html: " + err);
        res.end();
    })

}).get('/profile/:userName', function (req, res) {

    var userName = req.params.userName;
    var profile = {};

    dao.getUser(userName, function(err, user) {

        if (err)
        {
            res.send(err);
        }
        else 
        {
            profile.user = user;

            dao.listFollowers(userName, function(err, followers) {

                if (err)
                {
                    res.send(err);
                }
                else
                {
                    profile.followers = followers;

                    dao.listFollowing(userName, function(err, following) {

                        if (err)
                        {
                            res.send(err);
                        }
                        else
                        {
                            profile.following = following;
                            res.send(profile);
                        }
                    });
                }
            });
        }

    });
}).post('/updateUser', function(req, res) {

    console.dir(req.body);

    dao.updateUser(req.body.user, function(err, status) {

        if (err)
        {
            res.send(err);
        }
        else
        {
            res.send('ok');
        }
    });

}).get('/register', function (req, res) {

    var out = "";

    readFile('register.html', 'utf8').then(
        function (html) {
            out += html;
            res.send(out);
        }
    ).catch(
        function (err) {
            console.log("Unable to send html: " + err);
            res.exd();
        }
    );
}).post('/tweet', function(req, res) {

    var un = req.body.userName;
    var m = req.body.message;
    var dt = new Date();

    dao.createTweet(un, m, dt, function(err, status) {

        if (err) 
        {
            res.send(err);
        }
        else
        {
            if (status)
            {
                res.send('ok');
            }
            else
            {
                res.send("Something weird happened on the server!");
            }
        }
    });

}).post('/getTweets', function (req, res) {

    var un = req.body.userName;
    var dt = req.body.lastRead;

    if (typeof(dt) === 'string' || typeof(dt) === 'number')
    {
        dt = new Date(dt);
    }

    if (!dt instanceof Date)
    {
        dt = null;
    }

    dao.getTweets(un, dt, function(err, tweets) {
        
        if (err)
        {
            res.send(err);
        }
        else
        {
            res.send(tweets);
        }
    });


}).post('/login', function (req, res) {

    if (stringUtil(req.body.userName).isEmpty() || stringUtil(req.body.password).isEmpty()) {
        readFile('login.html', 'utf8').then(function (html) {
            res.send(html);
        });
    } else {

        dao.authenticate(req.body.userName, req.body.password, function(err, user) {

            if (err)
            {
                res.send(err);
            }
            else
            {
                if (user)
                {
                    req.session.currentUser = user;
                }

                res.redirect('/');        
            }
        });
    }

}).get('/userTweets/:userName', function(req, res) {

    var userName = req.params.userName;

    dao.getUserTweets(userName, function(err, tweets) {
        if (err)
        {
            res.status(500).send(err);
        }
        else
        {
            res.send(tweets);
        }
    });
}).post('/register', function (req, res) {

    var nullIfEmpty = function (val) {

        console.log("val = " + val);

        if (stringUtil(val).isEmpty()) {
            return null;
        }

        return val;
    };

    var user = {
        userName: nullIfEmpty(req.body.userName),
        password: nullIfEmpty(req.body.password),
        firstName: nullIfEmpty(req.body.firstName),
        middleName: nullIfEmpty(req.body.middleName),
        lastName: nullIfEmpty(req.body.lastName)
    };

    console.dir(user);

    dao.createUser(user, function(err, success) {
        if (err) {
            res.send(err); 
        } else {
            res.redirect('/');
        }
    });
});

var server = app.listen(port, function () {
    console.log('Example app listening on port ' + port + '!');
});

// Fires when node is terminated?
//
process.on('SIGTERM', function () {
    server.close(function () {
        dao.close();
        console.log("Closed out remaining connections.");
    });
});