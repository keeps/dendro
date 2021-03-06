var Config = require('../models/meta/config.js').Config;

var User = require(Config.absPathInSrcFolder("/models/user.js")).User;
var DbConnection = require(Config.absPathInSrcFolder("/kb/db.js")).DbConnection;

var db = function() { return GLOBAL.db.default; }();
var gfs = function() { return GLOBAL.gfs.default; }();

var async = require('async');
var _ = require('underscore');

/*
 * GET users listing.
 */

exports.all = function(req, res){

    var viewVars = {
        title : 'Researchers in the knowledge base'
    };

    viewVars = DbConnection.paginate(req,
        viewVars
    );

    User.all(function(err, users)
    {
        if(!err)
        {
            viewVars.users = users;

            res.render('users/all',
                viewVars
            );
        }
        else
        {
            viewVars.error_messages = [users];
            res.render('users/all',
                viewVars
            );
        }
    });
};

exports.show = function(req, res){
    var username = req.params["username"];

    User.findByUsername(username, function(err, user)
    {
        if(err == null)
        {
            res.render('users/show',
                {
                    title : "Viewing user " + username,
                    user : user
                }
            )
        }
        else
        {
            res.render('users/all',
                {
                    title : "Researchers",
                    error_messages :
                        [
                            "Unable to retrieve information for user " + username ,
                            err
                        ]
                }
            );
        }
    });
};

exports.me = function(req, res){
    req.params.user = req.session.user;

    if(req.originalMethod == "GET")
    {
        res.render('users/edit',
            {
                user : req.session.user
            }
        );
    }
    else if (req.originalMethod == "POST")
    {
        //perform modifications

        res.render('users/edit',
            {
                user : req.session.user
            }
        );
    }
};

exports.set_new_password = function(req, res) {

    if (req.originalMethod == "GET") {

        var email = req.query["email"];
        var token = req.query["token"];

        if(email == null || token == null)
        {
            res.render('index',
                {
                    info_messages : ["Invalid request."]
                }
            );
        }
        else
        {
            User.findByEmail(email, function(err, user){
                if(!err)
                {
                    if(!user)
                    {
                        res.render('index',
                            {
                                error_messages : ["Non-existent user with email " + email + " : " + JSON.stringify(user)]
                            }
                        );
                    }
                    else
                    {
                        user.checkIfHasPredicateValue("ddr:password_reset_token", token, function(err, tokenMatches){
                            if(!err)
                            {
                                if(tokenMatches)
                                {
                                    res.render('users/set_new_password',
                                        {
                                            email : email,
                                            token : token
                                        }
                                    );
                                }
                                else
                                {
                                    res.render('index',
                                        {
                                            error_messages : ["Invalid token"]
                                        }
                                    );
                                }
                            }
                            else
                            {
                                res.render('index',
                                    {
                                        error_messages : ["Error retrieving token : " + JSON.stringify(user)]
                                    }
                                );
                            }
                        });

                    }
                }
                else
                {
                    res.render('index',
                        {
                            error_messages : ["Error retrieving user with email " + email + " : " + JSON.stringify(user)]
                        }
                    );
                }
            });
        }
    }
    else if (req.originalMethod == "POST")
    {
        var email = req.body["email"];
        var token = req.body["token"];

        if (token == null || email == null) {
            res.render('users/set_new_password',
                {
                    token : token,
                    email : email,
                    "error_messages": [
                        "Wrong link specified."
                    ]
                }
            );
        }
        else
        {
            var new_password = req.body["new_password"];
            var new_password_confirm = req.body["new_password_confirm"];

            if(new_password != new_password_confirm)
            {
                res.render('users/set_new_password',
                    {
                        token : token,
                        email : email,
                        error_messages : [
                            "Please make sure that the password and its confirmation match."
                        ]
                    }
                );
            }
            else
            {
                User.findByEmail(email, function(err, user){
                    if(!err)
                    {
                        if(!user)
                        {
                            res.render('index',
                                {
                                    "error_messages" :
                                        [
                                            "Unknown account with email " + email + "."
                                        ]
                                }
                            );
                        }
                        else
                        {
                            user.finishPasswordReset(new_password, token, function(err, result)
                            {
                                if(err)
                                {
                                    res.render('index',
                                        {
                                            "error_messages" :
                                                [
                                                    "Error resetting password for email : " + email +". Error description: " + JSON.stringify(result)
                                                ]
                                        }
                                    );
                                }
                                else
                                {
                                    res.render('index',
                                        {
                                            "info_messages" :
                                                [
                                                    "Password successfully reset for : " + email +". You can now login with your new password."
                                                ]
                                        }
                                    );
                                }
                            });
                        }
                    }
                });
            }
        }
    }
};

exports.reset_password = function(req, res){

    if(req.originalMethod == "GET")
    {
        res.render('users/reset_password',
            {
            }
        );
    }
    else if (req.originalMethod == "POST")
    {
        var email = req.body["email"];
        if(email != null)
        {
            User.findByEmail(email, function(err, user){
                if(!err)
                {
                    if(!user)
                    {
                        res.render('users/reset_password',
                            {
                                "error_messages" :
                                    [
                                        "Unknown account with email " + email + "."
                                    ]
                            }
                        );
                    }
                    else
                    {
                        user.startPasswordReset(function(err, result)
                        {
                            if(err)
                            {
                                res.render('index',
                                    {
                                        "error_messages" :
                                            [
                                                "Error resetting password for email : " + email +". Error description: " + JSON.stringify(result)
                                            ]
                                    }
                                );
                            }
                            else
                            {
                                res.render('index',
                                    {
                                        "info_messages" :
                                            [
                                                "Password reset instructions have been sent to : " + email +"."
                                            ]
                                    }
                                );
                            }
                        });
                    }
                }
            });
        }
        else
        {
            res.render('users/reset_password',
                {
                    "error_messages" :
                        [
                            "Please specify a valid email address"
                        ]
                }
            );
        }
    }
};