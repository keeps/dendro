var async = require('async');
var path = require('path');
var needle = require('needle');
var _ = require('underscore');


var Config = require("../../../../models/meta/config.js").Config;

var Descriptor = require(Config.absPathInSrcFolder("/models/meta/descriptor.js")).Descriptor
var Interaction = require(Config.absPathInSrcFolder("/models/recommendation/interaction.js")).Interaction;
var File = require(Config.absPathInSrcFolder("/models/directory_structure/file.js")).File;
var Folder= require(Config.absPathInSrcFolder("/models/directory_structure/folder.js")).Folder;
var User = require(Config.absPathInSrcFolder("/models/user.js")).User;

var DendroRecommender = require("../../dendro_recommender.js").DendroRecommender;
var DRConnection = require("../connection.js").DRConnection;
var InteractionMapper = require("../mappers/interaction_mapper.js").InteractionMapper;

exports.generate_random_interactions = function(req, res)
{
    if(req.body.how_many != null)
    {
        var howMany = req.body.how_many;
        var howManyLoops = Math.ceil(howMany / Config.recommendation.random_interactions_generation_page_size);

        var selectNRandomDescriptors = function(howMany, callback)
        {
            var randomDescriptors = [];

            Descriptor.getRandomDescriptors(req.body.included_ontologies,
                howMany,
                function(err, randomDescriptorsPage){
                    if(!err && randomDescriptorsPage.length > 0)
                    {
                        randomDescriptors = randomDescriptors.concat(randomDescriptorsPage);
                        callback(null, randomDescriptors);
                    }
                    else
                    {
                        callback(err, randomDescriptors);
                    }
                });
        };

        var selectNRandomResources = function(howMany, callback)
        {
            async.timesSeries(howMany, function(n, callback){
                var file = Math.round(Math.random());

                if(file)
                {
                    File.randomInstance(File.prefixedRDFType, function(err, file){
                        callback(err, file);
                    });
                }
                else
                {
                    Folder.randomInstance(Folder.prefixedRDFType, function(err, folder){
                        callback(err, folder);
                    });
                }
            },
            function(err, randomFilesOrFolders){
                callback(err, randomFilesOrFolders);
            });
        };

        var selectNRandomNonUniqueUsers = function(howMany, callback)
        {
            async.timesSeries(howMany, function(n, callback){
                User.randomInstance("ddr:User", function(err, user){
                    callback(err, user);
                });
            },
            function(err, users){
                callback(err, users);
            });
        };

        var generateNRandomInteractions = function(howManyToGenerate, user, callback)
        {
            async.waterfall([
                    function(callback)
                    {
                        selectNRandomDescriptors(howManyToGenerate, function(err, descriptors)
                        {
                            callback(err, descriptors);
                        });
                    },
                    function(descriptors, callback)
                    {
                        selectNRandomResources(howManyToGenerate, function(err, resources)
                        {
                            callback(err, descriptors, resources);
                        });
                    },
                    function(descriptors, resources, callback)
                    {
                        if(user != null)
                        {
                            var users = [];
                            for (var i = 0; i < howManyToGenerate; i++)
                            {
                                users.push(user);
                            }

                            callback(null, descriptors, resources, users);
                        }
                        else
                        {
                            selectNRandomNonUniqueUsers(howManyToGenerate, function(err, users)
                            {
                                callback(err, descriptors, resources, users);
                            });
                        }
                    },
                    function(descriptors, resources, users, cb)
                    {
                        async.timesSeries(howManyToGenerate, function(n, cb){
                            var interactionType = Interaction.getRandomType(req.body);
                            var descriptor = descriptors[n];
                            var resource = resources[n];
                            var user = users[n];

                            if(descriptor != null && interactionType != null && user != null && resource != null)
                            {
                                new Interaction({
                                    ddr : {
                                        performedBy : user.uri,
                                        interactionType : interactionType.key,
                                        executedOver : descriptor.uri,
                                        originallyRecommendedFor : resource.uri
                                    }
                                }, function(err, randomInteraction){
                                    if(err)
                                    {
                                        console.error("Error generating random interaction " + n + " : " + randomInteraction);
                                    }

                                    cb(err, randomInteraction);
                                });
                            }
                            else
                            {
                                console.log("Not enough random descriptors/resources/users/types to generate " + howManyToGenerate + " interactions!!!");
                                cb(1, null);
                            }
                        },
                        function(err, interactions)
                        {
                            cb(err, interactions);
                        });
                    }
                ],
                function(err, interactions)
                {
                    callback(err, interactions);
                });
        };

        var createSpecificUserArray = function(user, callback)
        {
            var valid_url = function (url)
            {
                var regexp = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
                return regexp.test(url);
            };

            if (user != null && valid_url(user))
            {
                User.findByUri(user, function (err, user)
                {
                    if (err)
                    {
                        console.error("Unable to fetch user with uri " + user);
                    }

                    callback(err, user);
                });
            }
            else
            {
                callback(null, null);
            }
        };

        var saveInteractions = function(interactionsArray, callback)
        {
            async.map(
                interactionsArray,
                function(interaction, cb){
                    interaction.save(function(err, interaction){
                        if(!err)
                        {
                            //console.log("Interaction " + interaction.uri + " saved successfully.");
                        }
                        else
                        {
                            console.error("Error saving interaction " + interaction.uri + " .");
                        }

                        cb(err, interaction);
                    });
                },
                function(err, results){
                    callback(err, results);
                });
        };

        var generateInteractionsInLoop = function(howMany, howManyLoops, user, callback)
        {
            async.timesSeries(howManyLoops,
                function(n, callback)
                {
                    var howManyInLoop;

                    if (n < howManyLoops - 1)
                    {
                        howManyInLoop = Config.recommendation.random_interactions_generation_page_size;
                    }
                    else
                    {
                        howManyInLoop = howMany % Config.recommendation.random_interactions_generation_page_size;
                        if(howManyInLoop == 0)
                        {
                            howManyInLoop = Config.recommendation.random_interactions_generation_page_size;
                        }
                    }

                    generateNRandomInteractions(howManyInLoop, user, function(err, interactions) {
                        if(!err)
                        {
                            saveInteractions(interactions, function(err, results){
                                if(!err)
                                {
                                    console.log("[Loop " + n + " of "+ howManyLoops + "] : Generated " + howManyInLoop + " interactions ");
                                }
                                else
                                {
                                    console.error("Error saving " + results.length + " random interactions to the database: " + results);
                                }

                                callback(null);
                            });
                        }
                        else
                        {
                            console.error("Error generating " + howManyInLoop + " Interactions in loop number " + n + " : " + interactions);
                            callback(null, interactions);
                        }
                    });

                },
                function(err)
                {
                    callback(err);
                }
            );
        };

        console.log("Generating " + howMany + " random interactions with the system in " + howManyLoops + " loops of " + Config.recommendation.random_interactions_generation_page_size + " interactions.");

        async.waterfall([
                function(callback)
                {
                    createSpecificUserArray(req.body.user, callback);
                },
                function(user, callback)
                {
                    generateInteractionsInLoop(howMany, howManyLoops, user, callback);
                }],
            function(err)
            {
                if(!err)
                {
                    res.json({
                        result : "ok",
                        message : howMany + " interactions successfully sent to the Dendro Recommender system"
                    });

                }
                else
                {
                    console.error("Error generating random interactions!");

                    res.status(500).json({
                        result : "error",
                        message : "Error generating random interactions to push to the recommender system: " + err
                    });
                }
            });
    }
    else
    {
        res.status(500).json({
            result : "error",
            message : "Missing 'how_many' parameter at the root of the JSON object sent in the POST body"
        });
    }
};

