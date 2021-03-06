/**
 * Configuration parameters
 */

function Config (){}

var fs = require('fs');
var path = require('path');
var appDir = path.resolve(path.dirname(require.main.filename), "..");

var configs_file_path = path.join(appDir, "conf", "deployment_configs.json");
var active_config_file_path = path.join(appDir, "conf", "active_deployment_config.json");

var configs = JSON.parse(fs.readFileSync(configs_file_path, 'utf8'));
var active_config_key = JSON.parse(fs.readFileSync(active_config_file_path, 'utf8')).key;
var active_config = configs[active_config_key];

var getConfigParameter = function(parameter)
{
    if(active_config[parameter] == null)
    {
        console.error("[FATAL ERROR] Unable to retrieve parameter " + parameter + " from \'"+active_config_key + "\' configuration. Please review the deployment_configs.json file.");
        process.exit(1);
    }
    else
    {
        return active_config[parameter];
    }
};

// hostname for the machine in which this is running, configure when running on a production machine
Config.port = getConfigParameter("port");
Config.host = getConfigParameter("host");
Config.baseUri = getConfigParameter("baseUri");
Config.eudatBaseUrl = getConfigParameter("eudatBaseUrl");
Config.eudatToken = getConfigParameter("eudatToken");
Config.sendGridUser = getConfigParameter("sendGridUser");
Config.sendGridPassword = getConfigParameter("sendGridPassword");

Config.elasticSearchHost =  getConfigParameter("elasticSearchHost");
Config.elasticSearchPort =  getConfigParameter("elasticSearchPort");

Config.cache =  getConfigParameter("cache");

Config.virtuosoHost =  getConfigParameter("virtuosoHost");
Config.virtuosoPort =  getConfigParameter("virtuosoPort");

Config.virtuosoAuth = getConfigParameter("virtuosoAuth");

//maps
Config.maps =  getConfigParameter("maps");

//change log config
Config.change_log =  parseInt(getConfigParameter("change_log"));

//mongodb cluster used for file storage
Config.mongoDBHost =  getConfigParameter("mongoDBHost");
Config.mongoDbPort =  getConfigParameter("mongoDbPort");
Config.mongoDbCollectionName =  getConfigParameter("mongoDbCollectionName");
Config.mongoDbVersion =  getConfigParameter("mongoDbVersion");
Config.mongoDBAuth = getConfigParameter("mongoDBAuth");

//mysql database for interaction

Config.mySQLHost =  getConfigParameter("mySQLHost");
Config.mySQLPort =  getConfigParameter("mySQLPort");
Config.mySQLAuth = getConfigParameter("mySQLAuth");
Config.mySQLDBName = getConfigParameter("mySQLDBName");

//file uploads and downloads

Config.maxUploadSize = getConfigParameter("maxUploadSize");   //1000MB®
Config.maxProjectSize = getConfigParameter("maxProjectSize");   //10000MB®
Config.maxSimultanousConnectionsToDb = getConfigParameter("maxSimultanousConnectionsToDb");
Config.dbOperationTimeout = getConfigParameter("dbOperationTimeout");
Config.tempFilesDir = getConfigParameter("tempFilesDir");
Config.tempFilesCreationMode = getConfigParameter("tempFilesCreationMode");

Config.administrators = getConfigParameter("administrators");

// load debug and startup settings
Config.debug = getConfigParameter("debug");
Config.startup = getConfigParameter("startup");
Config.baselines = getConfigParameter("baselines");

//load logger options
Config.logging = getConfigParameter("logging");

//load version description
Config.version = getConfigParameter("version");

//load recommendation settings
Config.recommendation = getConfigParameter("recommendation");
Config.recommendation.getTargetTable = function()
{
    if(Config.recommendation.modes.dendro_recommender.log_modes.phase_1.active)
    {
        var targetTable = Config.recommendation.modes.dendro_recommender.log_modes.phase_1.table_to_write_interactions;
    }
    else if(Config.recommendation.modes.dendro_recommender.log_modes.phase_2.active)
    {
        var targetTable = Config.recommendation.modes.dendro_recommender.log_modes.phase_2.table_to_write_interactions;
    }

    return targetTable;
};

