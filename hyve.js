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
                        //console.log(service,hyve.feeds[service].feed_url)
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
                console.log(url)
                document.getElementsByTagName('head')[0].appendChild(s);
            },
            pass: function(service,callback){
                return function(data){
                    console.log(data)
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
            }
        }
    }
    window.hyve = hyve;
})(window);


/*

function twitter(query,element){
    setInterval(function() {
        var base_url = 'http://search.twitter.com/search.json'
        if (window.twitter_data == undefined){
            window.twitter_data = [];
        }
        if (window.twitter_data['refresh_url'] != undefined){
            url = window.twitter_data['refresh_url']
        } else {
            url = base_url + '?q=' + query + '&callback=?'
        }
        $.getJSON(url,function(data) {
            if (data['refresh_url'] != undefined){
                window.twitter_data['refresh_url'] = base_url + data['refresh_url'] + '&callback=?'
            }
            $.each(data.results, function() {
                $('<p> Twitter | '+ this.from_user + ' : ' + this.text + '</p>').hide().prependTo($(element)).show('slow')                    
            });                
        });
    },1000)
}

function flickr(query,element){
    setInterval(function() {
        var base_url = 'http://api.flickr.com/services/feeds/photos_public.gne'
        if (window.flickr_data == undefined){
            window.flickr_data = [];
        }
        if (window.flickr_data['refresh_url'] != undefined){
            url = window.flickr_data['refresh_url']
        } else {
            url = base_url + '?jsoncallback=?'
        }
        $.getJSON(url,{ tags: query,tagmode: "any",format: "json"},function(data) {
            $.each(data.items, function(i,item){                        
            //if (data.paging != undefined){
            //    window.reddit_data['refresh_url'] = data.paging.previous + '&callback=?'
            //}
                $("<img/>").attr("src", item.media.m).hide().prependTo($(element)).show('slow');                                        
            });                
        });                
    },5000)
}

/*
$.getJSON('http://pipes.yahoo.com/pipes/pipe.run?_id=332d9216d8910ba39e6c2577fd321a6a&_render=json&u=http%3A%2F%2Fen.search.wordpress.com%2F%3Fq%3D' + query + '%26f%3Djson&_callback=?', function(data){                                  $('<h2>Wordpress</h2><hr>').appendTo($('body')).show('slow')
    $.each(data.value.items, function(i,item) {
        $('<p>'+ item.author + ' : ' + item.title + '</p>').hide().appendTo($('body')).show('slow')
    });
});



function identica(query,element){
    setInterval(function() {
        var base_url = 'http://identi.ca/api/search.json'
        if (window.identica_data == undefined){
            window.identica_data = [];
        }
        if (window.identica_data['refresh_url'] != undefined){
            url = window.identica_data['refresh_url']
        } else {
            url = base_url + '?q=' + query + '&callback=?'
        }
        $.getJSON(url,function(data) {
            if (data['refresh_url'] != undefined){
                window.identica_data['refresh_url'] = base_url + data['refresh_url'] + '&callback=?'
            }
            $.each(data.results, function() {
                $('<p> Identica | '+ this.from_user + ' : ' + this.text + '</p>').hide().prependTo($(element)).show('slow')                    
            });                
        });
    },3000)
}

function facebook(query,element){
    setInterval(function() {
        var base_url = 'https://graph.facebook.com/search'
        
        if (window.facebook_data == undefined){
            window.facebook_data = [];
        }
        if (window.facebook_data['refresh_url'] != undefined){
            url = window.facebook_data['refresh_url']
        } else {
            url = base_url + '?q=' + query + '&type=post&callback=?'
        }
        $.getJSON(url,function(data) {
            if (data.paging != undefined){
                window.facebook_data['refresh_url'] = data.paging.previous + '&callback=?'
            }
            $.each(data['data'], function(i,item) {
                if (item['message'] != undefined){
                    $('<p>Facebook | '+ item['from']['name'] + ' : ' + item['message'] + '</p>').hide().prependTo($(element)).show('slow')
                }
            });                
        });
    },2000)
}

$.getJSON('http://gdata.youtube.com/feeds/api/videos?q='+query+'&format=5&max-results=20&v=2&alt=jsonc&callback=?',function(data) {
    $('<h2>Youtube</h2><hr>').appendTo($('body')).show('slow')
    $.each(data.data.items, function(i,item) {
        $("<iframe width='220' height='150' src='http://www.youtube.com/embed/" + item.id + "' frameborder='0' type='text/html'></iframe>").appendTo($('body')).show('slow')
    });
});
$.getJSON('https://www.googleapis.com/buzz/v1/activities/search?q='+query+'&alt=json&callback=?',function(data) {
    $('<h2>Buzz</h2><hr>').appendTo($('body')).show('slow')
    $.each(data.data.items, function(i,item) {
        $('<p>'+ item.actor.name + ' : ' + item.title + '</p>').hide().appendTo($('body')).show('slow')
    });
});*/