exports.refresh_interactions = function(req, res)
{
    /**
     * Push all interactions
     */

    var now = new Date();
    var path = require('path');
    var appDir = path.dirname(require.main.filename);

    var dumpFileName = path.join(appDir, "temp", "interaction_dumps", now.toISOString() + ".txt");

    if(req.params.starting_instant_in_iso_format == null)
    {
        var fs = require('fs');
        var stream = fs.createWriteStream(dumpFileName);
        stream.once('open', function(fd) {

            stream.write("[");

            Interaction.all(
                function (err, interactions, callback)
                {
                    if (!err)
                    {
                        sendInteractionsArray(req, res, conn, interactions, function(err, result){
                            if(!err)
                            {
                                callback(err, result);
                            }
                            else
                            {
                                console.log("Error sending a page to Dendro Recommender " + result);
                            }
                         });
                    }
                    else
                    {
                        return res.status(500).json({
                            result: "error",
                            messages: ["Dendro Recommender is active but there were errors deleting all existing facts. Error reported: ", body.message]
                        });
                    }
                }, true);

            var conn = new DRConnection();

            conn.init(function(err, result)
            {
                if (!err)
                {
                    conn.send("DELETE", {}, "/facts/all", function (err, result, body)
                    {
                        if (!err)
                        {

                        }
                        else
                        {
                            res.status(500).json({
                                result: "error",
                                message: "Unable to fetch interactions to push to the recommender system."
                            });
                        }
                    });
                }
                else
                {
                    return res.status(500).json({
                        result: "error",
                        title : "No connection to Dendro Recommender",
                        messages: ["Unable to establish a connection to the specified Dendro Recommender instance. Check the instance status or the configuration file."]
                    });
                }
            });
            stream.end();
        });
    }
    /**
     * Push interactions that occurred after a certain date
     */
    else
    {
        //TODO filter interactions by date and send them to the Dendro Recommender system.
    }
};

