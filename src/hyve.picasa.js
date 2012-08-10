(function(root) {

    var hyve = (typeof require == 'function' && !(typeof define == 'function' && define.amd)) ? require('../src/hyve.core.js') : root.hyve

    hyve.feeds['picasa'] = {
        methods : ['search'],
        interval : 15000,
        feed_urls : {
            search: 'https://picasaweb.google.com/data/feed/api/all?q={{query}}&max-results=20&kind=photo&alt=json{{#&callback=#callback}}'
        },
        parse : function(data,query,callback){
            var newest_date
            var newest_epoch
            if (!this.orig_url){
                this.orig_url = this.feed_url
            }
            if (this.newest_date){
                this.feed_url = this.orig_url + '&published-min=' + this.newest_date
            }
            if (!this.items_seen){
                this.items_seen = {}
            }
            if (data.feed.entry){
                data.feed.entry.forEach(function(item){
                    if (!this.items_seen[item.id.$t]){
                        var datetime = item.published.$t.split('.')[0]
                        var epoch = Date.parse(datetime)
                        if (!this.newest_epoch){
                            this.newest_epoch = epoch
                            this.newest_date = datetime
                        } else if (this.epoch > this.newest_epoch){
                            newest_epoch = epoch
                            this.newest_date = datetime
                        }
                        this.items_seen[item.id.$t] = true
                        var weight = 0
                        if (item.summary.$t){
                            text = item.summary.$t
                            weight = 1
                        } else {
                            text = item.title.$t
                        }
                        if (item.gphoto$commentCount){
                            weight = weight + item.gphoto$commentCount
                        }
                        hyve.process({
                            'service' : 'picasa',
                            'type' : 'image',
                            'query' : query,
                            'user' : {
                                'id' : item.author[0].gphoto$user.$t,
                                'name' : item.author[0].name.$t,
                                'avatar' : item.author[0].gphoto$thumbnail.$t
                            },
                            'id' : item.id.$t,
                            'date' : item.published.$t,
                            'text' : item.title.$t,
                            'source' : item.content.src,
                            'source_img' : item.content.src,
                            'thumbnail':item.media$group.media$thumbnail[1].url,
                            'weight': weight
                        },callback)
                    }
                }, this)
            }
        }
    }

})(this)
