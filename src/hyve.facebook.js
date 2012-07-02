(function(root) {

    var hyve = (typeof require == 'function') ? require('../src/hyve.core.js') : root.hyve

    hyve.feeds['facebook'] = {
        methods : ['search', 'friends'],
        interval : 3000,
        access_token : '',
        feed_urls : {
            search: 'https://graph.facebook.com/search?q={{query}}&limit=25&type=post{{since}}{{#&callback=#callback}}',
            friends: 'https://graph.facebook.com/me/home?limit=25&type=post{{ access_token }}{{ since }}{{#&callback=#callback}}'
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
        parse : function(data, query, callback){
            if (data.data.length > 0){
                var date_obj = new Date(data.data[0].created_time)
                this.since = date_obj.getTime()/1000
                data.data.forEach(function(item){
                    if (item.message){
                        var links = []
                        if (item.link){
                            links = [item.link]
                        }
                        hyve.process({
                            'service' : 'facebook',
                            'type' : 'text',
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
                            'source' : 'http://facebook.com/'+item.from.id,
                            'weight' : 1
                        },callback)
                    }
                },this)
            }
        }
    }

})(this)
