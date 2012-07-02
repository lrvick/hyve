(function(root) {

    var hyve = (typeof require == 'function') ? require('../src/hyve.core.js') : root.hyve

    hyve.feeds['plus'] = {
        interval : 5000,
        methods : ['search'],
        api_key : '',
        feed_urls : {
            search: 'https://www.googleapis.com/plus/v1/activities?query={{query}}&language=en&orderBy=best&maxResults=20&pp=1&key={{api_key}}{{#&callback=#callback}}'
        },
        parse : function(data, query, callback) {
            if (!this.items_seen){
                this.items_seen = {}
            }
            if (data.items){
                data.items.forEach(function(item){
                    if (!this.items_seen[item.id]){
                        this.items_seen[item.id] = true
                        item.type = 'text'
                        if (!item.title){
                            item.type = 'link'
                            item.url = item.object.attachments[0].url
                            item.title = item.object.attachments[0].displayName
                        }
                        hyve.process({
                            'service' : 'plus',
                            'type' : item.type,
                            'query' : query,
                            'id' : item.id,
                            'date' : item.published,
                            'text' : item.title,
                            'source' : item.url
                        },callback)
                    }
                }, this)
            }
        }
    }

})(this)
