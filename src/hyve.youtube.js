(function(root) {

    var hyve = (typeof require == 'function') ? require('../src/hyve.core.js') : root.hyve

    hyve.feeds['youtube'] = {
        methods : ['search','claim', 'friends'],
        interval : 8000,
        result_type : 'videos',  //  videos,top_rated, most_popular, standard_feeds/most_recent, most_dicsussed, most_responded, recently_featured, on_the_web
        feed_suffix : '', // '', standardfeeds/ - if '' result_type must be 'videos'
        auth_user : '', // user for personal streams
        feed_urls : {
            search: 'http://gdata.youtube.com/feeds/api/{{feed_suffix}}{{result_type}}?q={{query}}&time=today&orderby=published&format=5&max-results=20&v=2&alt=jsonc{{#&callback=#callback}}',
            friends: 'https://gdata.youtube.com/feeds/api/users/{{auth_user}}/newsubscriptionvideos?v=2&alt=jsonc'
        },
        claim : function(link,item){
            if (link.search(/youtu.be|youtube.com.*v=/i) != -1){
                item.links = []
                item.origin = item.service
                item.origin_id = item.id
                item.origin_source = item.source
                item.service = 'youtube'
                item.type = 'video'
                if (link.search(/youtu.be/i) != -1){
                    item.id = link.replace(/.*be\/([a-zA-Z0-9_-]+).*/ig,"$1")
                }
                if (link.search(/youtube.com/i) != -1){
                    item.id = link.split("v=")[1].substring(0,11)
                }
                item.source = 'http://youtu.be/'+item.id
                item.thumbnail = 'http://i.ytimg.com/vi/' + item.id + '/hqdefault.jpg'
                return item
            }
        },
        parse : function(data,query,callback){
            if (!this.items_seen){
                this.items_seen = {}
            }

            items = data.data.items;

            items.forEach(function(item){
                var id = item.id;
                var uploader = item.uploader;
                var uploaded = item.uploaded;
                var category = item.category;
                var title = item.title;
                var description = item.description;
                var weight = 0;
                if (item.views) {
                    weight = item.stats.userCount
                }

                if (!this.items_seen[item.id]) {
                    this.items_seen[item.id] = true

                    hyve.process({
                        'service' : 'youtube',
                        'type' : 'video',
                        'query' : query,
                        'user' : {
                            'id' : uploader,
                            'name' : uploader,
                            'profile' : 'http://youtube.com/' + uploader,
                            'avatar' : ''
                        },
                        'id' : id,
                        'date' : uploaded,
                        'text' : title,
                        'source' : 'http://youtu.be/'+ id,
                        'thumbnail':'http://i.ytimg.com/vi/' + id + '/hqdefault.jpg',
                        'weight' : weight
                    }, callback)
                }
            }, this);
        }
    }

})(this)
