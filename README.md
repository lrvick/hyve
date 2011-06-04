# Hyve #
  
  <http://github.com/lrvick/hyve>


## About ##

  Hyve (pronounced: "hive") is a javascript library aiming to be a general
  solution for streaming the latest data from multiple social media networks,
  for any given topic, and abstracting all of them into one simple API.


## Current Features ##
 
  * Plays nice with all major JS frameworks (jQuery, Mootools etc.)
  * Can run any javascript function of your choice against each posting retrieved.
  * Outputs all data in a consistant format - [USMF][] 
  * Supports Facebook, Twitter, Identica, Buzz, Flickr, Youtube and Reddit
  * Streams from all services (default), or optinoally only selected services
  * Runs in the browser or on the server (Node.js)

[USMF]: https://github.com/lrvick/tawlk/wiki/Unified-Social-Media-Format-(USMF)


## Requirements ##

For running Hyve in Node.js, you'll need the [request][] library. You can grab
it from [npm][]:

    $ npm install request
    
[request]: https://github.com/mikeal/request
[npm]:     http://npmjs.org


## Usage / Installation ##
  
Arguments:

        ```javascript
        hyve.stream(search_terms,callback_function,optional_service_list)
        ```

Simple echo of Twitter, Facebook, and Buzz with pure JS:
        
        ```javascript    
        var myFunction = function(data){console.log(' + data.service +' : '+ data.text  +')}
        var myQuery = 'android'
        var myServices = ['Twitter','Facebook','Buzz']
        
        hyve.stream(myQuery,myFunction,myServices)
        ```

Simple Node.js example to output data from all services:
        
        ```javascript        
        var hyve = require('hyve')

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
                <script src="hyve.js" type="text/javascript"></script> 
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

## Notes ##
    
  Buzz has really strict limits and requires an API key to do more than a few queries.

  You can obtain a key from <https://code.google.com/apis/console/?api=buzz>

  You can set the key in your project like so:
    
        hyve.feeds.buzz.api_key = 'your_api_key_string_here';

  Questions/Comments? Please check us out on IRC via irc://udderweb.com/#uw
