# Hyve #

  <http://github.com/Tawlk/hyve>


## About ##

  Hyve (pronounced: "hive") is a javascript library aiming to be a general
  solution for streaming the latest data from multiple social media networks,
  for any given topic, and abstracting all of them into one simple API.


## Current Features ##

  * Plays nice with all major JS frameworks (jQuery, Mootools etc.)
  * Can run any javascript function of your choice against each posting retrieved.
  * Outputs all data in a normalized format - [USMF][]
  * Supports searching Facebook, Twitter, Identica, Foursquare, Flickr, Picasa, Wordpress, Youtube, Reddit, Digg, and Delicious
  * Indirectly supports Imgur and Vimeo by catching links shared via other services.
  * Expands urls from t.co and bitly
  * Streams from all services (default), or optionally only selected services
  * Runs in the browser or on the server (Node.js)

[USMF]: https://github.com/Tawlk/hyve/wiki/Unified-Social-Media-Format-(USMF)


## Requirements ##

For running Hyve in Node.js, you'll need the [request][] library.

You can grab it from [npm][]:

    $ npm install request

For running Hyve in the browser in production you'll need to compile it with
the [grunt][] library.

You can grab it from [npm][]:

    $ npm -g install grunt

[request]: https://github.com/mikeal/request
[grunt]: https://github.com/cowboy/grunt
[npm]: http://npmjs.org


## Usage / Installation ##

Arguments:

```javascript

hyve.stream(search_terms,callback_function,optional_service_list)

```

### Browser - Production ###

For production use in a browser you should use a single-file minified version
of hyve. You can use grunt to compile.

Then compile with:

    $ grunt concat min

You will then find a minified version of hyve at dist/hyve.min.js


### Browser - Development ###

During development you can simply source the files you intend to work with:

```html
<script type="text/javascript" src="hyve/src/hyve.core.js">
<script type="text/javascript" src="hyve/src/hyve.twitter.js">
<script type="text/javascript" src="hyve/src/hyve.facebook.js">
```

### Node.JS ###

In Node.JS simply require hyve.core.js and any modules you need.

```javascript
var hyve = require('src/hyve.core.js')
require('src/hyve.twitter.js')
require('src/hyve.facebook.js')
```


## Examples ##

Simple echo of Twitter, Facebook, and Identica with pure JS:

```javascript

var myFunction = function(data){console.log(' + data.service +' : '+ data.text  +')}
var myQuery = 'android'
var myServices = ['Twitter','Facebook','Identica']

hyve.stream(myQuery,myFunction,myServices)

```

Simple Node.js example to output data from all services:

```javascript

var hyve = require('src/hyve.core.js')
require('src/hyve.twitter.js')
require('src/hyve.facebook.js')

hyve.stream('android', function(data){
    console.log(data.service +' : '+ data.text);
})

```

Basic live search engine with jQuery:

```html

<!DOCTYPE HTML>
<html>
    <head>
        <script src="https://ajax.googleapis.com/ajax/libs/jquery/1.4.2/jquery.min.js"></script>
        <script src="dist/hyve.min.js" type="text/javascript"></script>
        <script type="text/javascript">
            $(document).ready(function() {
                $('#search').bind("click",function(){
                    query=$('#query').val();
                    hyve.stream(query,function(data){
                        $('#output').prepend($('<p>' + data.service +' : '+ data.text  +'</p>'))
                    });
                });
            });
        </script>
    </head>
    <body>
        <div id="input">
            <input id="query" type="text" />
            <button id="search">search</button>
        </div>
        <div id="output"></div>
    </body>
</html>

```

You can find more examples in the demos directory.


## Notes ##

  Foursquare will only return data if the client has HTML5 Geolocaton support.
  You must also define client_id and client_secret like so:

        hyve.feeds.foursquare.client_id = 'your_application_client_id'
        hyve.feeds.foursquare.client_secret = 'your_application_client_secret'

  Flickr will work without authentication, however 'views' is not returned without auth.
  Without 'views' the 'weight' metric will be set to 0.

  To get 'views' in Flickr you must specify an API key like so:

        hyve.feeds.flickr.api_key = 'your_api_key',

  To utilize bitly url un-shortening you must supply a login and api_key:

        hyve.feeds.bitly.login = 'your_username'
        hyve.feeds.bitly.api_key = 'your_api_key'

  Questions/Comments? Please check us out on IRC via irc://freenode.net/#tawlk
