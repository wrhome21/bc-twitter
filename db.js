// Import file system library
var fs = require('fs-extra');
var stringUtil = require('string');

// Import SQLite 3 
var sqlite3 = require("sqlite3").verbose();

function DAO(fileName, forceNew)
{
    if (!fileName)
    {
        this.fileName = ":memory:";
        this.fileExists = true;
    }
    else
    {
        this.fileName = fileName;
        this.fileExists = fs.existsSync(fileName);

        if (forceNew === true && this.fileExists)
        {
            fs.removeSync(fileName);
            this.fileExists = false;
        }

        this._initializeDatabase();
    }
}

// all DB prepare statements
DAO.INSERT_USER_PRE_STMT = "INSERT INTO user " + 
                           "(user_name, password, first_name, middle_name, last_name) " +
                           "VALUES (?, ?, ?, ?, ?)";
DAO.FIND_USER_BY_USERNAME_PRE_STMT = "SELECT rowid " +
                                     "FROM user " +
                                     "WHERE user_name = ?";
DAO.FIND_USER_BY_USERNAME_PWD_PRE_STMT = "SELECT user_name, first_name, middle_name, last_name " +
                                         "FROM user " +
                                         "WHERE user_name = ? and " +
                                         "      password = ?";
DAO.UPDATE_USER_PS = "UPDATE user " +
                     "SET first_name = ?, " +
                     "    middle_name = ?, " +
                     "    last_name = ? " +
                     "WHERE user_name = ?";
DAO.LIST_USERS_PRE_STMT = "SELECT user_name, first_name, middle_name, last_name " +
                          "FROM user " +
                          "WHERE user_name != ?";
DAO.CREATE_TWEET_PS = "INSERT INTO tweet " +
                      "(tweet_date, message, author, reply_tweet_id, retweet_tweet_id, dm_user_name) " +
                      "values (?, ?, ?, ?, ?, ?)";
DAO.CREATE_FOLLOWER_PS = "INSERT INTO user_follow " +
                         "(user_name, follower_user_name) " +
                         "VALUES (?, ?)";
DAO.LIST_FOLLOWERS_PS = "SELECT user.user_name, user.first_name, user.middle_name, user.last_name " +
                        "FROM user " +
                        "INNER JOIN user_follow ON user.user_name = user_follow.follower_user_name " +
                        "WHERE user_follow.user_name = ?";
DAO.LIST_FOLLOWING_PS = "SELECT user.user_name, user.first_name, user.middle_name, user.last_name " +
                        "FROM user " +
                        "INNER JOIN user_follow ON user.user_name = user_follow.user_name " +
                        "WHERE user_follow.follower_user_name = ?";
DAO.DELETE_FOLLOWER_PS = "DELETE FROM user_follow " +
                         "WHERE user_name = ? AND " +
                         "      follower_user_name = ?";

DAO.READ_USER_PS = "SELECT first_name, middle_name, last_name FROM user WHERE user_name = ?";

DAO.READ_TWEET_SQL = "SELECT t.tweet_id, " +
                     "       t.tweet_date, " +
                     "       t.message, " +
                     "       a.user_name AS author_user_name, " +
                     "       a.first_name AS author_first_name, " +
                     "       a.middle_name AS author_middle_name, " +
                     "       a.last_name AS author_last_name, " +
                     "       t.reply_tweet_id, " +
                     "       t.retweet_tweet_id, " +
                     "       t.dm_user_name " +
                     "FROM tweet AS t " +
                     "INNER JOIN user AS a " +
                     "  ON a.user_name = t.author "/* +
                     "LEFT OUTER JOIN tweet AS r " +
                     "  ON t.reply_tweet_id = r.tweet_id " +
                     "LEFT OUTER JOIN tweet AS rt " +
                     "  ON t.retweet_tweet_id = rt.tweet_id " +
                     "LEFT OUTER JOIN user AS dm " +
                     "  ON t.dm_user_name = dm.user_name "*/;

DAO.READ_TWEETS_PS = DAO.READ_TWEET_SQL +
                     "WHERE t.tweet_date > ? AND " +
                     "      (t.author = ? OR " +
                     "       t.author IN (SELECT user_name " +
                     "                    FROM user_follow " +
                     "                    WHERE follower_user_name = ?)) " +
                     "ORDER BY tweet_date DESC " +
                     "LIMIT 20";

DAO.READ_USER_TWEETS_PS = DAO.READ_TWEET_SQL +
                          "WHERE t.author = ? " +
                          "ORDER BY tweet_date DESC";

