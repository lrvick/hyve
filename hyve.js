(function(root) {
    var get   = typeof require == 'function' && require('request');
    var hyve  = typeof exports != 'undefined'?  exports : root.hyve = { };

    // ECMA-262 compatible Array#forEach polyfills
    Array.prototype.forEach = Array.prototype.forEach || function(fn, ctx) {
        var len = this.length >>> 0;
        for (var i = 0; i < len; ++i){
            if (i in this){
                fn.call(ctx, this[i], i, this);
            }
        }
    };

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
        "use strict";
        return string.replace(
            /\{\{(?:#(.+?)#)?\s*(.+?)\s*\}\}/g,
            function(m, cond, id) {
                var rv = data[id];
                return rv? (cond || '') + rv : cond? m : '';
            }
       );
    }


    // Pulls data from several streams and handle all them with the given
    // callback
    function stream(query, callback, custom_services) {
        callback = callback || function(){};
        services = custom_services || Object.keys(hyve.feeds);
        if (custom_services){
            services = custom_services;
        } else {
            services = [];
            all_services = Object.keys(hyve.feeds);
            all_services.forEach(function(service){
               if ('search' in oc(hyve.feeds[service.toLowerCase()].methods)){
                   services.push(service.toLowerCase());
               }
            });
        }
        services.forEach(function(service){
            if (!hyve.feeds[service].orig_url == undefined ){
                hyve.feeds[service].orig_url = hyve.feeds[service].feed_url;
            }
            var options = hyve.feeds[service];
            var runFetch = function(){
                var feed_url;
                if (hyve.feeds[service].format_url){
                    feed_url = format( options.feed_url,
                                       hyve.feeds[service].format_url(query));
                } else {
                    feed_url = format( options.feed_url,
                                    {  query:  query,
                                       url_suffix: options.url_suffix,
                                       result_type: options.result_type,
                                       api_key: options.api_key });
                }
                if (hyve.feeds[service].fetch_url){
                    hyve.feeds[service].fetch_url(service,query,callback);
                } else {
                    fetch(feed_url, service, query, callback);
                }
            };
            runFetch();
            hyve.feeds[service].lock = setInterval(function(){
                runFetch();
            }, options.interval);
        });
    }

    // Stops any running streams for iven services
    function stop(custom_services) {
        var services;
        services = custom_services || Object.keys(hyve.feeds);
        services.forEach(function(service){
            if (hyve.feeds[service].lock) {
                hyve.feeds[service].feed_url = hyve.feeds[service].orig_url;
                interval_id =  hyve.feeds[service].lock;
                clearInterval(interval_id);
            }
        });
    }

    // Gives some feeds the chance to claim an item as its own, then returns
    // list of claimed/reformatted items, or the unaltered origional
    function claim(item,callback){
        var new_items = [];
        var services = Object.keys(hyve.feeds);
        item.links.forEach(function(link){
            if (!hyve.links[link]){
                hyve.links[link] = true;
                services.forEach(function(service){
                    if (hyve.feeds[service].claim){
                        var new_item = hyve.feeds[service].claim(link,item);
                        if (new_item){
                            new_items.push(new_item);
                        }
                    }
                });
                if (link.search(/.jpg|.png|.gif/i) != -1){
                    var new_item = item;
                    new_item.links = [];
                    new_item.type = 'image';
                if (!new_item.source_img){
                    new_item.source_img = item.link;
                }
                if (!new_item.thumbnail){
                    new_item.thumbnail = item.link;
                }
                    new_items.push(new_item);
                }
            } else {
                new_items.push(item);
            }
        });
        if (new_items.length > 0){
            return new_items;
        } else {
            return false;
        }
    }

    // Place an item in an appropriate queue depending on its defined 'type'
    function enqueue(item){
        if(item){
            hyve.queue[item.type].sort(function(a,b){
                return b['date'] - a['date'];
            });
            if (hyve.recall === true){
                var last_date_key = item.service+':'+item.query+':last_date';
                var last_date = localStorage.getItem(last_date_key);
                if (!last_date){
                    last_date = 0;
                }
                if (item.date > last_date){
                    hyve.queue[item.type].unshift(item);
                    localStorage.setItem(last_date_key);
                }
            } else {
                hyve.queue[item.type].unshift(item);
            }
        } else {
            throw('enqueue: an undefined item was inputted');
        }
    }

    // Persistantly stores an item in the browser via localStorage
    function store(item){
        var items_key = item.type+':'+item.query;
        var items = localStorage.getItem(items_key);
        if (items){
            items = JSON.parse(items);
        } else {
            items = [];
        }
        var last_date_key = item.service+':'+item.query+':last_date';
        var last_date = localStorage.getItem(last_date_key);
        if (!last_date){
             last_date = 0;
        }
        if (item.date > last_date){
            items.unshift(item);
            localStorage.setItem(last_date_key);
        }
        trunc_items = items.splice(0,1000);
        try {
            localStorage.setItem(items_key,JSON.stringify(trunc_items));
        } catch(e) {
            console.log('store: localStorage quota has been exceeded. Emptying');
            localStorage.clear();
        }
    }

    // Recall previously saved items from localStorage
    function recall(type,query){
        var itemskey = type+':'+query;
        var items = JSON.parse(localStorage.getItem(itemskey)) || [];
        items.sort(function(a,b){
            return b['date'] - a['date'];
        });
        return items;
    }

    // Reset queue and refill it with any previously stored data if any exists
    function replenish(query,types){
        hyve.queue = {'text':[],'link':[],'video':[],'image':[],'checkin':[]};
        types = types || Object.keys(hyve.queue);
        types.forEach(function(type){
            hyve.queue[type] = recall(type,query);
        });
    }

    // Manually re-classify items as needed, check for dupes, send to callback
    function process(item,callback){
        if (item.date != parseInt(item.date,10)){
            var date_obj = new Date(item.date);
            item.date = date_obj.getTime()/1000;
        }
        items = [item];
        item.links = item.links || [];
        if (item.links.length > 0){
            items = claim(item,callback);
        }
        if (items){
            items.forEach(function(item){
                if (hyve.recall_enable){
                    store(item);
                }
                if (hyve.queue_enable){
                    enqueue(item);
                }
                callback(item);
            });
        }
    }

    // Fetches a JSON stream
    var fetch = function() {
        var counter   = 0;
        var callbacks = { };
        var head      = !get && document.getElementsByTagName('head')[0];

        // Returns a qualified identifier pointing to a callback
        function get_callback() {
            return format('hyve.callbacks.f{{id}}', { id: ++counter });
        }

        // Cleanup script leftovers from DOM
        function cleanup(script){
            head.removeChild(script);
            for (var property in script){
                delete script[property];
            }
        }

        // Requires an URI using JSONP
        function jsonp(url, callback) {
            var s = document.createElement('script');
            s.setAttribute('src', url);
            var wrap_callback = function(){
                cleanup(s);
                return callback.apply(this,arguments);
            };
            hyve.callbacks['f' + counter] = wrap_callback;
            head.appendChild(s);
        }

        // Requires an URI using Node.js's request library
        function request(url, callback) {
            get({uri: url}, function(error, res, data) {
                try {
                    callback(JSON.parse(data));
                } catch(e){
                    callback({ }, e);
                }
            });
        }

        // Abstracts fetching URIs.
        function fetch(url, service, query, callback, item) {
            var fn = pass(service, query, callback, item);
            var cb = !get && get_callback();
            url    = format(url, { callback: cb });
            var fetcher = get? request : jsonp;
            script = fetcher(url, fn);
        }

        // Higher-order function to process the fetched data
        function pass(service, query, callback, item) {
            return function(data) {
                hyve.feeds[service].parse(data, query, callback, item);
            };
        }

        // Export the `fetch` function
        return fetch;
    }();


    // Exports data to the outside world
    hyve.stream = stream;
    hyve.stop = stop;
    hyve.process = process;
    hyve.format = format;
    hyve.fetch = fetch;
    hyve.recall = recall;
    hyve.recall_enable = false;
    hyve.replenish = replenish;
    hyve.queue = {'text':[],'link':[],'video':[],'image':[],'checkin':[]};
    hyve.queue_enable = false;
    hyve.callbacks = [];
    hyve.links = {};
    hyve.feeds = {};

})(this);


//Various service specific modules

hyve.feeds['imgur'] = {
    methods : ['claim'],
    claim : function(link,item){
        if (link.search(/http:\/\/(www|i)?\.?imgur.com\/(?!a)(?!gallery\/)([-|~_0-9A-Za-z]+)\.?&?.*?/ig) != -1){
            item.links = [];
            item.origin = item.service;
            item.origin_id = item.id;
            item.origin_source = item.source;
            item.service = 'imgur';
            item.type = 'image';
            item.id = link.replace(/.*imgur.com\/(r\/[A-Za-z]+\/)?([-|~_0-9A-Za-z]+).*/ig, "$2");
            item.source = 'http://imgur.com/'+item.id;
            item.source_img = 'http://i.imgur.com/'+item.id+'.jpg';
            item.thumbnail = 'http://i.imgur.com/'+item.id+'l.jpg';
            return item;
        }
    }
};

hyve.feeds['vimeo'] = {
    methods : ['claim'],
    claim : function(link,item,callback){
        if (link.search(/vimeo.com/i) != -1){
            item.links = [];
            item.origin = item.service;
            item.origin_id = item.id;
            item.origin_source = item.source;
            item.service = 'vimeo';
            item.type = 'video';
            item.id = item.source.replace(/.*com\/(.*)/ig,"$1");
            return item;
        }
    }
};

hyve.feeds['bitly'] = {
    methods : ['unshorten','claim'],
    login:'',
    api_key:'',
    feed_url : 'http://api.bitly.com/v3/expand?shortUrl={{short_url}}{{#&login=#login}}{{#&apiKey=#api_key}}&format=json{{#&callback=#callback}}',
    fetch_url : function(service,link,callback,item){
        var options = hyve.feeds.bitly;
        var feed_url = hyve.format( options.feed_url,
                     { short_url: link,
                       login : options.login,
                       api_key: options.api_key});
        hyve.fetch(feed_url, 'bitly', link, callback, item);
    },
    claim : function(link,item,callback){
        if (link.search(/bit.ly|j.mp|bitly.com|tcrn.ch|nyti.ms|pep.si/i) != -1){
            hyve.feeds['bitly'].fetch_url('bitly',link,callback,item);
        }
    },
    parse : function(data,url,callback,item){
        //TODO make this actually handle multiple urls instead of cheating and assuming only one
        var long_urls = [];
        if (data.data.expand){
            data.data.expand.forEach(function(link){
                if (link.long_url){
                    long_urls.push(link.long_url);
                }
            });
            if (long_urls.length > 0){
                item.links = long_urls;
            }
        }
        hyve.process(item,callback);
    }
};

hyve.feeds['twitter'] = {
    methods : ['search'],
    interval : 2000,
    result_type : 'mixed', // mixed, recent, popular
    feed_url :'http://search.twitter.com/search.json?q={{query}}&lang=en&include_entities=True&{{#&result_type=#result_type}}{{#&callback=#callback}}',
    parse : function(data,query,callback){
        if (data.refresh_url){
            this.feed_url = 'http://search.twitter.com/search.json' +
                            data.refresh_url +
                            '{{#&callback=#callback}}';
        }
        if (!this.items_seen){
            this.items_seen = {};
        }
        if (data.results){
            data.results.forEach(function(item){
                if (!this.items_seen[item.id_str.toString()]){
                    this.items_seen[item.id_str.toString()] = true;
                    var links = [];
                    if (item.entities.urls) {
                        item.entities.urls.forEach(function(url){
                            links.push(url.expanded_url);
                        });
                    }
                    var weight = 0;
                    if (item.metadata.result_type == 'popular'){
                        weight = 1;
                    }
                    if (item.metadata.recent_retweets){
                        weight = weight + item.metadata.recent_retweets;
                    }
                    hyve.process({
                        'service' : 'twitter',
                        'type' : 'text',
                        'query' : query,
                        'user' : {
                            'id' : item.from_user_id_str,
                            'name' : item.from_user,
                            'avatar' : item.profile_image_url
                        },
                        'id' : item.id_str,
                        'date' : item.created_at,
                        'text' : item.text,
                        'links' : links,
                        'source' : 'http://twitter.com/'+
                                   item.from_user+
                                   '/status/'+item.id,
                        'weight' : weight
                    },callback);
                }
            },this);
        }
    }
};

hyve.feeds['identica'] = {
    methods : ['search'],
    interval : 6000,
    feed_url :'http://identi.ca/api/search.json?lang=en&q={{query}}{{#&callback=#callback}}',
    parse : function(data,query,callback){
        if (data.refresh_url){
            this.feed_url = 'http://identi.ca/api/search.json'+
                            data.refresh_url+
                            '{{#&callback=#callback}}';
        }
        data.results.forEach(function(item){
            hyve.process({
                'service' : 'identica',
                'type' : 'text',
                'query' : query,
                'user' : {
                    'id' : item.from_user_id_str,
                    'name' : item.from_user,
                    'avatar' : item.profile_image_url
                },
                'id' : item.id,
                'date' : item.created_at,
                'text' : item.text,
                'source' : item.source,
                'weight' : 1
            },callback);
        });
    }
};

hyve.feeds['facebook'] = {
    methods : ['search'],
    interval : 3000,
    feed_url : 'https://graph.facebook.com/search?q={{query}}&limit=25&type=post{{since}}{{#&callback=#callback}}',
    format_url : function(query){
        var since_arg = '';
        if (this.since){
            since_arg = '&since='+this.since;
        }
        return { query: query,
                 since: since_arg};
    },
    parse : function(data,query,callback){
        if (data.data.length > 0){
            var date_obj = new Date(data.data[0].created_time);
            this.since = date_obj.getTime()/1000;
            data.data.forEach(function(item){
                if (item.message){
                    var links = [];
                    if (item.link){
                        links = [item.link];
                    }
                    hyve.process({
                        'service' : 'facebook',
                        'type' : 'text',
                        'query' : query,
                        'user' : {
                            'id' : item.from.id,
                            'name' : item.from.name,
                            'avatar' : 'http://graph.facebook.com/'+
                                       item.from.id+'/picture'
                        },
                        'id' : item.id,
                        'links': links,
                        'date' : item.created_time,
                        'text' : item.message,
                        'source' : 'http://facebook.com/'+item.from.id,
                        'weight' : 1
                    },callback);
                }
            },this);
        }
    }
};

hyve.feeds['reddit'] = {
    methods : ['search'],
    interval : 5000,
    result_type : 'relevance', // new, relevence, top
    feed_url : 'http://www.reddit.com/search.json?q={{query}}{{#&sort=#result_type}}{{#&jsonp=#callback}}{{before}}',
    format_url : function(query){
        var before_arg = '';
        if (this.before){
            before_arg = '&before='+this.before;
        }
        return { query: query,
                 before: before_arg,
                 result_type: this.result_type};
    },
    parse : function(data,query,callback){
        if (data.data.children[0]){
            this.before = data.data.children[0].data.name;
            data.data.children.forEach(function(item){
                var weight = 0;
                if (item.data.score){
                    weight = item.data.score;
                }
                if (item.data.ups){
                    weight = weight + item.data.ups;
                }
                if (item.data.num_comments){
                    weight = weight + item.data.num_comments;
                }
                if (item.data.likes){
                    weight = weight + item.data.likes;
                }
                links = [];
                if (item.data.url.search(/reddit.com/i) == -1){
                    links = [item.data.url];
                }
                hyve.process({
                    'service' : 'reddit',
                    'type' : 'link',
                    'query' : query,
                    'user' : {
                        'name' : item.data.author,
                        'avatar' : ''
                    },
                    'id' : item.data.id,
                    'date' : item.data.created_utc,
                    'text' : item.data.title,
                    'links'  : links,
                    'source' : item.data.url,
                    'thumbnail': item.data.thumbnail,
                    'weight' : weight
                },callback);
            });
        }
    }
};

hyve.feeds['digg'] = {
    methods : ['search'],
    interval : 15000,
    feed_url : 'http://services.digg.com/2.0/search.search?query={{query}}&count=20&sort=date-desc&type=javascript{{#&callback=#callback}}',
    parse : function(data,query,callback){
        if (data.stories[0]){
            if (!this.orig_url){
                this.orig_url = this.feed_url;
            }
            if (!this.items_seen){
                this.items_seen = {};
            }
            var min_date = data.stories[0].submit_date;
            if (min_date){
                this.feed_url = this.orig_url + '&min_date=' + min_date;
            }
            data.stories.forEach(function(item){
                if (!this.items_seen[item.id]){
                    this.items_seen[item.id] = true;
                    var weight = 0;
                    if (item.diggs){
                        weight = item.diggs;
                    }
                    if (item.comments){
                        weight = weight + item.comments;
                    }
                    links = [];
                    if (item.href.search(/digg.com/i) == -1){
                        links = [item.href];
                    }
                    hyve.process({
                        'service' : 'digg',
                        'type' : 'link',
                        'query' : query,
                        'user' : {
                            'name' : item.user.name,
                            'avatar' : item.user.icon
                        },
                        'id' : item.id,
                        'date' : item.submit_date,
                        'text' : item.title,
                        'links'  : links,
                        'source' : item.shorturl.short_url,
                        'weight' : weight
                    },callback);
                }
            },this);
        }
    }
};

hyve.feeds['delicious'] = {
    methods : ['search'],
    interval : 15000,
    feed_url : 'http://feeds.delicious.com/v2/json/tag/{{query}}?count=20{{#&callback=#callback}}',
    parse : function(data,query,callback){
        if (!this.items_seen){
            this.items_seen = {};
        }
        if (data[0]){
            data.forEach(function(item){
                if (!this.items_seen[item.u]){
                    this.items_seen[item.u] = true;
                    hyve.process({
                        'service' : 'delicious',
                        'type' : 'link',
                        'query' : query,
                        'user' : {
                            'name' : item.a
                        },
                        'id' : item.u,
                        'date' : item.dt,
                        'text' : item.d,
                        'links'  : [item.u],
                        'source' : item.u,
                        'weight' : 1
                    },callback);
                }
            },this);
        }
    }
};

hyve.feeds['picasa'] = {
    methods : ['search'],
    interval : 15000,
    feed_url : 'https://picasaweb.google.com/data/feed/api/all?q={{query}}&max-results=20&kind=photo&alt=json{{#&callback=#callback}}',
    parse : function(data,query,callback){
        var newest_date;
        var newest_epoch;
        if (!this.orig_url){
            this.orig_url = this.feed_url;
        }
        if (this.newest_date){
            this.feed_url = this.orig_url + '&published-min=' + this.newest_date;
        }
        if (!this.items_seen){
            this.items_seen = {};
        }
        if (data.feed.entry){
            data.feed.entry.forEach(function(item){
                if (!this.items_seen[item.id.$t]){
                    var datetime = item.published.$t.split('.')[0];
                    var epoch = Date.parse(datetime);
                    if (!this.newest_epoch){
                        this.newest_epoch = epoch;
                        this.newest_date = datetime;
                    } else if (this.epoch > this.newest_epoch){
                        newest_epoch = epoch;
                        this.newest_date = datetime;
                    }
                    this.items_seen[item.id.$t] = true;
                    var weight = 0;
                    if (item.summary.$t){
                        text = item.summary.$t;
                        weight = 1;
                    } else {
                        text = item.title.$t;
                    }
                    if (item.gphoto$commentCount){
                        weight = weight + item.gphoto$commentCount;
                    }
                    hyve.process({
                        'service' : 'picasa',
                        'type' : 'image',
                        'query' : query,
                        'user' : {
                            'id' : item.author[0].gphoto$user.$t,
                            'name' : item.author[0].name.$t,
                            'avatar' : item.author[0].gphoto$thumbnail.$t
                        },
                        'id' : item.id.$t,
                        'date' : item.published.$t,
                        'text' : item.title.$t,
                        'source' : item.content.src,
                        'source_img' : item.content.src,
                        'thumbnail':item.media$group.media$thumbnail[1].url,
                        'weight': weight
                    },callback);
                }
            }, this);
        }
    }
};

hyve.feeds['flickr'] = {
    methods : ['search'],
    interval : 10000,
    result_type : 'date-posted-desc',  // date-posted-asc, date-posted-desc, date-taken-asc, date-taken-desc, interestingness-desc, interestingness-asc, relevance
    api_key : '',
    url_suffix_auth : 'rest/?method=flickr.photos.search&',
    url_suffix_anon : 'feeds/photos_public.gne?',
    feed_url : 'http://api.flickr.com/services/{{url_suffix}}&per_page=20&format=json{{#&sort=#result_type}}&tagmode=all&tags={{query}}{{#&jsoncallback=#callback}}&content_type=1&extras=date_upload,date_taken,owner_name,geo,tags,views,url_m,url_b{{#&api_key=#api_key}}',
    format_url : function(query){
        var url_suffix;
        if (this.api_key){
            url_suffix = this.url_suffix_auth;
        } else {
            url_suffix = this.url_suffix_anon;
        }
        return { query: query,
                 url_suffix: url_suffix,
                 result_type: this.result_type,
                 api_key: this.api_key };
    },
    parse : function(data,query,callback){
        if (!this.items_seen){
            this.items_seen = {};
        }
        var items;
        if (this.api_key){
            items = data.photos.photo;
        } else {
            items = data.items;
        }
        items && items.forEach(function(item){
            var id, thumbnail, source_img, userid, username, source;
            if (this.api_key){
                id = item.id;
                if (item.url_m){
                    thumbnail = item.url_m;
                    source_img = item.url_m.replace('.jpg','_b.jpg');
                }
                username = item.ownername;
                userid = item.owner;
            } else {
                id = item.media.m;
                thumbnail = item.media.m;
                source_img = item.media.m.replace('_m','_b');
                source = item.media.m.replace('_m','_b');
                username = item.author;
                userid = item.author_id;
            }
            var weight = 0;
            if (item.views){
                weight = item.views;
            }
            if (!this.items_seen[id]){
                this.items_seen[id] = true;
                hyve.process({
                    'service' : 'flickr',
                    'type' : 'image',
                    'query' : query,
                    'user' : {
                        'id' : userid,
                        'name' : username,
                        'avatar' : ''
                    },
                    'id' : id,
                    'date' : item.dateupload,
                    'text' : item.title,
                    'source' : item.link,
                    'source_img' : source_img,
                    'thumbnail': thumbnail,
                    'weight' : weight
                },callback);
            }
        }, this);
    }
};

hyve.feeds['youtube'] = {
    methods : ['search','claim'],
    interval : 8000,
    result_type : 'videos',  //  videos,top_rated, most_popular, standard_feeds/most_recent, most_dicsussed, most_responded, recently_featured, on_the_web
    feed_suffix : '', // '', standardfeeds/ - if '' result_type must be 'videos'
    feed_url : 'http://gdata.youtube.com/feeds/api/{{feed_suffix}}{{result_type}}?q={{query}}&time=today&orderby=published&format=5&max-results=20&v=2&alt=jsonc{{#&callback=#callback}}',
    claim : function(link,item){
        if (link.search(/youtu.be|youtube.com.*v=/i) != -1){
            item.links = [];
            item.origin = item.service;
            item.origin_id = item.id;
            item.origin_source = item.source;
            item.service = 'youtube';
            item.type = 'video';
            if (link.search(/youtu.be/i) != -1){
                item.id = link.replace(/.*be\/([a-zA-Z0-9_-]+).*/ig,"$1");
            }
            if (link.search(/youtube.com/i) != -1){
                item.id = link.split("v=")[1].substring(0,11);
            }
            item.source = 'http://youtu.be/'+item.id;
            item.thumbnail = 'http://i.ytimg.com/vi/' + item.id + '/hqdefault.jpg';
            return item;
        }
    },
    parse : function(data,query,callback){
        if (!this.items_seen){
            this.items_seen = {};
        }
        if (data.data.items){
            data.data.items.forEach(function(item){
                if (!this.items_seen[item.id]){
                    this.items_seen[item.id] = true;
                    var weight = 0;
                    if (item.views){
                        weight = item.stats.userCount;
                    }
                    hyve.process({
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
                        'date' : item.uploaded,
                        'text' : item.title,
                        'source' : 'http://youtu.be/'+ item.id,
                        'thumbnail':'http://i.ytimg.com/vi/' + item.id + '/hqdefault.jpg',
                        'weight' : weight
                    },callback);
                }
            }, this);
        }
    }
};

hyve.feeds['wordpress'] = {
    methods : ['search'],
    interval : 10000,
    feed_url : 'http://pipes.yahoo.com/pipes/pipe.run?_id=332d9216d8910ba39e6c2577fd321a6a&_render=json&u=http%3A%2F%2Fen.search.wordpress.com%2F%3Fq%3D{{query}}%26s%3Ddate%26f%3Djson{{#&_callback=#callback}}',
    parse : function(data,query,callback){
        if (!this.items_seen){
            this.items_seen = {};
        }
        if (data){
            data.value.items[0].json.forEach(function(item){
                if (!this.items_seen[item.guid]){
                    this.items_seen[item.guid] = true;
                    hyve.process({
                        'service' : 'wordpress',
                        'type' : 'link',
                        'query' : query,
                        'user' : {
                            'id' : item.author,
                            'name' : item.author,
                            'profile' :'',
                            'avatar' : ''
                        },
                        'id' : item.guid,
                        'date' : item.epoch_time,
                        'text' : item.title,
                        'description':item.content,
                        'source' : item.guid,
                        'weight' : 1
                    },callback);
                }
            }, this);
        }
    }
};

hyve.feeds['foursquare'] = {
    methods : ['search'],
    interval : 15000,
    client_id: '',
    client_secret: '',
    feed_url :'https://api.foursquare.com/v2/venues/search?query={{query}}{{#&ll=#latlog}}&limit=20{{#&client_id=#client_id}}{{#&client_secret=#client_secret}}{{#&callback=#callback}}',
    fetch_url : function(service,query,callback){
        if (navigator.geolocation){
            var options = this;
            navigator.geolocation.getCurrentPosition(function(position){
                latlog = position.coords.latitude+","+position.coords.longitude;
                var feed_url = hyve.format( options.feed_url,
                                 { query:  query,
                                   latlog: latlog,
                                   client_id: options.client_id,
                                   client_secret: options.client_secret });
                hyve.fetch(feed_url, service, query, callback);
            },function(){
                delete services.foursquare;
            });
        }
    },
    parse : function(data,query,callback){
        if (!this.items_seen){
            this.items_seen = {};
        }
        if (data.response.groups[0].items){
            data.response.groups[0].items.forEach(function(item){
                var item_key = item.id+"_"+item.stats.checkinsCount;
                if (!this.items_seen[item_key]){
                    this.items_seen[item_key] = true;
                    if (item.contact != undefined){
                        if (item.contact.twitter){
                            user_name = item.contact.twitter;
                        } else if (item.contact.formattedPhone){
                            user_name = item.contact.formattedPhone;
                        } else if (item.contact.phone){
                            user_name = item.contact.formattedPhone;
                        } else {
                            user_name = '';
                        }
                    }
                    var weight = 0;
                    if (item.views){
                        weight = item.stats.userCount;
                    }
                    date_obj = new Date();
                    date = date_obj.getTime();
                    hyve.process({
                        'service' : 'foursquare',
                        'type' : 'checkin',
                        'date' : date,
                        'geo' : item.location.lat+","+item.location.lng,
                        'query' : query,
                        'user' : {
                            'name' : user_name
                        },
                        'id' : item.id,
                        'text' : item.name,
                        'visits' : item.stats.checkinsCount,
                        'subscribers' : item.stats.usersCount,
                        'weight' : weight
                    },callback);
                }
            },this);
        }
    }
};
