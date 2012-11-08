(function(root) {
    var hyve = (typeof require == 'function' && !(typeof define == 'function' && define.amd)) ? require('../src/hyve.core.js') : root.hyve

    hyve.feeds['wikipedia'] = {
        methods : ['search'],
        interval : 10000,
        feed_urls : {
            search : 'http://en.wikipedia.org/w/api.php?action=query&list=search&format=json&srsearch={{query}}{{#&callback=#callback}}'
        },

        parse : function(data,query,callback) {
            if(data.query.search.length > 0) {
                data.query.search.forEach(function(item) {

                    console.log(item);

                    hyve.process({
                        'service' : 'wikipedia',
                        'source' : 'http://en.wikipedia.org/wiki/' + item.title,
                        'type' : 'text',
                        'query' : query,
                        'date' : item.timestamp,
                        'weight' : 1,
                        'text' : item.title,
                        'description' : item.snippet    
                    }, callback)
                }, this)
            }
        }
    }

})(this)