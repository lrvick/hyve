(function(root) {

    var hyve = (typeof require == 'function' && !(typeof define == 'function' && define.amd)) ? require('../src/hyve.core.js') : root.hyve

    hyve.feeds['instagram'] = {
        methods : ['friends'],
        interval : 3000,
        interval_friends : 10000,
        access_token : '',
        feed_urls : {
            friends: 'https://api.instagram.com/v1/users/self/feed?limit=25&type=post{{ access_token }}{{ since }}{{#&callback=#callback}}'
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
            friends: function(data, query, callback){
                if (data.data.length > 0){
                    data.data.forEach(function(item){

                        hyve.process({
                            'service' : 'instagram',
                            'type' : 'image',
                            'query' : query,
                            'user' : {
                                'id' : item.user.id,
                                'name' : item.user.username,
                                'real_name' : item.user.full_name,
                                'avatar' : item.user.profile_picture
                            },
                            'id' : item.id,
                            'date' : item.created_time,
                            'text' : item.caption,
                            'thumbnail' : item.images.standard_resolution,
                            'comments' : item.comments.count,
                            'source' : item.link,
                            'likes' : item.likes.count,
                            'weight' : item.likes.count + item.comments.count
                        },callback)

                    },this)
                }
            }
        }
    }

})(this)
