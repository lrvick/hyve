(function(window, undefined) {
    var hyve = {
        stream: function(query,callback,custom_services){
            if (custom_services == undefined){
                services = hyve.feeds
            } else {
               services = []
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
                        //TODO: USMF Formatting
                        callback('twitter: ' + data.results[i].text)
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
                        //TODO: USMF Formatting
                        callback('identica: ' + data.results[i].text)
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
                        last_date = data.data.items[0].updated.split('.')[0]
                        this.feed_url = this.orig_url.replace('_QUERY_','_QUERY_%20AND%20date%3E' + last_date)
                    }
                    for (var i in data.data.items){
                        if (data.data.items[i].title != '-'){
                            //TODO: USMF Formatting
                            callback('buzz: ' + data.data.items[i].title)
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
                            //TODO: USMF Formatting
                            if (data.data[i].message != undefined){
                                callback('facebook: ' + data.data[i].message)
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
                            //TODO: USMF Formatting
                            callback('reddit: ' + data.data.children[i].data.title)
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
                        var item_id = data.items[i].media.m
                        if (this.items_seen[item_id] == undefined){
                            this.items_seen[item_id] = true
                            //TODO: USMF Formatting
                            callback('flickr: ' + data.items[i].description)
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
                        var item_id = data.data.items[i].id
                        if (this.items_seen[item_id] == undefined){
                            this.items_seen[item_id] = true
                            //TODO: USMF Formatting
                            callback('youtube: ' + data.data.items[i].description)
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