DAO.SEARCH_USER_PS = "SELECT user_name, first_name, middle_name, last_name " +
                     "FROM user " +
                     "WHERE (user_name LIKE $searchText OR " +
                     "       first_name LIKE $searchText OR " +
                     "       last_name LIKE $searchText) AND " +
                     "       user_name != $userName AND " +
                     "       user_name NOT IN (SELECT user_name " +
                     "                         FROM user_follow " +
                     "                         WHERE follower_user_name = $userName) " +
                     "LIMIT 5";

DAO.prototype.searchUsers = function(userName, searchText, cb) {


    if (!userName)
    {
        cb('Unable to search users: userName is required', null);
    }
    if (!searchText || searchText === '')
    {
        cb(null, []);
    }
    else
    {
        var params = {
            $searchText: '%' + searchText + '%',
            $userName: userName
        };

        this.db.all(DAO.SEARCH_USER_PS, params, function(err, rows) {
          
            if (err)
            {
                cb('Unable to search users: ' + err, null);
            }
            else
            {
                var users = [];

                for (var row of rows)
                {
                    users.push({
                        userName: row.user_name,
                        firstName: row.first_name,
                        middleName: row.middle_name,
                        lastName: row.last_name
                    });
                }

                cb(null, users);
            }
        });
    }
};
/**
 * Returns the user for the specified user name
 */
DAO.prototype.getUser = function(userName, cb) {

    if (!userName)
    {
        cb("Cannot get user: userName is require", null);
    }
    else
    {
        this.db.get(DAO.READ_USER_PS, userName, function(err, row) {

            if (err)
            {
                cb("Cannot get user: " + err, null);
            }
            else
            {
                if (!row)
                {
                    cb("Cannot get user: No user found for userName " + userName, null);
                }
                else
                {
                    cb(null, {
                        "userName": userName,
                        "firstName": row.first_name,
                        "middleName": row.middle_name,
                        "lastName": row.last_name
                    });
                }
            }
        });
    }
};
/**
 * Update the user
 */
DAO.prototype.updateUser = function(user, cb) {

    var stmt = this.db.prepare(DAO.UPDATE_USER_PS);

    console.dir(user);

    try
    {
        stmt.bind(user.firstName, user.middleName, user.lastName, user.userName);
        stmt.run(function(err, rslt) {
            if (err)
            {
                cb("Unable to update user: " + err);
            }
            else
            {
                cb(null, true);
            }
            stmt.finalize();
        });

    }
    catch (err)
    {
        cb('Unable to update user: ' + err, false);
    }
};
DAO.prototype.getUserTweets = function(userName, cb) {
    if (!userName)
    {
        cb("Cannot get tweets: userName is required", null);
    }
    else
    {
        this.db.all(DAO.READ_USER_TWEETS_PS, userName, function(err, rows) {

            if (err)
            {
                cb("Cannot get tweets: " + err, null);
            }
            else
            {
                var tweets = [];

                for (var row of rows)
                {
                    tweets.push({
                        id: row.tweet_id,
                        message: row.message,
                        date: new Date(row.tweet_date),
                        author: {
                            userName: row.author_user_name,
                            firstName: row.author_first_name,
                            middleName: row.author_middle_name,
                            lastName: row.author_last_name
                        },
                        replyId: row.reply_tweet_id,
                        retweetId: row.retweet_tweet_id,
                        directMessageAddress: row.dm_user_name
                    });
                }

                cb(null, tweets);
            }
        });
    }
};
/**
 * Returns tweets for the specified user
 * @argument userName 
 * @argument since date of last read (only returns newer tweets)
 * @argument cb callback(err, tweets)
 */
DAO.prototype.getTweets = function(userName, since, cb) {

    if (!userName)
    {
        cb("Cannot get tweets: userName is required");
    }
    else 
    {
        if (!since || !(since instanceof Date))
        {
            since = new Date(Date.now - (4 * 60 * 60 * 1000));
        }
        
        this.db.all(DAO.READ_TWEETS_PS, since, userName, userName, function(err, rows) {

            if (err)
            {
                cb("Cannot get tweets: " + err, null);
            }
            else
            {
                var tweets = [];

                for (var row of rows)
                {
                    tweets.push({
                        id: row.tweet_id,
                        message: row.message,
                        date: new Date(row.tweet_date),
                        author: {
                            userName: row.author_user_name,
                            firstName: row.author_first_name,
                            middleName: row.author_middle_name,
                            lastName: row.author_last_name
                        },
                        replyId: row.reply_tweet_id,
                        retweetId: row.retweet_tweet_id,
                        directMessageAddress: row.dm_user_name
                    });
                }

                cb(null, tweets);
            }
        });
    }
};
/**
 * cb callback(err, success);
 */
