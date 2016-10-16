var dao = require('../db');
var assert = require('assert');

var RETURNED_FALSE_MSG = "Completed without error, but returned false";

describe('Testing DAO', function() {

    after(function() {
        dao.close();
    });

    it('can search users', function(done) {

        dao.searchUsers('cvaughan', 's', function(err, users) {
            if (err)
                done(err);
            else
            {
                for (var user of users)
                {
                    console.dir(user);
                }
                done();
            }
        });
    });

    it('can read user tweets', function(done) {

        dao.getUserTweets('cvaughan', function(err, tweets) {
            if (err) done(err);
            else done();
        });
    });

    /*
    it('Can create follower', function(done) {

       dao.createFollower('cvaughan', 'jku', function(err, status) {
           if (err)
           {
               done(new Error("Unable to create follower: " + err));
           }
           else 
           {
               if (status)
               {
                   done();
               }
               else
               {
                   done(new Error(RETURNED_FALSE_MSG));
               }
           }
       }) ;
    });

    it('Can read tweets', function(done) {

        dao.getTweets('cvaughan', new Date(1), function(err, tweets) {

            if (err)
            {
                done(new Error(err));
            }
            else 
            {
                console.dir(tweets);
                done();
            }
        });
    });

    it('Can remove follower', function(done) {
        
        dao.deleteFollower('cvaughan', 'jku', function(err, status) {
            if (err)
           {
               done(new Error("Unable to delete follower: " + err));
           }
           else 
           {
               if (status)
               {
                   done();
               }
               else
               {
                   done(new Error(RETURNED_FALSE_MSG));
               }
           }
        });
    });

    it('Can create retweet', function(done) {

        dao.createRetweet('cvaughan', '', new Date(), 1, function(err, status) {
            if (err)
            {
                done(new Error(err));
            }
            else
            {
                if (status)
                {
                    done();
                }
                else
                {
                    done(new Error(RETURNED_FALSE_MSG));
                }
            }
        });
    });

    it('Can create tweet', function(done) {
 
        dao.createTweet('cvaughan', 'Test tweet', new Date(), function(err, status) {
            if (err)
            {
                done(new Error(err));
            }
            else
            {
                if (status)
                {
                    done();
                }
                else
                {
                    done(new Error(RETURNED_FALSE_MSG));
                }
            }
        });
    });

    it('Can create new user', function(done) {
        dao.createUser({
            userName: 'test-user' + Math.floor(Math.random() * 100000),
            firstName: 'Test',
            middleName: 'A',
            lastName: 'User',
            password: 'abc'
        }, function(err, result) {
            if (err)
            {
                done(new Error(err));
            }
            else
            {
                if (result)
                {
                    done();
                }
                else
                {
                    done(new Error(RETURNED_FALSE_MSG));
                }
            }
        });
    });

    it('Can authenticate user', function(done) {
        dao.authenticate('cvaughan', 'abc', function(err, result) {
            if (err)
            {
                done(new Error(err));
            }
            else
            {
                if (result)
                {
                    done();
                }
                else
                {
                    done(new Error(RETURNED_FALSE_MSG));
                }
            }
        });
    });

   it('Handles invalid credentials', function(done) {
        dao.authenticate('cvaugha', 'elephant', function(err, result) {
            if (err)
            {
                done(new Error(err));
            }
            else
            {
                if (result)
                {
                    done(new Error("Allowed invalid credentials"));
                }
                else
                {
                    done();
                }
            }
        });
    });
    */
});