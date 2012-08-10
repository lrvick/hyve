(function(root) {

    var hyve = (typeof require == 'function' && !(typeof define == 'function' && define.amd)) ? require('../src/hyve.core.js') : root.hyve

    hyve.feeds['imgur'] = {
        methods : ['claim'],
        claim : function(link,item){
            if (link.search(/http:\/\/(www|i)?\.?imgur.com\/(?!a)(?!gallery\/)([-|~_0-9A-Za-z]+)\.?&?.*?/ig) != -1){
                item.links = []
                item.origin = item.service
                item.origin_id = item.id
                item.origin_source = item.source
                item.service = 'imgur'
                item.type = 'image'
                item.id = link.replace(/.*imgur.com\/(r\/[A-Za-z]+\/)?([-|~_0-9A-Za-z]+).*/ig, "$2")
                item.source = 'http://imgur.com/'+item.id
                item.source_img = 'http://i.imgur.com/'+item.id+'.jpg'
                item.thumbnail = 'http://i.imgur.com/'+item.id+'l.jpg'
                return item
            }
        }
    }

})(this)