exports.by_user = function(req, res)
{
    var username = req.params["username"];
    var currentUser = req.session.user;
    var acceptsHTML = req.accepts('html');
    var acceptsJSON = req.accepts('json');

    if(!username)
    {
        username = currentUser.uri;
    }

    /**
     * normal users can only access their own information, admins
     * can access information of all users
     */
    if(req.params.username == username || currentUser.isOfClass("ddr:Administrator"))
    {
        if(acceptsJSON && !acceptsHTML)  //will be null if the client does not accept html
        {
            User.findByUsername(username, function(err, user){
                if(!err)
                {
                    user.getInteractions(function(err, interactions){
                        if(!err)
                        {
                            var cachedDescriptors = {};
                            var getFullDescriptor = function(interaction, callback){
                                //console.log("Getting full descriptor for uri " + interaction.ddr.executedOver);
                                var cachedDescriptor = cachedDescriptors[interaction.ddr.executedOver];

                                if(cachedDescriptor != null)
                                {
                                    interaction.ddr.executedOver = cachedDescriptor;
                                    callback(0, interaction);
                                }
                                else
                                {
                                    Descriptor.findByUri(interaction.ddr.executedOver, function(err, fullDescriptor){
                                        if(!err)
                                        {
                                            if(fullDescriptor != null)
                                            {
                                                interaction.ddr.executedOver = fullDescriptor;
                                                cachedDescriptors[interaction.ddr.executedOver] = fullDescriptor;
                                                callback(0, interaction);
                                            }
                                            else //ignore invalid interactions
                                            {
                                                callback(0, null);
                                            }
                                        }
                                        else
                                        {
                                            callback(1, fullDescriptor);
                                        }
                                    });
                                }
                            };

                            var length = interactions.length;

                            console.log("Length of interactions array for user "+ user.uri +" : " + length);

                            async.map(interactions, getFullDescriptor, function(err, interactionsWithFullDescriptors){
                                if(!err)
                                {
                                    interactionsWithFullDescriptors = _.compact(interactionsWithFullDescriptors);
                                    return res.json(interactionsWithFullDescriptors);
                                }
                                else
                                {
                                    res.status(500).json({
                                        result : "Error",
                                        message : "Error retrieving descriptor information for " + interactionsWithFullDescriptors
                                    });
                                }
                            });
                        }
                        else
                        {
                            res.status(500).json({
                                result : "Error",
                                message : "Error retrieving interactions of user " + username
                            });
                        }
                    });
                }
                else
                {
                    res.status(404).json({
                        result : "Error",
                        message : "Unable to find user " + username
                    });
                }
            });
        }
        else
        {
            var ejs = require('ejs');

            DendroRecommender.renderView(res, "interactions", {
                user : req.session.user,
                title : "Interactions recorded in the system"
            });
        }
    }
    else
    {
        if(acceptsJSON && !acceptsHTML)  //will be null if the client does not accept html
        {
            res.status(403).json({
                result : "Error",
                message : "You are not authorized to access information about a user different than yourself"
            });
        }
        else
        {
            req.flash('error', "Unauthorized access");
            console.log("You are not authorized to access information about a user different than yourself");
            res.redirect('/');
        }
    }
};

var sendInteractionsArray = function(req, res, conn, interactions, callback)
{
    InteractionMapper.map(interactions, function(err, mappedInteractions){
        if(!err)
        {
            conn.send("POST", mappedInteractions, "/facts/new", function (err, result, body)
            {
                if (!err)
                {
                    callback(null, result);
                    return res.json({
                        result: "ok",
                        messages : ["Interactions successfully pushed to Dendro Recommender"]
                    });
                }
                else
                {
                    if(body != null && body.message)
                    {
                        return res.status(500).json({
                            result: "error",
                            messages: ["Dendro Recommender is active but there were errors pushing the recommendations to the external system", body.message]
                        });
                    }
                    else
                    {
                        return res.status(500).json({
                            result: "error",
                            messages: ["Dendro Recommender is active but there were unknown errors pushing the recommendations to the external system"]
                        });
                    }
                }
            });
        }
        else
        {
            return res.status(500).json({
                result: "error",
                title : "Internal error",
                messages: ["Unable to map existing interactions to the Dendro Recommender's format. Error reported : " + mappedInteractions]
            });
        }
    });
};