if (!Array.prototype.find)
{
    Array.prototype.find = function(cb) {

        if (cb)
        {
            for (var i in this)
            {
                if (cb(this[i]))
                {
                    return this[i];
                }
            }
        }

        return null;
    };
}

var SECOND = 1000;
var MINUTE = SECOND * 60;
var HOUR = MINUTE * 60;
var DAY = HOUR * 24;
var WEEK = DAY * 7;
var MONTH = DAY * 30;
var YEAR = DAY * 365;

var _getDateMilliseconds = function (dt) {

    if (dt instanceof Date) {
        return dt.getTime();
    }
    else if (typeof (dt) === 'string') {
        try {
            var d = new Date(dt);

            return d.getTime();
        }
        catch (e) {
            console.log('Unable to parse date "' + dt + '": ' + e);
        }
    }

    return dt;
};

/**
 * This method calculates the time elapsed from the 1st date to the 2nd
* date.  The order of the dates isn't important.
*/
var getElapsedTime = function (dt1, dt2) {

    if (dt1 !== undefined && dt1 !== null &&
        dt2 !== undefined && dt2 !== null) {
        try {
            var elapsed = Math.abs(
                _getDateMilliseconds(dt1) - _getDateMilliseconds(dt2));

            if (elapsed >= YEAR) {
                return "Over 1 year ago";
            }
            else if (elapsed > MONTH) {
                return "Over 1 month ago";
            }
            else if (elapsed > WEEK) {
                return "Over 1 week ago";
            }
            else if (elapsed > DAY) {
                var days = Math.floor(elapsed / DAY);

                if (days === 1) {
                    return "Yesterday";
                }
                else {
                    return "Over " + days + " days ago";
                }
            }
            else if (elapsed > HOUR) {
                var hrs = Math.floor(elapsed / HOUR);

                if (hrs === 1) {
                    return "Over 1 hour ago";
                }
                else {
                    return "Over " + hrs + " hours ago";
                }
            }
            else if (elapsed > MINUTE) {
                var mins = Math.floor(elapsed / MINUTE);

                if (mins === 1) {
                    return "1 minute ago";
                }
                else {
                    return mins + " minutes ago";
                }
            }
            else {
                return "now";
            }
        }
        catch (e) {
            console.log("Unable to calculate elapsed time: " + e);
        }
    }

    return "";
};

var reading = false;
var lastRead = new Date(1);
var currentUser = $('#currentUser').val();

var buildUserName = function (user) {

    var nm = '';
    var sp = '';

    if (user) {
        if (user.firstName) {
            nm += sp + user.firstName;
            sp = ' ';
        }

        if (user.middleName) {
            nm += sp + user.middleName;
            sp = " ";
        }

        if (user.lastName) {
            nm += sp + user.lastName;
            sp = " ";
        }
    }

    return nm;
};

var getTweets = function () {

    if (!reading) {
        reading = true;

        $.ajax('/getTweets', {
            dataType: "json",
            data: {
                "userName": currentUser,
                "lastRead": lastRead
            },
            type: 'POST',
            error: function (jqXhr, status, err) {
                alert("Unable to read tweets: " + err);
                reading = false;
            },
            success: function (data) {

                for (var i = data.length - 1; i >= 0; i--) {
                    var li;
                    var now = new Date();

                    if (data[i].author.userName !== $('#currentUser').val()) {
                        li = $('<li class="left clearfix">' +
                            '    <span class="chat-img pull-left">' +
                            '        <img src="http://placehold.it/50/55C1E7/fff" alt="User Avatar" class="img-circle" />' +
                            '    </span>' +
                            '    <div class="chat-body clearfix">' +
                            '        <div class="header">' +
                            '            <strong class="primary-font">' +
                            '               <a href="#" onclick="loadHtml(\'/profile\', function() { loadUserProfile(\'' + data[i].author.userName + '\'); }); return false;">' +
                            '                   ' + buildUserName(data[i].author) +
                            '               </a>' +
                            '            </strong>' +
                            '            <small class="pull-right text-muted">' +
                            '                <i class="fa fa-clock-o fa-fw"></i> ' + getElapsedTime(data[i].date, now) +
                            '            </small>' +
                            '        </div>' +
                            '        <p>' +
                            '            ' + data[i].message +
                            '        </p>' +
                            '    </div>' +
                            '</li>');
                    }
                    else {
                        li = $('<li class="right clearfix">' +
                            '    <span class="chat-img pull-right">' +
                            '        <img src="http://placehold.it/50/FA6F57/fff" alt="User Avatar" class="img-circle" />' +
                            '    </span>' +
                            '    <div class="chat-body clearfix">' +
                            '        <div class="header">' +
                            '            <small class=" text-muted">' +
                            '                <i class="fa fa-clock-o fa-fw"></i>' + getElapsedTime(data[i].date, now) +
                            '            </small>' +
                            '            <strong class="pull-right primary-font">' + buildUserName(data[i].author) + '</strong>' +
                            '        </div>' +
                            '        <p>' +
                            '            ' + data[i].message +
                            '        </p>' +
                            '    </div>' +
                            '</li>');
                    }

                    $('ul.chat').prepend(li);
                }

                lastRead = new Date();
                reading = false;
            }
        });
    }
};