/**
 * Database connection (s).
 * @type {{default: {baseURI: string, graphName: string, graphUri: string}}}
 */

Config.initGlobals = function()
{
    GLOBAL.db = {
        default : {
            baseURI : "http://"+Config.host,
            graphHandle : "dendro_graph",
            graphUri : "http://"+Config.host+"/dendro_graph"
        },
        social : {
            baseURI : "http://"+Config.host,
            graphHandle : "social_dendro",
            graphUri : "http://"+Config.host+"/social_dendro"
        }
    };

    GLOBAL.gfs = {
        default : {

        }
    };

    GLOBAL.mysql = {
        default : {

        }
    };

    GLOBAL.redis = {
        default : {

        }
    };

    var Elements = require('./elements.js').Elements;

    GLOBAL.allOntologies = {
        dcterms :
        {
            prefix : "dcterms",
            uri : "http://purl.org/dc/terms/",
            elements : Elements.dcterms,
            label : "Dublin Core terms",
            description : "Generic description. Creator, title, subject...",
            domain : "Generic",
            domain_specific : false
        },

        foaf:
        {
            prefix : "foaf",
            uri : "http://xmlns.com/foaf/0.1/",
            elements : Elements.foaf,
            label : "Friend of a friend",
            description : "For expressing people-related metadata. Mailbox, web page...",
            domain : "Generic",
            domain_specific : false
        },

        ddr:
        {
            prefix : "ddr",
            uri : "http://dendro.fe.up.pt/ontology/0.1/",
            private : true,
            elements : Elements.ddr,
            label : "Dendro internal ontology",
            description : "Designed to represent internal system information important to Dendro",
            domain : "Generic",
            domain_specific : false
        },

        rdf:
        {
            prefix : "rdf",
            uri : "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
            private : true,
            elements : Elements.rdf,
            label : "Resource Description Framework",
            description : "Low-level technical ontology. It is the building block of all others.",
            domain : "Low-level, System",
            domain_specific : false
        },

        nie :
        {
            prefix : "nie",
            uri : "http://www.semanticdesktop.org/ontologies/2007/01/19/nie#",
            private : true,
            elements : Elements.nie,
            label : "Nepomuk Information Element",
            description : "Ontology for representing files and folders. Information Elements",
            domain : "Low-level, System",
            domain_specific : false
        },

        nfo :
        {
            prefix : "nfo",
            uri : "http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#",
            private : true,
            elements : Elements.nfo,
            label : "Nepomuk File Ontology",
            description : "Ontology for representing files and folders. Files and Folders.",
            domain : "Low-level, System",
            domain_specific : false
        },
        research :
        {
            prefix : "research",
            uri : "http://dendro.fe.up.pt/ontology/research/",
            elements : Elements.research,
            label : "Dendro research",
            description : "Experimental research-related metadata. Instrumentation, method...",
            domain : "Generic",
            domain_specific : true
        },
        dcb :
        {
            prefix : "dcb",
            uri : "http://dendro.fe.up.pt/ontology/dcb/",
            elements : Elements.dcb,
            label : "Double Cantilever Beam",
            description : "Fracture mechanics experiments. Initial crack length, Material type...",
            domain : "Mechanical Engineering",
            domain_specific : true
        },
        achem :
        {
            prefix : "achem",
            uri : "http://dendro.fe.up.pt/ontology/achem/",
            elements : Elements.achem,
            label : "Pollutant analysis",
            description : "Analytical Chemistry experimental studies... Analysed substances, Sample count...",
            domain : "Analytical Chemistry",
            domain_specific : true
        },
        bdv :
        {
            prefix : "bdv",
            uri : "http://dendro.fe.up.pt/ontology/BIODIV/0.1#",
            elements : Elements.bdv,
            label : "Biodiversity evolution studies",
            description : "For INSPIRE-represented observational data for biodiversity. Reference system identifier, Metadata point of contact...",
            domain : "Biodiversity, Georeferencing",
            domain_specific : true
        },
        biocn :
        {
            prefix : "biocn",
            uri : "http://dendro.fe.up.pt/ontology/BioOc#",
            elements : Elements.biocn,
            label : "Biological Oceanography",
            description : "Biological Oceanography observational and experimental studies...Life stage, Species count, individualPerSpecie...",
            domain : "Biological Oceanography",
            domain_specific : true
        },
        grav:
        {
            prefix: "grav",
            uri: "http://dendro.fe.up.pt/ontology/gravimetry#",
            elements: Elements.grav,
            label: "Gravimetry",
            description: "Gravimetry observational and experimental studies...Altitude resolution; Beginning time...",
            domain: "Gravimetry",
            domain_specific: true
        },
        hdg:
        {
            prefix: "hdg",
            uri: "http://dendro.fe.up.pt/ontology/hydrogen#",
            elements: Elements.hdg,
            label: "Hydrogen Generation",
            description: "Hydrogen Generation experimental studies...Catalyst; Reagent...",
            domain: "Hydrogen Generation",
            domain_specific: true
        },
        tsim :
        {
            prefix: "tsim",
            uri: "http://dendro.fe.up.pt/ontology/trafficSim#",
            elements: Elements.tsim,
            label: "Traffic Simulation",
            description: "Traffic Simulation studies...Driving cycle; Vehicle Mass...",
            domain: "Traffic Simulation",
            domain_specific: true
        },
        cep :
        {
            prefix: "cep",
            uri: "http://dendro.fe.up.pt/ontology/cep/",
            elements: Elements.cep,
            label: "Cutting and Packing",
            description: "Cutting and packing optimization strategies...Solver configuration, Optimization strategy, Heuristics used...",
            domain: "Algorithms and optimization",
            domain_specific: true
        },
        social :
        {
            prefix: "social",
            uri: "http://dendro.fe.up.pt/ontology/socialStudies#",
            elements: Elements.social,
            label: "Social Studies",
            description: "Social and Behavioural Studies... Methodology, Sample procedure, Kind of data...",
            domain: "Social and Behavioural Science",
            domain_specific : true
        },
        cfd :
        {
            prefix: "cfd",
            uri: "http://dendro.fe.up.pt/ontology/cfd#",
            elements: Elements.cfd,
            label: "Fluid Dynamics",
            description: "Computational Fluid Dynamics... Flow Case, Initial Condition, Temporal Discretization...",
            domain: "Computational Fluid Dynamics",
            domain_specific : true
        }
    };
};

