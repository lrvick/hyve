(function(root) {

    var hyve = (typeof require == 'function' && !(typeof define == 'function' && define.amd)) ? require('../src/hyve.core.js') : root.hyve

    hyve.feeds['digg'] = {
        //methods : ['search'], disable until new digg API is implimented
        methods : [],
        interval : 15000,
        min_dates : {},
        feed_urls : {
            search: 'http://services.digg.com/2.0/search.search?query={{query}}&count=20&sort=date-desc&type=javascript{{#&callback=#callback}}'
        },
        format_url : function(query){
            var since_arg
            if (this.min_dates[query]){
                since_arg = '&min_date='+this.min_dates[query]
            }
            return { query: query,
                     since: since_arg }
        },
        parse : function(data,query,callback){
            if (data.stories[0]){
                if (!this.orig_url){
                    this.orig_url = this.feed_url
                }
                if (!this.items_seen){
                    this.items_seen = {}
                }
                var min_date = data.stories[0].submit_date
                if (min_date){
                    this.min_dates[query] = min_date
                }
                data.stories.forEach(function(item){
                    if (!this.items_seen[item.id]){
                        this.items_seen[item.id] = true
                        var weight = 0
                        if (item.diggs){
                            weight = item.diggs
                        }
                        if (item.comments){
                            weight = weight + item.comments
                        }
                        links = []
                        if (item.href.search(/digg.com/i) == -1){
                            links = [item.href]
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
                        },callback)
                    }
                },this)
            }
        }
    }

})(this)
