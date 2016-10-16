// jQuery plugin
(function ($) {
    $.fn.follower = function (data) {
        var self = this;

        this.following = data.following;
        this.userName = data.userName;

        // building list
        this.candidates = [];

        var substringMatcher = function () {

            return function findMatches(q, cb) {

                var matches = [];

                $.ajax('/searchUser', {
                    cache: false,
                    async: false,
                    data: {
                        searchText: q
                    },
                    dataType: 'json',
                    method: 'POST',
                    success: function (data) {

                        self.candidates = data;
                        var usr = null;

                        for (var i in self.candidates) {
                            usr = self.candidates[i];
                            matches.push(usr.firstName + ' ' + usr.lastName + ' (' + usr.userName + ')');
                        }

                        cb(matches);
                    },
                    error: function (jqXhr, status, err) {
                        alert(err);
                    }
                });
            };
        };
        // end building list

        var div = $("<div class='panel panel-default' />");
        div.append('<div class="panel-heading">' +
            '<input id="btn-input" type="text" class="form-control input typeahead" placeholder="search users here..." /> ' +
            '</div>');
        div.append(" <div class='panel-body' id='following-list' />");

        $(this).append(div);

        div.find('.typeahead').typeahead({
            hint: true,
            highlight: true,
            minLength: 1
        }, {
                name: 'users',
                source: substringMatcher()
            }
        ).on("typeahead:selected", function(obj, datum, name) {
            var parts = this.value.split('(');
            var tmpName = parts[1].substring(0, parts[1].length -1);
            console.log(self.userName + ' is following ' + tmpName);

            self.addFollowing(self.userName, tmpName);
        });


        for (var i in this.following) {
            $.fn.follower.addUser(this.following[i], $(this).find('#following-list'));
        }

        console.log(data);

        this.addFollowing = function (userName, followerUserName) 
        {
            $.fn.follower.addFollowing(userName, followerUserName, self.candidates);
        };

        // this.removeFollowing = function () 
        // {
        //     $.fn.follower.removeFollowing();
        // }.bind(this);

        return this;
    };

    $.fn.follower.addUser = function (user, panel) {
        var div = $("<div class='alert alert-success alert-dismissable' />");
        div.append("<button type='button' class='close' data-dismiss='alert' aria-hidden='true'> &times; </button>");
        div.append(user.firstName + " " + user.middleName + " " + user.lastName + ' (' + user.userName + ')');
        panel.append(div);
    };

    $.fn.follower.addFollowing = function (userName, followerUserName, candidates) {
        $.ajax('/addFollowing', {
            cache: false,
            async: true,
            data: {
                followingUserName: userName,
                followerUserName: followerUserName
            },
            dataType: 'text',
            method: 'POST',
            success: function (data) {

                var user = candidates.find(function(value) {
                    return followerUserName === value.userName;
                });

                if (data === 'ok') {
                    $.fn.follower.addUser(user, $('#following-list'));
                } else {
                    alert('unexpected result from ajax call');
                }
            },
            error: function (jqXhr, status, err) {
                alert(err);
            }
        });
     };

    $.fn.follower.removeFollowing = function () { };

} (jQuery));