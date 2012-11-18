(function(root) {

    var hyve = (typeof require == 'function' && !(typeof define == 'function' && define.amd)) ? require('../src/hyve.core.js') : root.hyve

    hyve.feeds['facebook'] = {
        methods : ['search', 'friends', 'popular'],
        interval : 3000,
        interval_friends : 10000,
        access_token : '',
        feed_urls : {
            search: 'https://graph.facebook.com/search?q={{query}}&limit=25&type=post{{since}}{{#&callback=#callback}}',
            friends: 'https://graph.facebook.com/me/home?limit=25&type=post{{ access_token }}{{ since }}{{#&callback=#callback}}',
            popular: 'https://graph.facebook.com/search?q={{query}}&limit=25&type=post{{since}}{{#&callback=#callback}}'
        },
        format_url : function(query){
            var since_arg = ''
            if (this.since){
                since_arg = '&since='+this.since
            }
            return {
                      query: query
                    , since: since_arg
                    , access_token: '&access_token=' + this.access_token
            }
        },
        parsers : {
            search: function(data, query, callback){
                if (!data.error){
                    if (data.data.length > 0){
                        var date_obj = new Date(data.data[0].created_time)
                        hyve.feeds['facebook'].since = date_obj.getTime()/1000
                        data.data.forEach(function(item){

                        var type = 'text'
                        var thumbnail = undefined
                        var text = undefined
                        if (item.type == 'photo') {
                            thumbnail = item.picture.replace('_s','_n')
                            text = item.message
                            type = 'image'
                        }

                        if (item.message) {
                            text = item.message
                        } else if (item.description){
                            text = item.description
                        } else if (item.name){
                            text = item.name
                        }

                        var links = []
                        if (item.link){
                            links = [item.link]
                        }
                        var weight = 1
                        var likes = ''
                        if (item.likes) {
                            likes = item.likes.count
                            weight = likes
                        }

                        hyve.process({
                            'service' : 'facebook',
                            'type' : type,
                            'query' : query,
                            'user' : {
                                'id' : item.from.id,
                                'name' : item.from.name,
                                'avatar' : 'http://graph.facebook.com/'+
                                           item.from.id+'/picture',
                                'profile' : "http://facebook.com/"+item.from.id
                            },
                            'id' : item.id,
                            'links': links,
                            'date' : item.created_time,
                            'text' : text,
                            'thumbnail' : thumbnail,
                            'source' : 'http://facebook.com/'+item.from.id,
                            'likes': likes,
                            'weight' : weight
                        },callback)

                    },this)
                    }
                } else {
                    console.error('facebook error',data.error.message)
                }
            },
            friends: function(data, query, callback) {
                return hyve.feeds.facebook.parsers.search(data, query, callback)
            },
            popular: function(data, query, callback) {

                var sorted_items = []

                data.data && data.data.forEach(function(item) {
                    var weight = 1
                    if (item.likes) {
                        weight = item.likes.count
                    }
                    item.weight = weight
                    sorted_items.push(item)
                })

                // sort by weight
                sorted_items.sort(function(a, b) {
                    return b.weight - a.weight
                })

                sorted_items.forEach(function(item) {
                    var type = 'text'
                    var thumbnail = undefined
                    var text = undefined
                    if (item.type == 'photo') {
                        thumbnail = item.picture.replace('_s','_n')
                        text = item.message
                        type = 'image'
                    }

                    if (item.message) {
                        text = item.message
                    } else if (item.description){
                        text = item.description
                    } else if (item.name){
                        text = item.name
                    }

                    var links = []
                    if (item.link){
                        links = [item.link]
                    }
                    var weight = 1
                    var likes = ''
                    if (item.likes) {
                        likes = item.likes.count
                        weight = likes
                    }

                    hyve.process({
                        'service' : 'facebook',
                        'type' : type,
                        'query' : query,
                        'user' : {
                            'id' : item.from.id,
                            'name' : item.from.name,
                            'avatar' : 'http://graph.facebook.com/'+
                                       item.from.id+'/picture',
                            'profile' : "http://facebook.com/"+item.from.id
                        },
                        'id' : item.id,
                        'links': links,
                        'date' : item.created_time,
                        'text' : item.message,
                        'thumbnail': thumbnail,
                        'source' : 'http://facebook.com/'+item.from.id,
                        'weight' : item.weight
                    },callback)
                },this)

            }
        }
    }

})(this)
