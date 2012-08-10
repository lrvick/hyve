(function(root) {

    var hyve = (typeof require == 'function' && !(typeof define == 'function' && define.amd)) ? require('../src/hyve.core.js') : root.hyve

    hyve.feeds['bitly'] = {
        methods : ['unshorten','claim'],
        login:'',
        api_key:'',
        feed_url : 'http://api.bitly.com/v3/expand?shortUrl={{short_url}}{{#&login=#login}}{{#&apiKey=#api_key}}&format=json{{#&callback=#callback}}',
        fetch_url : function(service,link,callback,item){
            var options = hyve.feeds.bitly
            var feed_url = hyve.format( options.feed_url,
                         { short_url: link,
                           login : options.login,
                           api_key: options.api_key})
            hyve.fetch(feed_url, 'bitly', link, callback, item)
        },
        claim : function(link,item,callback){
            if (link.search(/bit.ly|j.mp|bitly.com|tcrn.ch|nyti.ms|pep.si/i) != -1){
                hyve.feeds['bitly'].fetch_url('bitly',link,callback,item)
            }
        },
        parse : function(data,url,callback,item){
            //TODO make this actually handle multiple urls instead of cheating and assuming only one
            var long_urls = []
            if (data.data.expand){
                data.data.expand.forEach(function(link){
                    if (link.long_url){
                        long_urls.push(link.long_url)
                    }
                })
                if (long_urls.length > 0){
                    item.links = long_urls
                }
            }
            hyve.process(item,callback)
        }
    }

})(this)
