(function(root) {

    var hyve = (typeof require == 'function' && !(typeof define == 'function' && define.amd)) ? require('../src/hyve.core.js') : root.hyve

    hyve.feeds['wordpress'] = {
        methods : ['search'],
        interval : 10000,
        feed_urls : {
            search: 'http://pipes.yahoo.com/pipes/pipe.run?_id=332d9216d8910ba39e6c2577fd321a6a&_render=json&u=http%3A%2F%2Fen.search.wordpress.com%2F%3Fq%3D{{query}}%26s%3Ddate%26f%3Djson{{#&_callback=#callback}}'
        },
        parse : function(data,query,callback){
            if (!this.items_seen){
                this.items_seen = {}
            }
            if (data.value.items.length > 0){
                data.value.items[0].json.forEach(function(item){
                    if (!this.items_seen[item.guid]){
                        this.items_seen[item.guid] = true
                        hyve.process({
                            'service' : 'wordpress',
                            'type' : 'link',
                            'query' : query,
                            'user' : {
                                'id' : item.author,
                                'name' : item.author,
                                'profile' :'',
                                'avatar' : ''
                            },
                            'id' : item.guid,
                            'date' : item.epoch_time,
                            'text' : item.title,
                            'description':item.content,
                            'source' : item.guid,
                            'weight' : 1
                        },callback)
                    }
                }, this)
            }
        }
    }

})(this)
