var hiev = {
    jsonp : {
        counter: 0,
        fetch : function(url,callback) {
            var fn = 'callback_' + this.counter++;
            window[fn] = this.pass(callback);
            url = url.replace('=?', '=' + fn);
            var s = document.createElement('script');
            s.setAttribute('src',url);
            document.getElementsByTagName('head')[0].appendChild(s);
            service = 'reddit'
        },
        pass: function(callback){
            return function(data){
                if (!!window.Worker != undefined){
                    worker = window['worker']
                    worker.port.start()
                    worker.port.postMessage([data,service]);
                } else {
                    parsed_data = hiev[service].parse(data)
                    console.log('Non-Worker parsed_data:')
                    callback(parsed_data)
                }
            }
        }
    },
    stream: function(callback){
        if (!!window.Worker != undefined){
            if (window['worker'] == undefined){
                window['worker'] = new SharedWorker("worker.js")
            }
            worker = window['worker']
            worker.port.addEventListener("message", function(e) {
                console.log('Worker parsed_data:')
                callback(e.data)
            }, false);
        }
        this.reddit.stream(callback)
    },
    reddit: {
        stream : function(callback){
            hiev.jsonp.fetch("http://www.reddit.com/search.json?q=android&sort=new&jsonp=?",callback)
        },
        parse : function(data){
            //format data into USMF format here
            return data
        },
    },
}

hiev.stream(function(data){console.log(data)})

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

function reddit(query,element){
    setInterval(function() {
        var base_url = 'http://www.reddit.com/search.json'
        
        if (window.reddit_data == undefined){
            window.reddit_data = [];
        }
        if (window.reddit_data['refresh_url'] != undefined){
            url = window.reddit_data['refresh_url']
        } else {
            url = base_url + '?q=' + query + '&sort=new&jsonp=?'
        }
        console.log(url)
        $.getJSON(url,function(data) {
            if (data.data != undefined){
                window.reddit_data['refresh_url'] = base_url + '?q=' + query + '&sort=new&before=' + data.data.children[0].data.name + '&jsonp=?'
            }
            $.each(data.data.children, function(i,item) {
                $('<p>Reddit | '+ item.data.author + ' : <a href="http://reddit.com' + item.data.permalink+'">' + item.data.title + '</a></p>').hide().prependTo($(element)).show('slow')
            });
        });
    },5000)
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
