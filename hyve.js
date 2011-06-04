(function(window, undefined) {
    var hyve = {
        stream: function(query,callback,custom_services){
            if (custom_services == undefined){
                var services = hyve.feeds
            } else {
               var services = []
               for (var i in custom_services){
                    services[custom_services[i]] = {}
                }
               
            }
            for (var service in services){
                setInterval((function(service) {
                    return function () {
                        var feed_url = hyve.feeds[service].feed_url.replace('_QUERY_', query);
                        var feed_url = feed_url.replace('_APIKEY_', hyve.feeds[service].api_key);
                        hyve.jsonp.fetch(feed_url,service,callback)
                    }
                }(service)),hyve.feeds[service].interval)
            }   
        },  
        jsonp : {
            counter: 0,
            fetch : function(url,service,callback) {
                var fn = 'callback_' + this.counter++;
                window[fn] = this.pass(service,callback);
                var url = url.replace('_CALLBACK_', fn);
                var s = document.createElement('script');
                s.setAttribute('src',url);
                document.getElementsByTagName('head')[0].appendChild(s);
            },
            pass: function(service,callback){
                return function(data){
                    hyve.feeds[service].parse(data,callback)
                }
            }
        },
        feeds: {
            twitter: {
                interval : 2000,
                feed_url :'http://search.twitter.com/search.json?q=_QUERY_&callback=_CALLBACK_',
                parse : function(data,callback){
                    if (data.refresh_url != undefined){
                        this.feed_url = 'http://search.twitter.com/search.json' + data.refresh_url+ '&callback=_CALLBACK_'
                    }
                    for (var i in data.results){
                        var item = data.results[i]
                        callback({
                            'service' : 'twitter',
                            'user' : {
                                'id' : item.from_user_id_str,
                                'name' : item.from_user,
                                'avatar' : item.profile_image_url,    
                            },
                            'id' : item.id_str,
                            'date' : item.created_at, //TODO: normalize
                            'text' : item.text,
                            'source' : item.source,
                        })
                    }
                }
            },
            identica: {
                interval : 6000,
                feed_url :'http://identi.ca/api/search.json?q=_QUERY_&callback=_CALLBACK_',
                parse : function(data,callback){
                    if (data.refresh_url != undefined){
                        this.feed_url = 'http://identi.ca/api/search.json' + data.refresh_url+ '&callback=_CALLBACK_'
                    }
                    for (var i in data.results){
                        var item = data.results[i]
                        callback({
                            'service' : 'identica',
                            'user' : {
                                'id' : item.from_user_id_str,
                                'name' : item.from_user,
                                'avatar' : item.profile_image_url,    
                            },
                            'id' : item.id_str,
                            'date' : item.created_at, //TODO: normalize
                            'text' : item.text,
                            'source' : item.source
                        })
                    }
                }
            },
            buzz: {
                interval : 5000,
                api_key: '',
                feed_url :'https://www.googleapis.com/buzz/v1/activities/search?q=_QUERY_&alt=json&orderby=published&callback=_CALLBACK_&key=_APIKEY_',
                parse : function(data,callback){
                    if (this.orig_url == undefined){
                        this.orig_url = this.feed_url
                    }
                    if (data.data.items != undefined){
                        var last_date = data.data.items[0].updated.split('.')[0]
                        this.feed_url = this.orig_url.replace('_QUERY_','_QUERY_%20AND%20date%3E' + last_date)
                    }
                    for (var i in data.data.items){
                        if (data.data.items[i].title != '-'){
                            var item = data.date.items[i]
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
                    }
                }
            },
            facebook: {
                interval : 3000,
                feed_url : 'https://graph.facebook.com/search?q=_QUERY_&type=post&callback=_CALLBACK_',
                parse : function(data,callback){
                    if (data.data != undefined){
                        if (data.paging != undefined) {
                            this.feed_url = data.paging.previous + '&callback=_CALLBACK_'
                        }
                        for (var i in data.data){
                            var item = data.data[i]
                            if (item.message != undefined){
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
                        }
                    }
                }
            },
            reddit: {
                interval : 5000,
                feed_url : 'http://www.reddit.com/search.json?q=_QUERY_&sort=new&jsonp=_CALLBACK_',
                parse : function(data,callback){
                    if (data.data.children[0]){
                        if (this.orig_url == undefined){
                            this.orig_url = this.feed_url
                        }
                        var before = data.data.children[0].data.name
                        if (before != undefined){
                            this.feed_url = this.orig_url + '&before=' + before 
                        }
                        for (var i in data.data.children){
                            var item = data.data.children[i].data
                            callback({
                                'service' : 'reddit',
                                'user' : {
                                    'id' : '',
                                    'name' : '',
                                    'avatar' : ''    
                                },
                                'id' : '',
                                'date' : '', //TODO: normalize
                                'text' : item.title,
                                'source' : '',
                                'thumbnail':''
                            })
                        }
                    }
                }
            },
            flickr: {
                interval : 10000,
                api_key : '',
                feed_url : 'http://api.flickr.com/services/feeds/photos_public.gne?format=json&tagmode=all&tags=_QUERY_&jsoncallback=_CALLBACK_&extras=date_upload,date_taken,owner_name,geo,tags,views',
                parse : function(data,callback){
                    if (this.items_seen == undefined){
                        this.items_seen = {};
                    }
                    for (var i in data.items){
                        var item = data.items[i]
                        if (this.items_seen[item.media.m] == undefined){
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
                    }
                }
            },
            youtube: {
                interval : 8000,
                feed_url : 'http://gdata.youtube.com/feeds/api/videos?q=_QUERY_&time=today&orderby=published&format=5&max-results=20&v=2&alt=jsonc&callback=_CALLBACK_',
                parse : function(data,callback){
                    if (this.items_seen == undefined){
                        this.items_seen = {};
                    }
                    for (var i in data.data.items){
                        var item = data.data.items[i]
                        if (this.items_seen[item.id] == undefined){
                            this.items_seen[item.id] = true
                            callback({
                                'service' : 'youtube',
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
                    }
                }
            }
        }
    }
    window.hyve = hyve;
})(window);

/*
$.getJSON('http://pipes.yahoo.com/pipes/pipe.run?_id=332d9216d8910ba39e6c2577fd321a6a&_render=json&u=http%3A%2F%2Fen.search.wordpress.com%2F%3Fq%3D' + query + '%26f%3Djson&_callback=?', function(data){                                  $('<h2>Wordpress</h2><hr>').appendTo($('body')).show('slow')
    $.each(data.value.items, function(i,item) {
        $('<p>'+ item.author + ' : ' + item.title + '</p>').hide().appendTo($('body')).show('slow')
    });
});
});*/
