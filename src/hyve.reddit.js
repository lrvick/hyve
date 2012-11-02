(function(root) {

    var hyve = (typeof require == 'function' && !(typeof define == 'function' && define.amd)) ? require('../src/hyve.core.js') : root.hyve

    hyve.feeds['reddit'] = {
        methods : ['search', 'popular'],
        interval : 5000,
        feed_urls : { // sort types: relevance, top, new
            search: 'http://www.reddit.com/search.json?q={{query}}&sort=relevance{{#&jsonp=#callback}}{{before}}',
            popular: 'http://www.reddit.com/search.json?q={{query}}&sort=top{{#&jsonp=#callback}}{{before}}'
        },
        format_url : function(query){
            var before_arg = ''
            if (this.before){
                before_arg = '&before='+this.before
            }
            return { query: query,
                     before: before_arg
                   }
        },
        parse : function(data,query,callback){
            if (data.data.children[0]){
                this.before = data.data.children[0].data.name
                data.data.children.forEach(function(item){
                    var weight = 1
                    var comments = ''
                    var likes = ''
                    var dislikes = ''
                    if (item.data.score){
                        weight = item.data.score
                    }
                    if (item.data.ups){
                        likes = item.data.ups
                        weight = weight + likes
                    }
                    if (item.data.downs){
                        dislikes = item.data.downs
                    }
                    if (item.data.num_comments){
                        comments = item.data.num_comments
                        weight = weight + comments
                    }
                    if (item.data.likes){
                        weight = weight + item.data.likes
                    }
                    links = []
                    if (item.data.url.search(/reddit.com/i) == -1){
                        links = [item.data.url]
                    }
                    var thumbnail = undefined
                    if (  item.data.thumbnail
                       && item.data.thumbnail != 'default'
                       ){
                        thumbnail == item.data.thumbnail
                    }
                    hyve.process({
                        'service' : 'reddit',
                        'type' : 'link',
                        'query' : query,
                        'user' : {
                            'name' : item.data.author,
                            'avatar' : ''
                        },
                        'likes' : likes,
                        'dislikes' : dislikes,
                        'comments' : comments,
                        'id' : item.data.id,
                        'date' : item.data.created_utc,
                        'text' : item.data.title,
                        'links'  : links,
                        'source' : item.data.url,
                        'thumbnail': thumbnail,
                        'weight' : weight
                    },callback)
                })
            }
        }
    }

})(this)