/**
 * ElasticSearch Indexing Configuration
 *
 */
Config.indexableFileExtensions = {
    "pdf" : 1,
    "doc": 1,
    "docx" : 1
};

Config.limits =
{
    index : {
        maxResults : 100,
        pageSize : 100
    },
    db : {
        maxResults : 1000,
        pageSize : 1000
    }
};

Config.streaming  =
{
    db :
    {
        page_size : 200
    }
};

Config.useElasticSearchAuth = active_config.useElasticSearchAuth;

Config.elasticSearchAuthCredentials = active_config.elasticSearchAuthCredentials;

/**
 * Plugins
 */

Config.plugins = {
    folderName : "plugins"
};

/*
Element / Ontology related configuration
 */

Config.acl = {
    actions : {
        restore : "restore",
        backup : "backup",
        edit : "edit",
        delete : "delete",
        read : "read"
    },
    groups : {
        creator : "creator",
        admin : "admin"
    },
    allow : 1,
    deny : 0
};

Config.controls = {
    date_picker : "date_picker",
    input_box : "input_box",
    markdown_box : "markdown_box",
    map : "map",
    url_box : "url_box",
    regex_checking_input_box : "regex_checking_input_box",
    combo_box : "combo_box"
};

Config.types = {
    private : "private",                                //cannot be shared to the outside world under any circumstance
    locked : "locked",                                  //can not be seen or edited from the main interface or via apis
    restorable : "restorable",                          //can be restorable from a metadata.json file in a zip backup file
    backuppable : "backuppable",                        //will be included in a metadata.json file produced in a zip file (backup zips)
    audit : "audit",                                    //cannot be changed via API calls, changed internally only
    api_readable : "api_readable",                      //accessible to the outside world via API calls
    api_writeable : "api_writeable",                    //modifiable from the outside world via API calls
    immutable : "immutable",                            //cannot be changed under ANY circumstance
    unrevertable : "unrevertable",                      //cannot be fallen back in the a "restore previous version" operation
    locked_for_project : "locked_for_project"           //project metadata which cannot be modified using the metadata editor, has to go through the project administrator
};