var sendTweet = function () {

    var textBox = $('#btn-input');

    if (textBox.val()) {
        $.ajax('/tweet', {
            data: {
                "userName": currentUser,
                "message": textBox.val()
            },
            type: "POST",
            dataType: "text",
            error: function (jqXhr, status, error) {
                alert("Unable to send tweet: " + error);
            },
            success: function (data) {
                if (data === 'ok') {
                    textBox.val('');
                    getTweets();
                }
                else {
                    alert("Unable to send tweet: " + data);
                }
            }
        });
    }

};

/**
 * Load the user profile for the specified userName
 */
var loadUserProfile = function (userName) {

    $('div#userName').text(userName);

    var profile;

    $.ajax('/profile/' + userName, {
        async: true,
        cache: false,
        dataType: 'json',
        method: 'GET',
        success: function (data) {
            loadProfileData(data);
            loadUserTweets(userName);
        },
        error: function (jqXhr, status, error) {
            alert('Unable to load profile: ' + error);
        }
    });
};

var loadProfileData = function (profile) {

    if (profile) {
        var user = profile.user;

        if (user.userName === $('#currentUser').val()) {
            // load for update
            $('input#firstName').val(user.firstName);
            $('input#middleName').val(user.middleName);
            $('input#lastName').val(user.lastName);
            $('input#firstName').show();
            $('input#middleName').show();
            $('input#lastName').show();
            $('div#firstName').hide();
            $('div#middleName').hide();
            $('div#lastName').hide();
            $('#updateProfileButton').show();
        }
        else {
            // load for display
            $('div#firstName').text(user.firstName);
            $('div#middleName').text(user.middleName);
            $('div#lastName').text(user.lastName);
            $('input#firstName').hide();
            $('input#middleName').hide();
            $('input#lastName').hide();
            $('div#firstName').show();
            $('div#middleName').show();
            $('div#lastName').show();
            $('#updateProfileButton').hide();
        }
    }

    $('#followers-div').text('');

    if (profile.followers && profile.followers.length) {
        for (var i = 0; i < profile.followers.length; i++) {
            $('#followers-div').append("<div>" + profile.followers[i].userName + "</div>");
        }
    }
    else {
        $('#followers-div').html("<strong>You don't have any followers, but <em>I</em> love you!</strong>");
    }

    $('#following-div').follower({
        following: profile.following,
        userName: profile.user.userName
    });
};

function updateProfile() {

    var firstName = $('input#firstName').val();
    var middleName = $('input#middleName').val();
    var lastName = $('input#lastName').val();
    var userName = $('#currentUser').val();

    if (firstName && lastName && userName) {
        $.ajax('/updateUser', {
            'async': true,
            'method': 'POST',
            'data': {
                "user": {
                    "userName": userName,
                    "firstName": firstName,
                    "middleName": middleName,
                    "lastName": lastName
                }
            },
            'success': function (data) {
                if (data !== 'ok') {
                    alert(data);
                }
                else {
                    alert('Update successful!');
                }
            },
            'error': function (jqXhr, status, err) {
                alert(err);
            }
        });
    }
    else {
        alert("First name, last name and user name are required");
    }
};


var loadHtml = function (url, cb) {

    $.ajax(url, {
        cache: false,
        method: 'GET',
        dataType: 'html',
        error: function (jqXhr, status, err) {
            alert('Unable to load url ' + url + ': ' + err);
        },
        success: function (html) {
            $('#appContent').html(html);

            if (cb) {
                cb();
            }
        }
    });
};

var loadUserTweets = function (userName) {
    $.ajax('/userTweets/' + userName, {

        async: true,
        method: 'get',
        dataType: 'json',
        success: function (data) {

            var now = new Date();

            for (var i = data.length - 1; i >= 0; i--) {
                var li = $('<li class="right clearfix">' +
                    '    <span class="chat-img pull-right">' +
                    '        <img src="http://placehold.it/50/FA6F57/fff" alt="User Avatar" class="img-circle" />' +
                    '    </span>' +
                    '    <div class="chat-body clearfix">' +
                    '        <div class="header">' +
                    '            <small class=" text-muted">' +
                    '                <i class="fa fa-clock-o fa-fw"></i>' + getElapsedTime(data[i].date, now) +
                    '            </small>' +
                    '            <strong class="pull-right primary-font">' + buildUserName(data[i].author) + '</strong>' +
                    '        </div>' +
                    '        <p>' +
                    '            ' + data[i].message +
                    '        </p>' +
                    '    </div>' +
                    '</li>');

                $('ul.chat').prepend(li);
            }
        },
        error: function (jqXhr, status, err) {
            alert("Unable to load user's tweets: " + err);
        }
    });
};

$(document).ready(function () {

    /**
     * Profile menu item click handler
     */
    $('#mnuProfile').on('click', function () {
        loadHtml('/profile', function () {
            loadUserProfile($('#currentUser').val());
        });
        return false;
    });

    /**
     * Settings menu item click handler
     */
    $('#mnuSettings').on('click', function () {
        loadHtml('/settings');
        return false;
    });

    $('#mnuRefresh').on('click', getTweets);
    $('#btn-chat').on('click', sendTweet);

    getTweets();

    setInterval(function () {
        getTweets();
    }, 10000);
});