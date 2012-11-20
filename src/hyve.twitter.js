(function(root) {

    var hyve = (typeof require == 'function' && !(typeof define == 'function' && define.amd)) ? require('../src/hyve.core.js') : root.hyve

    hyve.feeds.twitter = {
        methods : ['search', 'friends', 'popular'],
        interval : 2000,
        interval_friends : 60000,
        result_type : 'mixed', // mixed, recent, popular
        since_ids : {},
        oauth_consumer_key : '',
        oauth_nonce  : '',
        oauth_signature : '',
        oauth_signature_method : 'HMAC-SHA1',
        oauth_timestamp : '',
        oauth_token : '',
        oauth_version : '1.0',
        feed_urls : {
            search: 'http://search.twitter.com/search.json?q={{query}}&lang=en&include_entities=True{{#&result_type=#result_type}}{{since}}{{#&callback=#callback}}',
            friends: 'https://api.twitter.com/1/statuses/home_timeline.json',
            popular: 'http://search.twitter.com/search.json?q={{query}}&lang=en&rpp=25&include_entities=True{{#&result_type=#result_type}}{{since}}{{#&callback=#callback}}'
        },
        format_url : function(query){
            var since_arg
            if (this.since_ids[query]){
                since_arg = '&since_id='+this.since_ids[query]
            }
            return {
                      query: query
                    , result_type: this.result_type
                    , since: since_arg
                    , key: 'oauth_consumer_key='  + this.oauth_consumer_key
                    , nonce: '&oauth_nonce=' + this.oauth_nonce
                    , signature: '&oauth_signature=' + this.oauth_signature
                    , signature_method: '&oauth_signature_method=' + this.oauth_signature_method
                    , timestamp: '&oauth_timestamp=' + this.oauth_timestamp
                    , token: '&oauth_token=' + this.oauth_token
                    , version: '&oauth_version=' + this.oauth_version
            }
        },
        parsers : {
            search : function(data, query, callback){
                if (data.refresh_url){
                    hyve.feeds.twitter.since_ids[query] = data.refresh_url.replace(/\?since_id=([0-9]+).*/ig, "$1")
                }
                if (!this.items_seen){
                    this.items_seen = {}
                }
                if (data.results){
                    data.results.forEach(function(item){
                        if (!this.items_seen[item.id_str.toString()]){
                            this.items_seen[item.id_str.toString()] = true
                            var links = []
                            if (item.entities.urls) {
                                item.entities.urls.forEach(function(url){
                                    if(url.expanded_url){
                                        links.push(url.expanded_url)
                                    } else {
                                        links.push("http://"+url.url)
                                    }
                                })
                            }
                            var weight = 1
                            var likes = ''
                            if (item.metadata.result_type == 'popular'){
                                likes = item.metadata.recent_retweets
                                weight = likes
                            }

                            hyve.process({
                                'service' : 'twitter',
                                'type' : 'text',
                                'query' : query,
                                'user' : {
                                    'id' : item.from_user_id_str,
                                    'real_name': item.from_user_name,
                                    'name': item.from_user,
                                    'avatar' : item.profile_image_url,
                                    'profile' : "http://twitter.com/"+item.from_user
                                },
                                'likes' : likes,
                                'id' : item.id_str,
                                'date' : item.created_at,
                                'text' : item.text,
                                'links' : links,
                                'source' : 'http://twitter.com/'+
                                           item.from_user+
                                           '/status/'+item.id_str,
                                'weight' : weight
                            },callback)
                        }
                    },this)
                }
            },

            friends : function(data, query, callback) {
                if (data) {
                    if (!this.items_seen) this.items_seen = {}

                    data.forEach(function(item)  {

                        id = item.id_str

                        var weight = 1
                        if (item.retweet_count) {
                            weight = item.retweet_count
                        }

                        if (!this.items_seen[id]) {
                           this.items_seen[id] = true

                            hyve.process({
                                'service': 'twitter',
                                'type': 'text',
                                'query': query,
                                'user' : {
                                    'id': item.user.id_str,
                                    'name': item.user.screen_name,
                                    'real_name': item.user.name,
                                    'avatar': item.user.profile_image_url,
                                    'profile':  "http://twitter.com/" + item.user.screen_name
                                },
                                'id': id,
                                'date': item.created_at,
                                'text': item.text,
                                'source': "http://twitter.com/" + item.user.screen_name + "/status/" + id,
                                'weight': weight
                            }, callback)
                        }
                    }, this);
                }
            },

            popular: function(data, query, callback) {

                var sorted_items = []

                if (data.results) {
                    data.results.forEach(function(item) {
                        var weight = 1
                        var recent_retweets = item.metadata.recent_retweets
                        if (recent_retweets > 1) {
                            weight = recent_retweets
                        }
                        item.weight = weight
                        sorted_items.push(item)

                        item.links = []
                        if (item.entities.urls) {
                            item.entities.urls.forEach(function(url){
                                if(url.expanded_url){
                                    item.links.push(url.expanded_url)
                                } else {
                                    item.links.push("http://"+url.url)
                                }
                            })
                        }

                    })

                    sorted_items.sort(function(a, b) {
                        return b.weight - a.weight
                    })

                    sorted_items.forEach(function(item) {
                        hyve.process({
                            'service' : 'twitter',
                            'type' : 'text',
                            'query' : query,
                            'user' : {
                                'id' : item.from_user_id_str,
                                'avatar' : item.profile_image_url,
                                'profile' : "http://twitter.com/"+item.from_user
                            },
                            'id' : item.id_str,
                            'date' : item.created_at,
                            'text' : item.text,
                            'links' : item.links,
                            'source' : 'http://twitter.com/'+
                                       item.from_user+
                                       '/status/'+item.id_str,
                            'weight' : item.weight
                        }, callback)
                    }, this)

                }
            }
        }
    }
})(this)