/*
Backup and restore
 */

Config.packageMetadataFileName = "metadata.json";
Config.systemOrHiddenFilesRegexes = getConfigParameter("systemOrHiddenFilesRegexes");

Config.absPathInSrcFolder = function(relativePath)
{
    var path = require('path'),
        appDir = path.dirname(require.main.filename);

    return path.join(appDir, relativePath);
};

Config.absPathInApp = function(relativePath)
{
    var path = require('path'),
        appFolderPath = path.resolve(path.dirname(require.main.filename), "..");

    return path.join(appFolderPath, relativePath);
};

Config.getPathToPublicFolder = function()
{
    return path.join(path.resolve(path.dirname(require.main.filename), '..'), "public");
};

Config.absPathInPublicFolder = function(relativePath)
{
    var path = require('path'),
        publicFolderPath = Config.getPathToPublicFolder();

    return path.join(publicFolderPath, relativePath);
};



/**
 * Thumbnail Generation
 */

Config.thumbnailableExtensions = {
    //"pdf" : 1,
    "jpeg": 1,
    "jpg" : 1,
    "gif" : 1,
    "png" : 1
};

Config.thumbnails = {
    thumbnail_format_extension : "gif",
    //every attribute of the size_parameters must be listed here for iteration TODO fix later
    sizes : ["big", "medium", "small", "icon"],
    size_parameters:
    {
        big : {
            description : "big",
            width : 256,
            height : 256
        },
        medium : {
            description : "medium",
            width : 128,
            height : 128
        },
        small : {
            description : "small",
            width : 64,
            height : 64
        },
        icon : {
            description : "icon",
            width : 32,
            height : 32
        }
    }
};

/*
MIME types
 */

