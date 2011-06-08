(function(root) {
    var get   = typeof require == 'function' && require('request')
    var hyve  = typeof exports != 'undefined'?  exports : root.hyve = { }

    // ECMA-262 compatible Array#forEach polyfills
    Array.prototype.forEach = Array.prototype.forEach
    || function(fn, ctx) {
           var len = this.length >>> 0
           for (var i = 0; i < len; ++i)
               if (i in this) fn.call(ctx, this[i], i, this)
       }


    // Fills a template with data from an object
    function format(string, data) {
        return string.replace( /{{(?:#(.+?)#)?\s*(.+?)\s*}}/g
                             , function(m, cond, id) {
                                 var rv = data[id]
                                 return rv? (cond || '') + rv
                                          :  cond? m : '' })
    }

    // Pulls data from several streams and handle all them with the given
    // callback
    function stream(query, callback, custom_services) {
        var services
        services = custom_services || Object.keys(hyve.feeds)
        services.forEach(function(service){
            var options = hyve.feeds[service.toLowerCase()]
            var feed_url = format( options.feed_url,
                                     { query:  query
                                     , apikey: options.api_key })
                fetch(feed_url, service, callback)
            setInterval(function(){
                fetch(feed_url, service, callback)
            }, options.interval)
        })
    }

    // Fetches a JSON stream
    var fetch = function() {
        var counter   = 0
        var callbacks = { }
        var head      = !get && document.getElementsByTagName('head')[0]

        // Returns a qualified identifier pointing to a callback
        function get_callback() {
            return format('hyve.callbacks.f{{id}}', { id: ++counter })
        }

        // Requires an URI using JSONP
        function jsonp(url, callback) {
            hyve.callbacks['f' + counter] = callback
            var s = document.createElement('script')
            s.setAttribute('src', url)
            head.appendChild(s)
        }

        // Requires an URI using Node.js's request library
        function request(url, callback) {
            get({uri: url}, function(error, res, data) {
                try {
                    callback(JSON.parse(data))
                }
                catch(e){
                    callback({ }, e)
                }
            })
        }

        // Abstracts fetching URIs.
        function fetch(url, service, callback) {
            var fn = pass(service, callback)
            var cb = !get && get_callback()
            url    = format(url, { callback: cb })

            var fetcher = get? request : jsonp
            fetcher(url, fn)
        }

        // Higher-order function to process the fetched data
        function pass(service, callback) {
            return function(data) {
                hyve.feeds[service].parse(data, callback)
            }
        }

        // Export the `fetch` function
        return fetch
    }()


    // Exports data to the outside world
    hyve.stream    = stream
    hyve.callbacks = []
    hyve.feeds     = {
            twitter: {
                interval : 2000,
                feed_url :'http://search.twitter.com/search.json?q={{query}}{{#&callback=#callback}}',
                parse : function(data,callback){
                    if (data.refresh_url != null){
                        this.feed_url = 'http://search.twitter.com/search.json'
                                      + data.refresh_url
                                      + '{{#&callback=#callback}}'
                    }
                    data.results.forEach(function(item){
                        callback({
                            'service' : 'twitter',
                            'user' : {
                                'id' : item.from_user_id_str,
                                'name' : item.from_user,
                                'avatar' : item.profile_image_url
                            },
                            'id' : item.id_str,
                            'date' : item.created_at, //TODO: normalize
                            'text' : item.text,
                            'source' : item.source
                        })
                    })
                }
            },
            identica: {
                interval : 6000,
                feed_url :'http://identi.ca/api/search.json?q={{query}}{{#&callback=#callback}}',
                parse : function(data,callback){
                    if (data.refresh_url != null){
                        this.feed_url = 'http://identi.ca/api/search.json' + data.refresh_url+ '{{#&callback=#callback}}'
                    }
                    data.results.forEach(function(item){
                        callback({
                            'service' : 'identica',
                            'user' : {
                                'id' : item.from_user_id_str,
                                'name' : item.from_user,
                                'avatar' : item.profile_image_url
                            },
                            'id' : item.id_str,
                            'date' : item.created_at, //TODO: normalize
                            'text' : item.text,
                            'source' : item.source
                        })
                    })
                }
            },
            buzz: {
                interval : 5000,
                api_key: '',
                feed_url :'https://www.googleapis.com/buzz/v1/activities/search?q={{query}}&alt=json&orderby=published{{#&callback=#callback}}{{#&key=#apikey}}',
                parse : function(data,callback){
                    if (this.orig_url == null){
                        this.orig_url = this.feed_url
                    }
                    if (data.data != null){
                        var last_date = data.data.items[0].updated.split('.')[0]
                        this.feed_url = this.orig_url.replace('{{query}}','{{query}}%20AND%20date%3E' + last_date)
                        data.data.items.forEach(function(item){
                            if (item.title != '-'){
                                callback({
                                    'service' : 'buzz',
                                    'user' : {
                                        'id' : item.actor.name,
                                        'name' : item.actor.name,
                                        'avatar' : item.actor.thumbnailUrl,
                                        'source' : item.actor.profileUrl
                                    },
                                    'id' : item.id.split(':')[3],
                                    'date' : item.published, //TODO normalize
                                    'text' : item.title,
                                    'source' : item.object.links.alternate[0].href
                                })
                            }
                        })
                    }
                }
            },
            facebook: {
                interval : 3000,
                feed_url : 'https://graph.facebook.com/search?q={{query}}&type=post{{#&callback=#callback}}',
                parse : function(data,callback){
                    if (data.data != null){
                        if (data.paging != null) {
                            this.feed_url = data.paging.previous + '{{#&callback=#callback}}'
                        }
                        data.data.forEach(function(item){
                            if (item.message != null){
                                callback({
                                    'service' : 'facebook',
                                    'user' : {
                                        'id' : item.from.id,
                                        'name' : item.from.name,
                                        'avatar' : 'http://graph.facebook.com/'+item.from.id+'/picture'
                                    },
                                    'id' : item.id,
                                    'date' : item.created_time, //TODO: normalize
                                    'text' : item.message,
                                    'source' : 'http://facebook.com/'+item.from.id
                                })
                            }
                        })
                    }
                }
            },
            reddit: {
                interval : 5000,
                feed_url : 'http://www.reddit.com/search.json?q={{query}}&sort=new{{#&jsonp=#callback}}',
                parse : function(data,callback){
                    if (data.data.children[0]){
                        if (this.orig_url == null){
                            this.orig_url = this.feed_url
                        }
                        var before = data.data.children[0].data.name
                        if (before != null){
                            this.feed_url = this.orig_url + '&before=' + before 
                        }
                        data.data.children.forEach(function(item){
                            item = item.data
                            callback({
                                'service' : 'reddit',
                                'user' : {
                                    'id' : '',
                                    'name' : '',
                                    'avatar' : ''
                                },
                                'id' : item.id,
                                'date' : item.created_utc, //TODO: normalize
                                'text' : item.title,
                                'source' : item.url,
                                'thumbnail':'http://reddit.com' + item.thumbnail
                            })
                        })
                    }
                }
            },
            flickr: {
                interval : 10000,
                api_key : '',
                feed_url : 'http://api.flickr.com/services/feeds/photos_public.gne?format=json&tagmode=all&tags={{query}}{{#&jsoncallback=#callback}}&extras=date_upload,date_taken,owner_name,geo,tags,views',
                parse : function(data,callback){
                    if (this.items_seen == null){
                        this.items_seen = {};
                    }
                    data.items && data.items.forEach(function(item){
                        if (this.items_seen[item.media.m] == null){
                            this.items_seen[item.media.m] = true
                            callback({
                                'service' : 'flickr',
                                'user' : {
                                    'id' : '',
                                    'name' : '',
                                    'avatar' : ''
                                },
                                'id' : '',
                                'date' : '', //TODO: normalize
                                'text' : item.description,
                                'source' : '',
                                'thumbnail':''
                            })
                        } 
                    }, this)
                }
            },
            youtube: {
                interval : 8000,
                feed_url : 'http://gdata.youtube.com/feeds/api/videos?q={{query}}&time=today&orderby=published&format=5&max-results=20&v=2&alt=jsonc{{#&callback=#callback}}',
                parse : function(data,callback){
                    if (this.items_seen == null){
                        this.items_seen = {};
                    }
                    if (data.data != null){
                        data.data.items.forEach(function(item){
                            if (this.items_seen[item.id] == null){
                                this.items_seen[item.id] = true
                                callback({
                                    'service' : 'youtube',
                                    'user' : {
                                        'id' : item.uploader,
                                        'name' : item.uploader,
                                        'profile' : 'http://youtube.com/' + item.uploader,
                                        'avatar' : ''
                                    },
                                    'id' : item.id,
                                    'date' : '', //TODO: normalize
                                    'text' : item.title,
                                    'source' : 'http://youtu.be/'+ item.id,
                                    'thumbnail':'http://i.ytimg.com/vi/' + item.id + '/hqdefault.jpg'
                                })
                            } 
                        }, this)
                    }
                }
            },
            wordpress: {
                interval : 10000,
                feed_url : 'http://pipes.yahoo.com/pipes/pipe.run?_id=332d9216d8910ba39e6c2577fd321a6a&_render=json&u=http%3A%2F%2Fen.search.wordpress.com%2F%3Fq%3D{{query}}%26s%3Ddate%26f%3Djson{{#&_callback=#callback}}',
                parse : function(data,callback){
                    if (this.items_seen == null){
                        this.items_seen = {};
                    }
                    if (data != null){
                        data.value.items.forEach(function(item){
                            if (this.items_seen[item.guid] == null){
                                this.items_seen[item.guid] = true
                                callback({
                                    'service' : 'wordpress',
                                    'user' : {
                                        'id' : item.author,
                                        'name' : item.author,
                                        'profile' :'',
                                        'avatar' : ''
                                    },
                                    'id' : item.id,
                                    'date' : '', //TODO: normalize
                                    'text' : item.title,
                                    'description':item.content,
                                    'source' : item.guid,
                                })
                            } 
                        }, this)
                    }
                }
            }
        }
})(this);


/*
$.getJSON('http://pipes.yahoo.com/pipes/pipe.run?_id=332d9216d8910ba39e6c2577fd321a6a&_render=json&u=http%3A%2F%2Fen.search.wordpress.com%2F%3Fq%3D' + query + '%26f%3Djson&_callback=?', function(data){                                  $('<h2>Wordpress</h2><hr>').appendTo($('body')).show('slow')
    $.each(data.value.items, function(i,item) {
        $('<p>'+ item.author + ' : ' + item.title + '</p>').hide().appendTo($('body')).show('slow')
    });
});
});*/
