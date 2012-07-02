(function(root) {

    var hyve = (typeof require == 'function') ? require('../src/hyve.core.js') : root.hyve

    hyve.feeds.twitter = {
        methods : ['search', 'friends'],
        interval : 2000,
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
            friends: 'https://api.twitter.com/1/statuses/home_timeline.json?{{ key }}{{ nonce }}{{ signature }}{{ signature_method }}{{ timestamp }}{{ token }}{{ version }}{{#&callback=#callback}}{{ since }}'
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
                            var weight = 0
                            if (item.metadata.result_type == 'popular'){
                                weight = 1
                            }
                            if (item.metadata.recent_retweets){
                                weight = weight + item.metadata.recent_retweets
                            }

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
                                'links' : links,
                                'source' : 'http://twitter.com/'+
                                           item.from_user+
                                           '/status/'+item.id,
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

                        if (!this.items_seen[id]) {
                           this.items_seen[id] = true

                            hyve.process({
                                'service': 'twitter',
                                'type': 'text',
                                'query': query,
                                'user' : {
                                    'id': item.user.id_str,
                                    'avatar': item.profile_image_url,
                                    'profile':  "http://twitter.com/" + item.user.screen_name
                                },
                                'id': id,
                                'date': item.created_at,
                                'text': item.text,
                                'source': "http://twitter.com/" + item.user.screen_name + "/status/" + id,
                                'weight': item.retweet_count
                            }, callback)
                        }
                    }, this);
                }
            }
        }
    }

})(this)