Config.mimeTypes = {
    "default" : "application/octet-stream",
    "323":"text/h323",
    "*":"application/octet-stream",
    "acx":"application/internet-property-stream",
    "ai":"application/postscript",
    "aif":"audio/x-aiff",
    "aifc":"audio/x-aiff",
    "aiff":"audio/x-aiff",
    "asf":"video/x-ms-asf",
    "asr":"video/x-ms-asf",
    "asx":"video/x-ms-asf",
    "au":"audio/basic",
    "avi":"video/x-msvideo",
    "axs":"application/olescript",
    "bas":"text/plain",
    "bcpio":"application/x-bcpio",
    "bin":"application/octet-stream",
    "bmp":"image/bmp",
    "c":"text/plain",
    "cat":"application/vnd.ms-pkiseccat",
    "cdf":"application/x-cdf",
    "cdf":"application/x-netcdf",
    "cer":"application/x-x509-ca-cert",
    "class":"application/octet-stream",
    "clp":"application/x-msclip",
    "cmx":"image/x-cmx",
    "cod":"image/cis-cod",
    "pio":"application/x-cpio",
    "crd":"application/x-mscardfile",
    "crl":"application/pkix-crl",
    "crt":"application/x-x509-ca-cert",
    "csh":"application/x-csh",
    "css":"text/css",
    "dcr":"application/x-director",
    "der":"application/x-x509-ca-cert",
    "dir":"application/x-director",
    "dll":"application/x-msdownload",
    "dms":"application/octet-stream",
    "doc":"application/msword",
    "dot":"application/msword",
    "dvi":"application/x-dvi",
    "dxr":"application/x-director",
    "eps":"application/postscript",
    "etx":"text/x-setext",
    "evy":"application/envoy",
    "exe":"application/octet-stream",
    "fif":"application/fractals",
    "flr":"x-world/x-vrml",
    "gif":"image/gif",
    "gtar":"application/x-gtar",
    "gz":"application/x-gzip",
    "h":"text/plain",
    "hdf":"application/x-hdf",
    "hlp":"application/winhlp",
    "hqx":"application/mac-binhex40",
    "hta":"application/hta",
    "htc":"text/x-component",
    "htm":"text/html",
    "html":"text/html",
    "htt":"text/webviewhtml",
    "ico":"image/x-icon",
    "ief":"image/ief",
    "iii":"application/x-iphone",
    "ins":"application/x-internet-signup",
    "isp":"application/x-internet-signup",
    "jfif":"image/pipeg",
    "jpe":"image/jpeg",
    "jpeg":"image/jpeg",
    "jpg":"image/jpeg",
    "js":"application/x-javascript",
    "latex":"application/x-latex",
    "lha":"application/octet-stream",
    "lsf":"video/x-la-asf",
    "lsx":"video/x-la-asf",
    "lzh":"application/octet-stream",
    "m13":"application/x-msmediaview",
    "m14":"application/x-msmediaview",
    "m3u":"audio/x-mpegurl",
    "man":"application/x-troff-man",
    "mdb":"application/x-msaccess",
    "me":"application/x-troff-me",
    "mht":"message/rfc822",
    "mhtml":"message/rfc822",
    "mid":"audio/mid",
    "mny":"application/x-msmoney",
    "mov":"video/quicktime",
    "movie":"video/x-sgi-movie",
    "mp2":"video/mpeg",
    "mp3":"audio/mpeg",
    "mpa":"video/mpeg",
    "mpe":"video/mpeg",
    "mpeg":"video/mpeg",
    "mpg":"video/mpeg",
    "mpp":"application/vnd.ms-project",
    "mpv2":"video/mpeg",
    "ms":"application/x-troff-ms",
    "msg":"application/vnd.ms-outlook",
    "mvb":"application/x-msmediaview",
    "nc":"application/x-netcdf",
    "nws":"message/rfc822",
    "oda":"application/oda",
    "p10":"application/pkcs10",
    "p12":"application/x-pkcs12",
    "p7b":"application/x-pkcs7-certificates",
    "p7c":"application/x-pkcs7-mime",
    "p7m":"application/x-pkcs7-mime",
    "p7r":"application/x-pkcs7-certreqresp",
    "p7s":"application/x-pkcs7-signature",
    "pbm":"image/x-portable-bitmap",
    "pdf":"application/pdf",
    "pfx":"application/x-pkcs12",
    "pgm":"image/x-portable-graymap",
    "pko":"application/ynd.ms-pkipko",
    "pma":"application/x-perfmon",
    "pmc":"application/x-perfmon",
    "pml":"application/x-perfmon",
    "pmr":"application/x-perfmon",
    "pmw":"application/x-perfmon",
    "pnm":"image/x-portable-anymap",
    "png":"image/png",
    "pot":"application/vnd.ms-powerpoint",
    "ppm":"image/x-portable-pixmap",
    "pps":"application/vnd.ms-powerpoint",
    "ppt":"application/vnd.ms-powerpoint",
    "prf":"application/pics-rules",
    "ps":"application/postscript",
    "pub":"application/x-mspublisher",
    "qt":"video/quicktime",
    "ra":"audio/x-pn-realaudio",
    "ram":"audio/x-pn-realaudio",
    "ras":"image/x-cmu-raster",
    "rgb":"image/x-rgb",
    "rmi":"audio/mid",
    "roff":"application/x-troff",
    "rtf":"application/rtf",
    "rtx":"text/richtext",
    "scd":"application/x-msschedule",
    "sct":"text/scriptlet",
    "setpay":"application/set-payment-initiation",
    "setreg":"application/set-registration-initiation",
    "sh":"application/x-sh",
    "shar":"application/x-shar",
    "sit":"application/x-stuffit",
    "snd":"audio/basic",
    "spc":"application/x-pkcs7-certificates",
    "spl":"application/futuresplash",
    "src":"application/x-wais-source",
    "sst":"application/vnd.ms-pkicertstore",
    "stl":"application/vnd.ms-pkistl",
    "stm":"text/html",
    "sv4cpio":"application/x-sv4cpio",
    "sv4crc":"application/x-sv4crc",
    "svg":"image/svg+xml",
    "swf":"application/x-shockwave-flash",
    "t":"application/x-troff",
    "tar":"application/x-tar",
    "tcl":"application/x-tcl",
    "tex":"application/x-tex",
    "texi":"application/x-texinfo",
    "texinfo":"application/x-texinfo",
    "tgz":"application/x-compressed",
    "tif":"image/tiff",
    "tiff":"image/tiff",
    "tr":"application/x-troff",
    "trm":"application/x-msterminal",
    "tsv":"text/tab-separated-values",
    "txt":"text/plain",
    "uls":"text/iuls",
    "ustar":"application/x-ustar",
    "vcf":"text/x-vcard",
    "vrml":"x-world/x-vrml",
    "wav":"audio/x-wav",
    "wcm":"application/vnd.ms-works",
    "wdb":"application/vnd.ms-works",
    "wks":"application/vnd.ms-works",
    "wmf":"application/x-msmetafile",
    "wps":"application/vnd.ms-works",
    "wri":"application/x-mswrite",
    "wrl":"x-world/x-vrml",
    "wrz":"x-world/x-vrml",
    "xaf":"x-world/x-vrml",
    "xbm":"image/x-xbitmap",
    "xla":"application/vnd.ms-excel",
    "xlc":"application/vnd.ms-excel",
    "xlm":"application/vnd.ms-excel",
    "xls":"application/vnd.ms-excel",
    "xlt":"application/vnd.ms-excel",
    "xlw":"application/vnd.ms-excel",
    "xof":"x-world/x-vrml",
    "xpm":"image/x-xpixmap",
    "xwd":"image/x-xwindowdump",
    "z":"application/x-compress",
    "zip":"application/zip"
};

