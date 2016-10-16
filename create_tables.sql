CREATE TABLE user
(
    user_name VARCHAR(20) NOT NULL PRIMARY KEY,
    password VARCHAR(20) NOT NULL,
    first_name VARCHAR(20),
    middle_name VARCHAR(20),
    last_name VARCHAR(20)
);

CREATE TABLE user_follow
(
    user_name VARCHAR(20) NOT NULL,
    follower_user_name VARCHAR(20) NOT NULL,
    FOREIGN KEY (user_name) REFERENCES user (user_name),
    FOREIGN KEY (follower_user_name) REFERENCES user (user_name) 
);

CREATE UNIQUE INDEX user_follow_idx
ON user_follow (user_name, follower_user_name);

CREATE TABLE tweet
(
    tweet_id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    tweet_date TIMESTAMP NOT NULL,
    message VARCHAR(140) NOT NULL,
    author VARCHAR(20) NOT NULL,
    reply_tweet_id INTEGER,
    retweet_tweet_id INTEGER,
    dm_user_name VARCHAR(20),
    FOREIGN KEY (author) REFERENCES user (user_name),
    FOREIGN KEY (dm_user_name) REFERENCES user (user_name),
    FOREIGN KEY (retweet_tweet_id) REFERENCES tweet (tweet_id),
    FOREIGN KEY (reply_tweet_id) REFERENCES tweet (tweet_id)
);

CREATE TABLE tweet_like
(
    tweet_id INTEGER NOT NULL,
    user_name VARCHAR(20),
    FOREIGN KEY (tweet_id) REFERENCES tweet (tweet_id),
    FOREIGN KEY (user_name) REFERENCES user (user_name)
);

CREATE UNIQUE INDEX tweet_like_idx
ON tweet_like (tweet_id, user_name);