DAO.prototype.authenticate = function(userName, password, cb) {
    
    this.db.get(DAO.FIND_USER_BY_USERNAME_PWD_PRE_STMT, userName, password, function (err, row) {

        if (err) {
            cb('Unable to authenticate: ' + err, false);
        }
        else
        {
            if (row) {
                cb(null, {
                    userName: row.user_name,
                    firstName: row.first_name,
                    middleName: row.middle_name,
                    lastName: row.last_name
                });
            } else {
                cb(null, null);
            }
        }
    });   
}
/**
 * Creates a new follower relationship
 * @argument userName Person being followed
 * @argument followerUserName Person following the user's tweets
 */
DAO.prototype.createFollower = function(userName, followerUserName, cb) {
    if (!userName || !followerUserName)
    {
        cb('Unable to create follower: user name and follower user name are required', false);
    }
    else
    {
        var stmt = this.db.prepare(DAO.CREATE_FOLLOWER_PS);
        try
        {
            stmt.run(userName, followerUserName);
            cb(null, true);
        }
        catch (e)
        {
            cb('Unable to create follower: ' + e, false);
        }
        finally
        {
            stmt.finalize();
        }
    }
};
/**
 * Deletes a follower relationship
 * @argument userName Person being followed
 * @argument followerUserName Person following the user's tweets
 */
DAO.prototype.deleteFollower = function(userName, followerUserName, cb) {
    if (!userName || !followerUserName)
    {
        cb('Unable to delete follower: user name and follower user name are required', false);
    }
    else
    {
        var stmt = this.db.prepare(DAO.DELETE_FOLLOWER_PS);
        try
        {
            stmt.run(userName, followerUserName);
            cb(null, true);
        }
        catch (e)
        {
            cb('Unable to delete follower: ' + e, false);
        }
        finally
        {
            stmt.finalize();
        }
    }
};
/**
 * Returns a list of users following the specified user
 * @argument userName Person being followed
 */
DAO.prototype.listFollowers = function(userName, cb) {
    if (!userName)
    {
        cb("Unable to list followers: User name is required");
    }
    else
    {
        this.db.all(DAO.LIST_FOLLOWERS_PS, userName, function(err, rows) {
            if (err)
            {
                cb("Unable to list followers: " + err, null);
            }
            else
            {
                var users = [];

                for (var row of rows)
                {
                    users.push({
                        userName: row.user_name,
                        firstName: row.first_name,
                        middleName: row.middle_name,
                        lastName: row.last_name
                    });
                }

                cb(null, users);
            }
        });
    }
};
/**
 * Returns a list of users followed by the specified user
 * @argument userName Person following other users' tweets
 */
DAO.prototype.listFollowing = function(userName, cb) {
    if (!userName)
    {
        cb("Unable to list following: User name is required");
    }
    else
    {
        this.db.all(DAO.LIST_FOLLOWING_PS, userName, function(err, rows) {
            if (err)
            {
                cb("Unable to list following: " + err, null);
            }
            else
            {
                var users = [];

                for (var row of rows)
                {
                    users.push({
                        userName: row.user_name,
                        firstName: row.first_name,
                        middleName: row.middle_name,
                        lastName: row.last_name
                    });
                }

                cb(null, users);
            }
        });
    }
};
DAO.prototype.createDirectMessage = function(userName, message, date, tweetId, addressee, cb) {
   if (!userName || !addressee || !date || !message || !(date instanceof Date))
    {
        cb("Unable to create direct message: user name, message, date and addressee are required (and date must be a date object)", false);
    }
    else
    {
        var stmt = this.db.prepare(DAO.CREATE_TWEET_PS);

        try
        {
            stmt.run(date, message, userName, tweetId, null, addressee);
            cb(null, true);
        }
        catch (err)
        {
            cb("Unable to create direct message: " + err, false);
        }
        finally
        {
            stmt.finalize();
        }
    }
};
DAO.prototype.createReply = function(userName, message, date, tweetId, cb) {
   if (!userName || !tweetId || !date || !message || !(date instanceof Date) || typeof(tweetId) !== 'number')
    {
        cb("Unable to create reply: user name, message, date and tweet ID are required (and date must be a date object and tweet ID must be a number)", false);
    }
    else
    {
        var stmt = this.db.prepare(DAO.CREATE_TWEET_PS);

        try
        {
            stmt.run(date, message, userName, tweetId, null, null);
            cb(null, true);
        }
        catch (err)
        {
            cb("Unable to create retweet: " + err, false);
        }
        finally
        {
            stmt.finalize();
        }
    }
};
DAO.prototype.createRetweet = function(userName, message, date, tweetId, cb) {
   if (!userName || !tweetId || !date || !(date instanceof Date) || typeof(tweetId) !== 'number')
    {
        cb("Unable to create retweet: user name, date and tweet ID are required (and date must be a date object and tweet ID must be a number)", false);
    }
    else
    {
        var stmt = this.db.prepare(DAO.CREATE_TWEET_PS);

        try
        {
            stmt.run(date, message, userName, null, tweetId, null);
            cb(null, true);
        }
        catch (err)
        {
            cb("Unable to create retweet: " + err, false);
        }
        finally
        {
            stmt.finalize();
        }
    }
};
/**
 * Creates a new tweet
 * @argument userName user name
 * @argument message tweet message
 * @argument date date & time of tweet
 */
