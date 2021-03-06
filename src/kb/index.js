var Config = require("../models/meta/config.js").Config;

var util = require('util');
var db = function() { return GLOBAL.db.default; }();
var ElasticSearchClient = require('elasticsearchclient');
var slug = require('slug');

IndexConnection.indexTypes =
{
    resource : "resource"
};

//exclude a field from indexing : add "index" : "no".

IndexConnection.indexes = {
    dendro : {
        short_name : slug(db.graphUri),
        uri : db.graphUri,
        elasticsearch_mappings :
        {
           "resource" : {
                "properties" : {
                    "uri" :
                    {
                        "type" : "string",
                        "index" : "not_analyzed" //we only want exact matches, disable term analysis
                    },
                    "graph" :
                    {
                        "type" : "string",
                        "index" : "not_analyzed" //we only want exact matches, disable term analysis
                    },
                    "last_indexing_date" :
                    {
                        "type" : "string",
                        "index" : "not_analyzed" //we only want exact matches, disable term analysis
                    },
                    "descriptors" :
                    {
                        "properties" :
                        {
                            "property" :
                            {
                                "type" : "string",
                                "index" : "not_analyzed" //we only want exact matches, disable term analysis
                            },
                            "object" :
                            {
                                "type" : "string",
                                "index_options" : "offsets",
                                "analyzer" : "standard"
                            }
                        }
                    }
                }
            }
        }
    },
    dbpedia :
    {
        short_name : slug("http://dbpedia.org"),
        uri : "http://dbpedia.org"
    },
    dryad :
    {
        short_name : slug("http://dryad.org"),
        uri : "http://dryad.org"
    },
    freebase :
    {
        short_name : slug("http://freebase.org"),
        uri : "http://freebase.org"
    }
};

function IndexConnection()
{
    var self = this;
}

IndexConnection.prototype.open = function(host, port, index, callback)
{	
    var self = this;
    if (!self.client)
    {
		var util = require('util');
		
		self.client = {};
		self.host = host;
		self.port = port;

        var serverOptions = {
            host: host,
            port: port
        };

        if(Config.useElasticSearchAuth)
        {
            serverOptions.secure = Config.useElasticSearchAuth;
            serverOptions.auth = Config.elasticSearchAuthCredentials;
        }
		self.client = new ElasticSearchClient(serverOptions);

        self.index = index;
		
		callback(self);
    }
    else
    {
	    callback(self);
    }
};



IndexConnection.prototype.indexDocument = function(type, document, callback) {
    var self = this;

    if(document._id == null)
    {
        self.client.index(self.index.short_name, type, document, function(err, data)
        {
            if(!err)
            {
                var data = JSON.parse(data);
                callback(0, "Document successfully indexed" + JSON.stringify(document) + " with ID " + data._id);
            }
            else
            {
                callback(1, "Unable to index document " + JSON.stringify(document));
            }
        });
    }
    else
    {
        var id = document._id;
        delete document._id;

        self.client.update(self.index.short_name, type, id, {doc : document}, function(err, data)
        {
            if(!err)
            {
                var data = JSON.parse(data);
                callback(0, "Document successfully indexed" + JSON.stringify(document) + " with ID " + data._id);
            }
            else
            {
                callback(1, "Unable to index document " + JSON.stringify(document));
            }
        });
    }
};

IndexConnection.prototype.deleteDocument = function(documentID, type, callback)
{
    var self = this;
    if(documentID == null)
    {
        callback(null, "No document to delete");
    }

    self.client.deleteDocument(self.index.short_name,
        type,
        documentID,
        {},
        function(err, result) {
            callback(err, result);
        })
        .on('data', function(data) {
            console.log("Deleting document... data received : " + data);
        })
        .on('done', function(data) {
            callback(0, "Document with id " + documentID + " successfully deleted." + ".  result : " + JSON.stringify(data));
        })
        .on('error', function(data) {
            callback(1, "Unable to delete document " + JSON.stringify(document) + ".  error reported : " + data);
        })
        .exec();
}

