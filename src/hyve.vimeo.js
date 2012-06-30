(function(root) {

    var hyve = (typeof require == 'function') ? require('../src/hyve.core.js') : root.hyve

    hyve.feeds['vimeo'] = {
        methods : ['claim'],
        claim : function(link,item,callback){
            if (link.search(/vimeo.com/i) != -1){
                item.links = []
                item.origin = item.service
                item.origin_id = item.id
                item.origin_source = item.source
                item.service = 'vimeo'
                item.type = 'video'
                item.id = item.source.replace(/.*com\/(.*)/ig,"$1")
                return item
            }
        }
    }

})(this)