DAO.prototype.createTweet = function(userName, message, date, cb) {

    if (!userName || !message || !date || !(date instanceof Date))
    {
        cb("Unable to create tweet: user name, message, and date are required (and date must be a date object)", false);
    }
    else
    {
        var stmt = this.db.prepare(DAO.CREATE_TWEET_PS);

        try
        {
            stmt.run(date, message, userName, null, null, null);
            cb(null, true);
        }
        catch (err)
        {
            cb("Unable to create tweet: " + err, false);
        }
        finally
        {
            stmt.finalize();
        }
    }
};
/**
 * Returns a list of users
 */
DAO.prototype.listUsers = function(userName, cb) {

    if (!userName)
    {
        cb('Cannot list users: current user required', null);
    }
    else
    {
        this.db.all(DAO.LIST_USERS_PRE_STMT, userName, function(err, rows) {

            if (err)
            {
                cb("Unable to list users: " + err, null);
            }
            else
            {
                var users = [];

                for (var row of rows)
                {
                    users.push({
                        userName: row.user_name,
                        firstName: row.first_name,
                        middleName: row.middle_name,
                        lastName: row.last_name
                    });
                }

                cb(null, users);
            }
        });
    }
};

/**
 * Create user
 * @argument user User object 
 *      {
 *          userName: "",
 *          password: "",
 *          firstName: "",
 *          middleName: "",
 *          lastName: ""
 *      }
 */
DAO.prototype.createUser = function(user, cb) {

    try {
        if (!user)
        {
            throw 'User is required';
        }
        
        if (stringUtil(user.userName).isEmpty())
        {
            throw 'User.userName is required';
        }

        if (stringUtil(user.password).isEmpty())
        {
            throw 'User.password is required';
        }

        if (stringUtil(user.firstName).isEmpty())
        {
            throw 'User.firstName is required';
        }

        if (stringUtil(user.lastName).isEmpty())
        {
            throw 'User.lastName is required';
        }
    } catch (err) {
        cb(err, false);
        return;
    }

    var self = this;

    // does the user already exist?
    this.db.get(DAO.FIND_USER_BY_USERNAME_PRE_STMT, user.userName, function (err, row) {

        if (err) {
            cb('Unable to add user: ' + err, false);
            return;
        }

        if (row) {
            cb('User name is already in use', false);
            return;
        }
                
        // If not, add the user
        var stmt = self.db.prepare(DAO.INSERT_USER_PRE_STMT);
        
        stmt.run(user.userName, user.password, user.firstName, user.middleName, user.lastName);
        
        stmt.finalize();

        cb(null, true);
        return;
    });
};
/*
 * Initialize the database
 */
DAO.prototype._initializeDatabase = function() {

    if (!this.fileExists) {
        console.log("Creating DB file " + this.fileName + ".");
        fs.openSync(this.fileName, "w");
    }

    this.db = new sqlite3.Database(this.fileName);

    var self = this;

    this.db.serialize(function () {

        if (!self.fileExists) {
            var sql = fs.readFileSync("create_tables.sql", "utf8");

            self.db.exec(sql);

            var stmt = self.db.prepare(DAO.INSERT_USER_PRE_STMT);

            //Insert users
            stmt.run("cvaughan", "abc", "Chris", null, "Vaughan");
            stmt.run("jku", "abc", "Jing", null, "Ku");

            stmt.finalize();

            self.db.each("SELECT rowid AS id, user_name, password FROM user", function (err, row) {
                console.log(row.id + ": " + row.user_name + " (" + row.password + ")");
            });
        }
    });
};
/**
 * Explicitly close the database
 */
DAO.prototype.close = function() {
    if (this.db)
    {
        this.db.close();
    }
};


var dbFileName = "bc-twitter-db.sqlite";

//module.exports = new DAO(dbFileName, true);
module.exports = new DAO(dbFileName);