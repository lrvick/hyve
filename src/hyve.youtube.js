(function(root) {

    var hyve = (typeof require == 'function' && !(typeof define == 'function' && define.amd)) ? require('../src/hyve.core.js') : root.hyve

    hyve.feeds['youtube'] = {
        methods : ['search','claim', 'friends', 'popular'],
        interval : 8000,
        result_type : 'videos',  //  videos,top_rated, most_popular, standard_feeds/most_recent, most_dicsussed, most_responded, recently_featured, on_the_web
        feed_suffix : '', // '', standardfeeds/ - if '' result_type must be 'videos'
        access_token : '',
        token_timeout: 60000,
        feed_urls : {
            search: 'http://gdata.youtube.com/feeds/api/{{feed_suffix}}{{result_type}}?q={{query}}&time=today&orderby=published&format=5&max-results=20&v=2&alt=jsonc{{#&callback=#callback}}',
            friends: 'https://gdata.youtube.com/feeds/api/users/default/newsubscriptionvideos?v=2&alt=jsonc&access_token={{ access_token }}{{#&callback=#callback}}',
            popular: 'http://gdata.youtube.com/feeds/api/{{feed_suffix}}{{result_type}}?q={{query}}&time=today&orderby=viewCount&format=5&max-results=20&v=2&alt=jsonc{{#&callback=#callback}}'
        },
        token_update : function(){
            console.log('The Google API token has expired. \nOverride hyve.feeds.youtube.token_update with your own handler to obtain a new token');
        },
        claim : function(link,item){
            if (link.search(/youtu.be|youtube.com.*v=/i) != -1){
                item.links = []
                item.origin = item.service
                item.origin_id = item.id
                item.origin_source = item.source
                item.service = 'youtube'
                item.type = 'video'
                if (link.search(/youtu.be/i) != -1){
                    item.id = link.replace(/.*be\/([a-zA-Z0-9_-]+).*/ig,"$1")
                }
                if (link.search(/youtube.com/i) != -1){
                    item.id = link.split("v=")[1].substring(0,11)
                }
                item.source = 'http://youtu.be/'+item.id
                item.thumbnail = 'http://i.ytimg.com/vi/' + item.id + '/hqdefault.jpg'
                return item
            }
        },
        parsers : {
            search: function(data,query,callback){
                if (!this.items_seen){
                    this.items_seen = {}
                }

                items = data.data.items

                if (items) {
                    items.forEach(function(item){
                        var weight = 1

                        if (!this.items_seen[item.id]) {
                            this.items_seen[item.id] = true
                            var favorites = undefined
                            var comments = undefined
                            var rates = undefined
                            var views = undefined
                            if (item.commentCount && item.commentCount > 0 ){
                                comments = item.commentCount
                                weight = weight+comments
                            }
                            if (item.favoriteCount && item.favoriteCount > 0 ){
                                favorites = item.favoriteCount
                                weight = weight+favorites
                            }
                            if (item.ratingCount && item.ratingCount > 0){
                                rates = item.ratingCount
                                weight = weight+rates
                            }
                            if (item.viewCount && item.viewCount > 0){
                                views = item.viewCount
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
                                'comments': comments,
                                'rates': rates,
                                'favorites': favorites,
                                'text' : item.title,
                                'source' : 'http://youtu.be/'+ item.id,
                                'thumbnail':'http://i.ytimg.com/vi/' + item.id + '/hqdefault.jpg',
                                'views': views,
                                'weight': weight
                            }, callback)
                        }
                    }, this)
                }
            },
            friends : function(data, query, callback) { //the friends method is mostly identical to search
                return this.search(data, query, callback)
            },
            popular: function(data, query, callback) {
                var sorted_items = []

                items = data.data.items

                if (items) {
                    items.forEach(function(item) {
                        item.weight = 1
                        if (item.likeCount > 1)
                            item.weight = item.likeCount
                        sorted_items.push(item)
                    }, this)
                }

                if(sorted_items) {

                    sorted_items.sort(function(a, b) {
                        return b.weight - a.weight
                    })

                    sorted_items.forEach(function(item) {
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
                            'weight' : item.weight
                        }, callback)

                    }, this)
                }

            }
        }
    }

})(this)
