(function(root) {

    var hyve = (typeof require == 'function' && !(typeof define == 'function' && define.amd)) ? require('../src/hyve.core.js') : root.hyve

    hyve.feeds['identica'] = {
        methods : ['search'],
        interval : 6000,
        since_ids : {},
        feed_urls :{
            search: 'http://identi.ca/api/search.json?lang=en&q={{query}}{{since}}{{#&callback=#callback}}'
        },
        format_url : function(query){
            var since_arg
            if (this.since_ids[query]){
                since_arg = '&since_id='+this.since_ids[query]
            }
            return { query: query,
                     result_type: this.result_type,
                     since: since_arg }
        },
        parse : function(data,query,callback){
            if (data.refresh_url){
                this.since_ids[query] = data.refresh_url.replace(/\?since_id=([0-9]+).*/ig, "$1")
            }
            data.results.forEach(function(item){
                hyve.process({
                    'service' : 'identica',
                    'type' : 'text',
                    'query' : query,
                    'user' : {
                        'id' : item.from_user_id_str,
                        'name' : item.from_user,
                        'avatar' : item.profile_image_url,
                        'profile' : "http://identi.ca/"+item.from_user
                    },
                    'id' : item.id,
                    'date' : item.created_at,
                    'text' : item.text,
                    'source' : 'http://identica.com/bookmark/'+item.id,
                    'weight' : 1
                },callback)
            })
        }
    }

})(this)
