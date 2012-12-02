# Hyve #

  <http://github.com/Tawlk/hyve>


## About ##

  Hyve (pronounced: "hive") is a Javascript library aiming to be a general
  solution for streaming the latest data from multiple social media networks,
  for any given topic, and abstracting all of them into one simple API.


## Current Features ##

  * Plays nice with all major JS frameworks (jQuery, Mootools etc.)
  * Can run any Javascript function of your choice against each posting retrieved.
  * Outputs all data in a normalized format - [USMF][]
  * Supports searching Facebook, Twitter, Identica, Foursquare, Flickr, Picasa, Wordpress, Youtube, Reddit, Digg, and Delicious
  * Indirectly supports Imgur and Vimeo by catching links shared via other services.
  * Expands urls from t.co and bitly
  * Streams from all services (default), or optionally only selected services
  * Streams personal feed of subscriptions using Oauth tokens (for supported networks)
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


## Usage ##

### Configuration Options ###

#### Data Queueing  ####

When this is enabled all incoming data will be placed into a FIFO queue by so
your application can dequeue items as appropriate.

Queued items will be stored in 'hyve.queue' as an array:

```javascript
console.log(hyve.queue)

>>> {'text':[],'link':[],'video':[],'image':[],'checkin':[]}
```

Enable Queuing:

```javascript
hyve.queue_enable = true
```

Dequeue Queued Item:

```javascript

var item = hyve.queue.text[0]

hyve.dequeue(item)

```

#### Data Recall (Browser Only) ####

If enabled in conjunction with hyve.queue hyve will cache all queued items
using HTML5 localStorage. Hyve will recall any cached items if the page containing
hyve is closed and restarted.


Enable Recall:

```javascript
hyve.recall_enable = true
```

#### API Key requirements ####

In order to use some functions within some services you must supply API Keys.

Foursquare will only return data if the client has HTML5 Geolocaton support.
You must also define client_id and client_secret like so:

```javascript
hyve.feeds.foursquare.client_id = 'your_application_client_id'
hyve.feeds.foursquare.client_secret = 'your_application_client_secret'
```

Flickr will work without authentication, however the 'views' statistic is not returned
without auth. Without 'views' the 'weight' metric will be set to 0.

To get 'views' in Flickr you must specify an API key like so:

```javascript
hyve.feeds.flickr.api_key = 'your_api_key',
```

To utilize bitly url un-shortening you must supply a username and API key:

```javascript
hyve.feeds.bitly.login = 'your_username'
hyve.feeds.bitly.api_key = 'your_api_key'
```

#### OAuth Token definitions  ####

In order to use functions of hyve that require OAuth authentication (like the
friends/subcriptions stream) you must supply OAuth tokens for each involved
service. Obtaining OAuth tokens is outside the scope of hyve.

```javascript
// Facebook (Oauth2)
hyve.feeds.facebook.oauth_token = 'oauth_token'

// Flickr (Oauth2)
hyve.feeds.flickr.oauth_token = 'oauth_token'

// Youtube (Oauth2)
hyve.feeds.youtube.oauth_token = 'oauth_token'

// Twitter (Oauth1a)
hyve.feeds.twitter.oauth_token = 'oauth_token'
hyve.feeds.twitter.oauth_consumer_key = 'oauth_consumer_key'
hyve.feeds.twitter.oauth_signature = 'oauth_signature'
hyve.feeds.twitter.oauth_nonce = 'oauth_nonce'
hyve.feeds.twitter.oauth_timestamp = 'oauth_timestamp'

// Instagram (Oauth2)
hyve.feeds.instagram.access_token = 'access_token'
```

### Commands ###

#### Public search real-time stream ####

```javascript
hyve.search.stream(search_terms,callback_function,optional_service_list)
```

#### Public recently popular search ####

```javascript
hyve.search.popular(search_term,callback_function,optional_service_list)
```

#### Personal friends/subscriptions stream ####

```javascript
hyve.friends.stream(callback_function,optional_service_list)
```

#### Stop running streams ####

```javascript
hyve.stop()
```

### Deployment ###

#### Browser - Production ####

For production use in a browser you should use a single-file minified version
of hyve.

Compile using grunt:

    $ grunt concat min

You will then find a minified version of hyve at dist/hyve.min.js


#### Browser - Development ####

During development you can simply source the files you intend to work with:

```html
<script type="text/javascript" src="hyve/src/hyve.core.js">
<script type="text/javascript" src="hyve/src/hyve.twitter.js">
<script type="text/javascript" src="hyve/src/hyve.facebook.js">
```

#### Node.JS ####

In Node.js simply require hyve.core.js and any modules you need.

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

hyve.search.stream(myQuery,myFunction,myServices)
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
                    hyve.search.stream(query,function(data){
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


  Questions/Comments? Please check us out on IRC via irc://freenode.net/#tawlk