IndexConnection.prototype.create_new_index = function(numberOfShards, numberOfReplicas, deleteIfExists, callback)
{
    var self = this;
    var endCallback = callback;
    var async = require('async');
    var indexName = self.index.short_name;
    
    async.waterfall([
        function(callback) {
			self.check_if_index_exists(
                function(indexAlreadyExists)
				{
                    if(indexAlreadyExists)
                    {
                        if(deleteIfExists)
                        {
                            self.delete_index(function(err)
                            {
                                if(!err)
                                {
                                    callback();
                                }
                                else
                                {
                                    console.error("Unable do delete index " + self.index.short_name + " Error returned  : " + err);
                                    callback(1);
                                }
                            });
                        }
                        else
                        {
                            endCallback(null, true);
                        }
                    }
                    else
                    {
                        callback(null);
                    }
				});
		},
		function(callback) {

			var settings = {};

			if (numberOfShards) {
                settings.number_of_shards = numberOfShards;
			}

			if (numberOfReplicas) {
                settings.number_of_replicas = numberOfReplicas;
			}

            settings.mappings = self.index.elasticsearch_mappings;

            self.client.createIndex(indexName, settings, function(err, data){
                if(!err)
                {
                    var data = JSON.parse(data);
                    if(data.error == null && data.ok == true && data.acknowledged == true)
                    {
                        endCallback(0, "Index with name " + indexName + " successfully created.");
                    }
                    else
                    {
                        var error = "Error creating index : " + JSON.stringify(data);
                        console.error(error);
                        endCallback(1, error);
                    }
                }
                else
                {
                    var error = "Error creating index : " + data;
                    console.error(error);
                    endCallback(1, error);
                }
            });
		}
	]);
};

IndexConnection.prototype.delete_index  = function (callback)
{
    var self = this;
    
    this.client.deleteIndex(self.index.short_name, function(err, data){
        var data = JSON.parse(data);
        if(data.error == null && data.ok == true && data.acknowledged == true)
        {
            callback(0, "Index with name " + self.index.short_name + " successfully deleted.");
        }
        else
        {
            var error = "Error deleting index : " + data.error;
            console.error(error);
            callback(error, result);
        }
    });
};

// according to the elasticsearch docs (see below)
// http://www.elasticsearch.org/guide/reference/api/admin-indices-indices-exists/

//ditched the original solution, ended up using this
//http://192.168.5.69:9200/_status
//from http://stackoverflow.com/questions/17426521/list-all-indexes-on-elasticsearch-server

IndexConnection.prototype.check_if_index_exists = function (callback)
{
    var self = this;
	var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
	var xmlHttp = new XMLHttpRequest();

    //var util = require('util');

	// prepare callback
	xmlHttp.onreadystatechange = function() {
		if (xmlHttp.readyState == 4) {

            if (xmlHttp.status != 200)  {
                console.log("[FATAL ERROR] Unable to contact ElasticSearch indexing service " +
                    "on remote server: "+ self.host + " running on port " + self.port + "\n Server returned status code " + xmlHttp.status);
                process.exit(1);
            }
            else
            {
                var response = JSON.parse(xmlHttp.responseText);

                if(response.indices.hasOwnProperty(self.index.short_name))
                {
                    callback(true);
                }
                else
                {
                    callback(false);
                }
            }
		}

        if (xmlHttp.status &&
            xmlHttp.status != 200)  {
            console.log("[FATAL ERROR] Unable to contact ElasticSearch indexing service " +
                "on remote server: "+ self.host + " running on port " + self.port + "\n Server returned status code " + xmlHttp.status);
            process.exit(1);
        }
	};

	var fullUrl = "http://" + self.host + ":" + self.port + "/_stats";

    console.error("Index Checker URL: "+ util.inspect(fullUrl));

	xmlHttp.open("GET", fullUrl, true);
	xmlHttp.send(null);
};

//must specify query fields and words as
//var qryObj = {
//	field : term
//}

IndexConnection.prototype.search = function(typeName,
                                            queryObject,
                                            callback)
{
    var self = this;

    self.client.search(
            self.index.short_name,
            typeName,
            queryObject)
        .on('data', function(data) {
            var data = JSON.parse(data);
            if(data.error == null)
            {
                callback(null, data);
            }
            else
            {
                var error = "Error fetching documents for query : " + JSON.stringify(queryObject) + ". Reported error : " + JSON.stringify(data);
                console.error(error);
                callback(1, error);
            }
        })
        .exec();
};

IndexConnection.prototype.moreLikeThis = function(typeName,
                                                  documentId,
                                                  params,
                                                  callback)
{
    var self = this;

    if(documentId != null)
    {
        self.client.moreLikeThis(self.index.short_name, typeName, documentId,{})
            .on('data', function(data) {
                var data = JSON.parse(data);
                if(data.error == null)
                {
                    callback(null, data);
                }
                else
                {
                    var error = "Error fetching documents similar to document with ID : " + documentId + ". Reported error : " + JSON.stringify(data);
                    console.error(error);
                    callback(1, error);
                }
            })
            .exec();
    }
    else
    {
        var error = "No documentId Specified for similarity calculation";
        console.error(error);
        callback(1, error);
    }
}


/**
 * Exports
 */

IndexConnection.prototype.transformURIintoVarName = function(uri)
{
    var transformedUri = uri.replace(/[^A-z]|[0-9]/g, "_");
    return transformedUri;
}

module.exports.IndexConnection = IndexConnection;
