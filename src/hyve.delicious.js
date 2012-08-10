(function(root) {

    var hyve = (typeof require == 'function' && !(typeof define == 'function' && define.amd)) ? require('../src/hyve.core.js') : root.hyve

    hyve.feeds['delicious'] = {
        methods : ['search'],
        interval : 15000,
        feed_urls : {
            search: 'http://feeds.delicious.com/v2/json/tag/{{query}}?count=20{{#&callback=#callback}}'
        },
        parse : function(data,query,callback){
            if (!this.items_seen){
                this.items_seen = {}
            }
            if (data[0]){
                data.forEach(function(item){
                    if (!this.items_seen[item.u]){
                        this.items_seen[item.u] = true
                        hyve.process({
                            'service' : 'delicious',
                            'type' : 'link',
                            'query' : query,
                            'user' : {
                                'name' : item.a
                            },
                            'id' : item.u,
                            'date' : item.dt,
                            'text' : item.d,
                            'links'  : [item.u],
                            'source' : item.u,
                            'weight' : 1
                        },callback)
                    }
                },this)
            }
        }
    }

})(this)