Config.swordConnection = {
    DSpaceServiceDocument: "/swordv2/servicedocument",
    EprintsServiceDocument: "/sword-app/servicedocument",
    EprintsCollectionRef: "/id/contents"
};

var Serializers = require(Config.absPathInSrcFolder("/utils/serializers.js"));

Config.defaultMetadataSerializer = Serializers.dataToJSON;
Config.defaultMetadataContentType = "text/json";

Config.metadataSerializers ={
    "application/text" : Serializers.metadataToText,
    "application/txt" : Serializers.metadataToText,
    "application/rdf" : Serializers.metadataToRDF,
    "application/xml" : Serializers.metadataToRDF,
    "application/json" : Serializers.dataToJSON
}
Config.metadataContentTypes ={
    "application/text" : "text/plain",
    "application/txt" : "text/plain",
    "application/rdf" : "text/xml",
    "application/xml" : "text/xml",
    "application/json" : "text/json"
};

Config.getAbsolutePathToPluginsFolder = function()
{
    var path = require('path');
    var applicationRootFolder = path.dirname(require.main.filename);

    return path.join(applicationRootFolder, Config.plugins.folderName);
};

Config.theme = getConfigParameter("theme");

Config.demo_mode = getConfigParameter("demo_mode");

Config.email = getConfigParameter("email");

module.exports.Config = Config;
