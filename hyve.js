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

    // Converts an object to an array
    function oc(a){
       var obj = {};
       for(var i=0;i<a.length;i++){
           obj[a[i]]='';
       }
       return obj;
    }

    // Fills a template with data from an object
    function format(string, data) {
        return string.replace( /{{(?:#(.+?)#)?\s*(.+?)\s*}}/g
                             , function(m, cond, id) {
                                 var rv = data[id]
                                 return rv? (cond || '') + rv
                                          :  cond? m : '' })
    }

    // Converts a date string to epoch time
    function epochDate(date){
        var date_obj = new Date(date)
        return date_obj.getTime()/1000
    }

    // Pulls data from several streams and handle all them with the given
    // callback
    function stream(query, callback, custom_services) {
        services = custom_services || Object.keys(hyve.feeds)
        if (custom_services){
            services = custom_services
        } else {
            services = []
            all_services = Object.keys(hyve.feeds)
            all_services.forEach(function(service){
               if ('search' in oc(hyve.feeds[service.toLowerCase()].methods)){
                   services.push(service.toLowerCase())
               }
            })
        }
        services.forEach(function(service){
            if ( hyve.feeds[service.toLowerCase()].orig_url == undefined ){
                hyve.feeds[service.toLowerCase()].orig_url = hyve.feeds[service.toLowerCase()].feed_url
            }
            var options = hyve.feeds[service.toLowerCase()]
            if (hyve.feeds[service.toLowerCase()].format_url){
                var feed_url = format(options.feed_url,hyve.feeds[service.toLowerCase()].format_url(query))
            } else {
                var feed_url = format( options.feed_url,
                                 { query:  query
                                 , url_suffix: options.url_suffix
                                 , result_type: options.result_type
                                 , api_key: options.api_key })
            }
            var runFetch = function(){
                if (hyve.feeds[service.toLowerCase()].fetch_url){
                    hyve.feeds[service.toLowerCase()].fetch_url(service,query,callback)
                } else {
                    fetch(feed_url, service, query, callback)
                }
            }
            runFetch()
            hyve.feeds[service.toLowerCase()].lock = setInterval(function(){
                runFetch()
            }, options.interval)
        })
    }

    // Stops any running streams for iven services
    function stop(custom_services) {
        var services
        services = custom_services || Object.keys(hyve.feeds)
        services.forEach(function(service){
            if (hyve.feeds[service.toLowerCase()].lock != null) {
                hyve.feeds[service.toLowerCase()].feed_url = hyve.feeds[service.toLowerCase()].orig_url
                interval_id =  hyve.feeds[service.toLowerCase()].lock
                clearInterval(interval_id)
            }
        })
    }

    // Manually re-classify items as needed, check for dupes, then send to callback
    function process(item,callback){
        item.links = item.links || []
        if (item.links.length > 0){
            var processed_orig
            item.links.forEach(function(link){
                var new_item = item
                var link = link || ''
                if (link.search(/youtu.be|youtube.com/i) != -1){
                    new_item.origin = item.service
                    new_item.origin_id = item.id
                    new_item.origin_source = item.source
                    new_item.service = 'youtube'
                    new_item.type = 'video'
                    if (item.source.search(/youtu.be/i) != -1){
                        new_item.id = item.source.replace(/.*be\/(.*)/ig,"$1")
                    }
                    if (link.search(/youtube.com/i) != -1){
                        new_item.id = item.source.replace(/.*com\/.*v=([a-zA-Z0-9_]+).*/ig,"$1")
                    }
                    new_item.source = 'http://youtu.be/'+item.id
                    callback(new_item)
                } else if (link.search(/vimeo.com/i) != -1){
                    new_item.origin = item.service
                    new_item.origin_id = item.id
                    new_item.origin_source = item.source
                    new_item.service = 'vimeo'
                    new_item.type = 'video'
                    new_item.id = item.source.replace(/.*com\/(.*)/ig,"$1")
                    callback(new_item)
                } else if (link.search(/imgur.com/i) != -1){
                    new_item.origin = item.service
                    new_item.origin_id = item.id
                    new_item.origin_source = item.source
                    new_item.service = 'imgur'
                    new_item.type = 'image'
                    new_item.id = item.source.replace(/.*com(?:\/a)?\/([A-Za-z0-9]+).*/ig,"$1")
                    new_item.source = 'http://imgur.com/'+item.id
                    new_item.source_img = 'http://imgur.com/'+item.id+'.jpg'
                    new_item.thumbnail = 'http://imgur.com/'+item.id+'l.jpg'
                    callback(new_item)
                } else if (link.search(/.jpg|.png|.gif/i) != -1){
                    new_item.type = 'image'
                    new_item.source_img = item.source
                    new_item.thumbnail = item.source
                    callback(new_item)
                }
                if (processed_orig != true && link.search(/bit.ly|j.mp|bitly.com|tcrn.ch|nyti.ms|pep.si/i) != -1){
                    var options = hyve.feeds.bitly
                    var feed_url = format( options.feed_url,
                                 { short_url: link
                                 , login : options.login
                                 , api_key: options.api_key })
                    fetch(feed_url, 'bitly', link, callback, item)
                    var processed_orig = true
                } else if (processed_orig != true && new_item.type == item.type){
                    callback(item)
                    var processed_orig = true
                }
            })
        } else {
            callback(item)
        }
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
        function fetch(url, service, query, callback, item) {
            var fn = pass(service, query, callback, item)
            var cb = !get && get_callback()
            url    = format(url, { callback: cb })
            var fetcher = get? request : jsonp
            fetcher(url, fn)
        }

        // Higher-order function to process the fetched data
        function pass(service, query, callback, item) {
            return function(data) {
                hyve.feeds[service].parse(data, query, callback, item)
            }
        }

        // Export the `fetch` function
        return fetch
    }()


    // Exports data to the outside world
    hyve.stream    = stream
    hyve.stop      = stop
    hyve.callbacks = []
    hyve.links = {}
    hyve.feeds     = {
        bitly: { // this is living here temporarily until a clean way of implementing "methods" is decided so feeds can define search,user,unshorten etc.
            methods : ['unshorten'],
            login:'',
            api_key:'',
            feed_url : 'http://api.bitly.com/v3/expand?shortUrl={{short_url}}{{#&login=#login}}{{#&apiKey=#api_key}}&format=json{{#&callback=#callback}}',
            parse : function(data,url,callback,item){
                //TODO make this actually handle multiple urls instead of cheating and assuming only one
                var long_urls = []
                if (data.data.expand){
                    data.data.expand.forEach(function(link){
                        long_urls.push(link.long_url)
                    })
                    item.links = long_urls
                }
                process(item,callback)
            }
        },
            twitter: {
                methods : ['search'],
                interval : 2000,
                result_type : 'mixed', // mixed, recent, popular
                feed_url :'http://search.twitter.com/search.json?q={{query}}&lang=en&include_entities=True&{{#&result_type=#result_type}}{{#&callback=#callback}}',
                parse : function(data,query,callback){
                    if (data.refresh_url != null){
                        this.feed_url = 'http://search.twitter.com/search.json'
                                      + data.refresh_url
                                      + '{{#&callback=#callback}}'
                    }
                    if (this.items_seen == null){
                        this.items_seen = {};
                    }
                    if (data.results != null){
                        data.results.forEach(function(item){
                            if (this.items_seen[item.id_str.toString()] == null){
                                this.items_seen[item.id_str.toString()] = true
                                var links = []
                                if (item.entities.urls) {
                                    item.entities.urls.forEach(function(url){
                                        links.push(url.expanded_url)
                                    })
                                }
                                var weight = 0
                                if (item.metadata.result_type == 'popular'){
                                    weight = 1
                                }
                                if (item.metadata.recent_retweets){
                                    weight = weight + item.metadata.recent_retweets
                                }
                                process({
                                    'service' : 'twitter',
                                    'type' : 'text',
                                    'query' : query,
                                    'user' : {
                                        'id' : item.from_user_id_str,
                                        'name' : item.from_user,
                                        'avatar' : item.profile_image_url
                                    },
                                    'id' : item.id_str,
                                    'date' : epochDate(item.created_at),
                                    'text' : item.text,
                                    'links' : links,
                                    'source' : 'http://twitter.com/'+item.from_user+'/status/'+item.id,
                                    'weight' : weight
                                },callback)
                            }
                        },this)
                    }
                }
            },
            identica: {
                methods : ['search'],
                interval : 6000,
                feed_url :'http://identi.ca/api/search.json?lang=en&q={{query}}{{#&callback=#callback}}',
                parse : function(data,query,callback){
                    if (data.refresh_url != null){
                        this.feed_url = 'http://identi.ca/api/search.json' + data.refresh_url+ '{{#&callback=#callback}}'
                    }
                    data.results.forEach(function(item){
                        process({
                            'service' : 'identica',
                            'type' : 'text',
                            'query' : query,
                            'user' : {
                                'id' : item.from_user_id_str,
                                'name' : item.from_user,
                                'avatar' : item.profile_image_url
                            },
                            'id' : item.id_str,
                            'date' : epochDate(item.created_at),
                            'text' : item.text,
                            'source' : item.source,
                            'weight' : 1
                        },callback)
                    })
                }
            },
            facebook: {
                methods : ['search'],
                interval : 3000,
                feed_url : 'https://graph.facebook.com/search?q={{query}}&type=post{{#&callback=#callback}}',
                parse : function(data,query,callback){
                    if (data.data != null){
                        if (data.paging != null) {
                            this.feed_url = data.paging.previous + '{{#&callback=#callback}}'
                        }
                        data.data.forEach(function(item){
                            if (item.message != null){
                                process({
                                    'service' : 'facebook',
                                    'type' : 'text',
                                    'query' : query,
                                    'user' : {
                                        'id' : item.from.id,
                                        'name' : item.from.name,
                                        'avatar' : 'http://graph.facebook.com/'+item.from.id+'/picture'
                                    },
                                    'id' : item.id,
                                    'date' : epochDate(item.created_time),
                                    'text' : item.message,
                                    'source' : 'http://facebook.com/'+item.from.id,
                                    'weight' : 1
                                },callback)
                            }
                        })
                    }
                }
            },
            reddit: {
                methods : ['search'],
                interval : 5000,
                result_type : 'relevance', // new, relevence, top
                feed_url : 'http://www.reddit.com/search.json?q={{query}}{{#&sort=#result_type}}{{#&jsonp=#callback}}',
                parse : function(data,query,callback){
                    if (data.data.children[0]){
                        if (this.orig_url == null){
                            this.orig_url = this.feed_url
                        }
                        var before = data.data.children[0].data.name
                        if (before != null){
                            this.feed_url = this.orig_url + '&before=' + before
                        }
                        data.data.children.forEach(function(item){
                            var item = item.data
                            var weight = 0
                            if (item.score){
                                weight = item.score
                            }
                            if (item.ups){
                                weight = weight + item.ups
                            }
                            if (item.num_comments){
                                weight = weight + item.num_comments
                            }
                            if (item.likes){
                                weight = weight + item.likes
                            }
                            process({
                                'service' : 'reddit',
                                'type' : 'link',
                                'query' : query,
                                'user' : {
                                    'name' : item.author,
                                    'avatar' : ''
                                },
                                'id' : item.id,
                                'date' : item.created_utc,
                                'text' : item.title,
                                'links'  : [item.url],
                                'source' : item.url,
                                'thumbnail':'http://reddit.com' + item.thumbnail,
                                'weight' : weight
                            },callback)
                        })
                    }
                }
            },
            digg: {
                methods : ['search'],
                interval : 15000,
                feed_url : 'http://services.digg.com/2.0/search.search?query={{query}}&count=20&sort=date-desc&type=javascript{{#&callback=#callback}}',
                parse : function(data,query,callback){
                    if (data.stories[0]){
                        if (this.orig_url == null){
                            this.orig_url = this.feed_url
                        }
                        if (this.items_seen == null){
                            this.items_seen = {};
                        }
                        var min_date = data.stories[0].submit_date
                        if (min_date != null){
                            this.feed_url = this.orig_url + '&min_date=' + min_date
                        }
                        data.stories.forEach(function(item){
                            if (this.items_seen[item.id] == null){
                                this.items_seen[item.id] = true
                                var weight = 0
                                if (item.diggs){
                                    weight = item.diggs
                                }
                                if (item.comments){
                                    weight = weight + item.comments
                                }
                                process({
                                    'service' : 'digg',
                                    'type' : 'link',
                                    'query' : query,
                                    'user' : {
                                        'name' : item.user.name,
                                        'avatar' : item.user.icon,
                                    },
                                    'id' : item.id,
                                    'date' : item.submit_date,
                                    'text' : item.title,
                                    'links'  : [item.href],
                                    'source' : item.shorturl.short_url,
                                    'weight' : weight
                                },callback)
                            }
                        },this)
                    }
                }
            },
            picasa: {
                methods : ['search'],
                interval : 15000,
                feed_url : 'https://picasaweb.google.com/data/feed/api/all?q={{query}}&max-results=20&kind=photo&alt=json{{#&callback=#callback}}',
                parse : function(data,query,callback){
                    var newest_date
                    var newest_epoch
                    if (this.orig_url == null){
                        this.orig_url = this.feed_url
                    }
                    if (this.newest_date != null){
                        this.feed_url = this.orig_url + '&published-min=' + this.newest_date
                    }
                    if (this.items_seen == null){
                        this.items_seen = {};
                    }
                    if (data.feed.entry){
                        data.feed.entry.forEach(function(item){
                            if (this.items_seen[item.id.$t] == null){
                                var datetime = item.published.$t.split('.')[0]
                                var epoch = Date.parse(datetime)
                                if (!this.newest_epoch){
                                    this.newest_epoch = epoch
                                    this.newest_date = datetime
                                } else if (this.epoch > this.newest_epoch){
                                    newest_epoch = epoch
                                    this.newest_date = datetime
                                }
                                this.items_seen[item.id.$t] = true
                                var weight = 0
                                if (item.summary.$t){
                                    text = item.summary.$t
                                    weight = 1
                                } else {
                                    text = item.title.$t
                                }
                                if (item.gphoto$commentCoun){
                                    weight = weight + item.gphoto$commentCount
                                }
                                process({
                                    'service' : 'picasa',
                                    'type' : 'image',
                                    'query' : query,
                                    'user' : {
                                        'id' : item.author[0].gphoto$user.$t,
                                        'name' : item.author[0].name.$t,
                                        'avatar' : item.author[0].gphoto$thumbnail.$t
                                    },
                                    'id' : item.id.$t,
                                    'date' : epochDate(item.published.$t),
                                    'text' : item.title.$t,
                                    'source' : item.content.src,
                                    'source_img' : item.content.src,
                                    'thumbnail':item.media$group.media$thumbnail[1].url,
                                    'weight': weight,
                                },callback)
                            }
                        }, this)
                    }
                }
            },
            flickr: {
                methods : ['search'],
                interval : 10000,
                result_type : 'date-posted-desc',  // date-posted-asc, date-posted-desc, date-taken-asc, date-taken-desc, interestingness-desc, interestingness-asc, relevance
                api_key : '',
                url_suffix_auth : 'rest/?method=flickr.photos.search&',
                url_suffix_anon : 'feeds/photos_public.gne?',
                feed_url : 'http://api.flickr.com/services/{{url_suffix}}format=json{{#&sort=#result_type}}&tagmode=all&tags={{query}}{{#&jsoncallback=#callback}}&content_type=1&extras=date_upload,date_taken,owner_name,geo,tags,views,url_m,url_b{{#&api_key=#api_key}}',
                format_url : function(query){
                    if (this.api_key){
                        var url_suffix = this.url_suffix_auth
                    } else {
                        var url_suffix = this.url_suffix_anon
                    }
                    return { query: query
                           , url_suffix: url_suffix
                           , result_type: this.result_type
                           , api_key: this.api_key }
                },
                parse : function(data,query,callback){
                    if (this.items_seen == null){
                        this.items_seen = {};
                    }
                    if (this.api_key){
                        var items = data.photos.photo
                    } else {
                        var items = data.items
                    }
                    items && items.forEach(function(item){
                        if (this.api_key){
                            var id = item.id
                            if (item.url_m){
                                var thumbnail = item.url_m
                                var source_img = item.url_m.replace('.jpg','_b.jpg')
                            }
                            var username = item.ownername
                            var userid = item.owner
                        } else {
                            var id = item.media.m
                            var thumbnail = item.media.m
                            var source_img = item.media.m.replace('_m','_b')
                            var source = item.media.m.replace('_m','_b')
                            var username = item.author
                            var userid = item.author_id
                        }
                        var weight = 0
                        if (item.views){
                            weight = item.views
                        }
                        if (this.items_seen[id] == null){
                            this.items_seen[id] = true
                            process({
                                'service' : 'flickr',
                                'type' : 'image',
                                'query' : query,
                                'user' : {
                                    'id' : userid,
                                    'name' : username,
                                    'avatar' : ''
                                },
                                'id' : id,
                                'date' : epochDate(item.published),
                                'text' : item.title,
                                'source' : item.link,
                                'source_img' : source_img,
                                'thumbnail': thumbnail,
                                'weight' : weight
                            },callback)
                        }
                    }, this)
                }
            },
            youtube: {
                methods : ['search'],
                interval : 8000,
                result_type : 'videos',  //  videos,top_rated, most_popular, standard_feeds/most_recent, most_dicsussed, most_responded, recently_featured, on_the_web
                feed_suffix : '', // '', standardfeeds/ - if '' result_type must be 'videos'
                feed_url : 'http://gdata.youtube.com/feeds/api/{{feed_suffix}}{{result_type}}?q={{query}}&time=today&orderby=published&format=5&max-results=20&v=2&alt=jsonc{{#&callback=#callback}}',
                parse : function(data,query,callback){
                    if (this.items_seen == null){
                        this.items_seen = {};
                    }
                    if (data.data.items != null){
                        data.data.items.forEach(function(item){
                            if (this.items_seen[item.id] == null){
                                this.items_seen[item.id] = true
                                var weight = 0
                                if (item.views){
                                    var weight = item.stats.userCount
                                }
                                process({
                                    'service' : 'youtube',
                                    'type' : 'video',
                                    'query' : query,
                                    'user' : {
                                        'id' : item.uploader,
                                        'name' : item.uploader,
                                        'profile' : 'http://youtube.com/' + item.uploader,
                                        'avatar' : ''
                                    },
                                    'id' : item.id,
                                    'date' : epochDate(item.uploaded),
                                    'text' : item.title,
                                    'source' : 'http://youtu.be/'+ item.id,
                                    'thumbnail':'http://i.ytimg.com/vi/' + item.id + '/hqdefault.jpg',
                                    'weight' : weight,
                                },callback)
                            }
                        }, this)
                    }
                }
            },
            wordpress: {
                methods : ['search'],
                interval : 10000,
                feed_url : 'http://pipes.yahoo.com/pipes/pipe.run?_id=332d9216d8910ba39e6c2577fd321a6a&_render=json&u=http%3A%2F%2Fen.search.wordpress.com%2F%3Fq%3D{{query}}%26s%3Ddate%26f%3Djson{{#&_callback=#callback}}',
                parse : function(data,query,callback){
                    if (this.items_seen == null){
                        this.items_seen = {};
                    }
                    if (data != null){
                        data.value.items.forEach(function(item){
                            if (this.items_seen[item.guid] == null){
                                this.items_seen[item.guid] = true
                                process({
                                    'service' : 'wordpress',
                                    'type' : 'link',
                                    'query' : query,
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
                                    'weight' : 1,
                                },callback)
                            }
                        }, this)
                    }
                }
            },
            foursquare: {
                methods : ['search'],
                interval : 15000,
                client_id: '',
                client_secret: '',
                feed_url :'https://api.foursquare.com/v2/venues/search?query={{query}}{{#&ll=#latlog}}&limit=20{{#&client_id=#client_id}}{{#&client_secret=#client_secret}}{{#&callback=#callback}}',
                fetch_url : function(service,query,callback){
                    if (navigator.geolocation){
                        var options = this
                        navigator.geolocation.getCurrentPosition(function(position){
                            latlog = position.coords.latitude+","+position.coords.longitude
                            var feed_url = format( options.feed_url,
                                             { query:  query
                                             , latlog: latlog
                                             , client_id: options.client_id
                                             , client_secret: options.client_secret })
                            fetch(feed_url, service, query, callback)
                        },function(){
                            delete services.foursquare
                        })
                    }
                },
                parse : function(data,query,callback){
                    if (this.items_seen == null){
                        this.items_seen = {};
                    }
                    if (data.response.groups[0].items != null){
                        data.response.groups[0].items.forEach(function(item){
                            var item_key = item.id+"_"+item.stats.checkinsCount
                            if (this.items_seen[item_key] == null){
                                this.items_seen[item_key] = true
                                if (item.contact != undefined){
                                    if ('twitter' in oc(item.contact)){
                                        user_name = item.contact.twitter
                                    } else if (item.contact.formattedPhone){
                                        user_name = item.contact.formattedPhone
                                    } else if (item.contact.phone){
                                        user_name = item.contact.formattedPhone
                                    } else {
                                        user_name = ''
                                    }
                                }
                                var weight = 0
                                if (item.views){
                                    var weight = item.stats.userCount
                                }
                                process({
                                    'service' : 'foursquare',
                                    'type' : 'checkin',
                                    'geo' : item.location.lat+","+item.location.lng,
                                    'query' : query,
                                    'user' : {
                                        'name' : user_name,
                                    },
                                    'id' : item.id,
                                    'text' : item.name,
                                    'visits' : item.stats.checkinsCount,
                                    'subscribers' : item.stats.usersCount,
                                    'weight' : weight,
                                },callback)
                            }
                        }, this)
                    }
                }
            }
        }
})(this);
