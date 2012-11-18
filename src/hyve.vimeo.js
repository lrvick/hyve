(function(root) {

    var hyve = (typeof require == 'function' && !(typeof define == 'function' && define.amd)) ? require('../src/hyve.core.js') : root.hyve

    hyve.feeds['vimeo'] = {
        methods : ['claim', 'friends'],
        oauth_version : '1.0',
        interval_friends : 60000,
        feed_urls : {
            friends: 'http://vimeo.com/api/v2/me/subscriptions.json'
        },
        claim : function(link,item,callback){
            if (link.search(/vimeo.com/i) != -1){
                item.links = []
                item.origin = item.service
                item.origin_id = item.id
                item.origin_source = item.source
                item.service = 'vimeo'
                item.type = 'video'
                item.id = item.source.replace(/.*com\/(.*)/ig,"$1")
                return item
            }
        },
        parsers: {
            friends: function(data, query, callback){
                if (data && data.length > 0) {
                    data.forEach(function(item){
                        var weight = 1
                        var likes = undefined
                        var comments = undefined
                        var views = undefined
                        if (item.stats_number_of_likes > 0) {
                            likes = item.stats_number_of_likes
                            weight = weight + likes
                        }
                        if (item.stats_number_of_comments > 0) {
                            comments = item.stats_number_of_comments
                            weight = weight + comments
                        }
                        if (item.stats_number_of_plays > 0) {
                            views = item.stats_number_of_plays
                            weight = weight + views
                        }
                        hyve.process({
                            'service' : 'vimeo',
                            'type' : 'video',
                            'query' : query,
                            'user' : {
                                'id' : item.user_id,
                                'name' : item.user_name,
                                'profile' : item.user_url,
                                'avatar' : item.user_portrait_small
                            },
                            'id' : item.id,
                            'date' : item.upload_date,
                            'text' : item.title,
                            'source' : item.url,
                            'thumbnail':item.thumbnail_large,
                            'comments': comments,
                            'likes': likes,
                            'views': views,
                            'weight': weight
                        }, callback)
                    })
                }
            }
        }
    }

})(this)
