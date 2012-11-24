(function(root) {

    var hyve = (typeof require == 'function' && !(typeof define == 'function' && define.amd)) ? require('../src/hyve.core.js') : root.hyve

    hyve.feeds['foursquare'] = {
        methods : ['geo'],
        interval : 15000,
        client_id: '',
        client_secret: '',
        feed_urls :{
            geo: 'https://api.foursquare.com/v2/venues/search?query={{query}}{{#&ll=#latlog}}&limit=20{{#&client_id=#client_id}}{{#&client_secret=#client_secret}}{{#&callback=#callback}}'
        },
        fetch_url : function(service,query,callback){
            if (navigator.geolocation){
                var options = this
                navigator.geolocation.getCurrentPosition(function(position){
                    latlog = position.coords.latitude+","+position.coords.longitude
                    var feed_url = hyve.format( options.feed_url,
                                     { query:  query,
                                       latlog: latlog,
                                       client_id: options.client_id,
                                       client_secret: options.client_secret })
                    hyve.fetch(feed_url, service, query, callback)
                },function(){
                    delete services.foursquare
                })
            }
        },
        parse : function(data,query,callback){
            if (!this.items_seen){
                this.items_seen = {}
            }
            if (data.response.groups[0].items){
                data.response.groups[0].items.forEach(function(item){
                    var item_key = item.id+"_"+item.stats.checkinsCount
                    if (!this.items_seen[item_key]){
                        this.items_seen[item_key] = true
                        if (item.contact != undefined){
                            if (item.contact.twitter){
                                user_name = item.contact.twitter
                            } else if (item.contact.formattedPhone){
                                user_name = item.contact.formattedPhone
                            } else if (item.contact.phone){
                                user_name = item.contact.formattedPhone
                            } else {
                                user_name = ''
                            }
                        }
                        var weight = 1
                        if (item.views){
                            weight = item.stats.userCount
                        }
                        date_obj = new Date()
                        date = date_obj.getTime()
                        hyve.process({
                            'service' : 'foursquare',
                            'type' : 'checkin',
                            'date' : date,
                            'geo' : item.location.lat+","+item.location.lng,
                            'query' : query,
                            'user' : {
                                'name' : user_name
                            },
                            'id' : item.id,
                            'text' : item.name,
                            'visits' : item.stats.checkinsCount,
                            'subscribers' : item.stats.usersCount,
                            'weight' : weight
                        },callback)
                    }
                },this)
            }
        }
    }

})(this)
