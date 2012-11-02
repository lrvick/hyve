(function(root) {

    var hyve = (typeof require == 'function' && !(typeof define == 'function' && define.amd)) ? require('../src/hyve.core.js') : root.hyve

    hyve.feeds['plus'] = {
        interval : 5000,
        methods : ['search', 'popular'],
        api_key : '',
        feed_urls : {
            search: 'https://www.googleapis.com/plus/v1/activities?query={{query}}&language=en&orderBy=recent&maxResults=20&pp=1&key={{api_key}}{{#&callback=#callback}}',
            popular: 'https://www.googleapis.com/plus/v1/activities?query={{query}}&language=en&orderBy=best&maxResults=20&pp=1&key={{api_key}}{{#&callback=#callback}}'
        },
        parsers: {

            search: function(data, query, callback) {
            if (!this.items_seen){
                this.items_seen = {}
            }
            if (!hyve.feeds.plus.api_key) throw "The google plus plugin has no api-key defined."

            if (data.items){
                data.items.forEach(function(item){
                    if (!this.items_seen[item.id]){
                        this.items_seen[item.id] = true

                        var weight = 1
                        if (item.object.plusoners.totalItems > 1) {
                            weight = item.object.plusoners.totalItems
                        }

                        item.type = 'text'

                        if (!item.title){
                            item.type = 'link'
                            item.url = item.object.attachments[0].url
                            item.title = item.object.attachments[0].displayName
                        }
                        hyve.process({
                            'service' : 'plus',
                            'type' : item.type,
                            'user' : {
                                'id': item.actor.id,
                                'name' : item.actor.displayName,
                                'avatar' : item.actor.image.url,
                                'profile':  item.actor.url
                            },
                            'query' : query,
                            'id' : item.id,
                            'date' : item.published,
                            'text' : item.title,
                            'source' : item.url,
                            'weight': weight
                        },callback)
                    }
                }, this)
            }
        },

        popular : function(data, query, callback) {

            sorted_items = []

            if (data.items) {
                data.items.forEach(function(item) {

                    item.weight = 1
                    if (item.object.plusoners.totalItems > 1) {
                        item.weight = item.object.plusoners.totalItems
                    }
                    item.type = 'text'
                    if (!item.title){
                        item.type = 'link'
                        item.url = item.object.attachments[0].url
                        item.title = item.object.attachments[0].displayName
                    }
                    sorted_items.push(item)
                }, this)

            }

            if(sorted_items) {
                sorted_items.sort(function(a, b) {
                    return b.weight - a.weight
                })

                sorted_items.forEach(function(item) {
                    hyve.process({
                        'service' : 'plus',
                        'type' : item.type,
                        'user' : {
                            'id': item.actor.id,
                            'name' : item.actor.displayName,
                            'avatar' : item.actor.image.url,
                            'profile':  item.actor.url
                        },
                        'query' : query,
                        'id' : item.id,
                        'date' : item.published,
                        'text' : item.title,
                        'source' : item.url,
                        'weight': item.weight
                    }, callback)

                }, this)
            }
        }
    }
}

})(this)
