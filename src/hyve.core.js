(function(root) {

    var hyve = ( typeof require == 'function'
               && !( typeof define == 'function' && define.amd )
               ) ? require('../src/hyve.core.js') : root.hyve = {}

    var get = typeof require == 'function'
              && !(typeof define == 'function' && define.amd)
              && require('request')

    // ECMA-262 compatible Array#forEach polyfills
    Array.prototype.forEach = Array.prototype.forEach || function(fn, ctx) {
        var len = this.length >>> 0
        for (var i = 0; i < len; ++i){
            if (i in this){
                fn.call(ctx, this[i], i, this)
            }
        }
    }

    //ECMA-262 standard indexOf from Mozilla Developer Network
    if (!Array.prototype.indexOf) {
        Array.prototype.indexOf = function (searchElement /*, fromIndex */ ) {
            "use strict"
            if (this === null) {
                throw new TypeError()
            }
            var t = Object(this)
            var len = t.length >>> 0
            if (len === 0) {
                return -1
            }
            var n = 0
            if (arguments.length > 0) {
                n = Number(arguments[1])
                if (isNaN(n)) { // shortcut for verifying if it's NaN
                    n = 0
                } else if (n !== 0 && n !== Infinity && n !== -Infinity) {
                    n = (n > 0 || -1) * Math.floor(Math.abs(n))
                }
            }
            if (n >= len) {
                return -1
            }
            var k = n >= 0 ? n : Math.max(len - Math.abs(n), 0)
            for (; k < len; k++) {
                if (k in t && t[k] === searchElement) {
                    return k
                }
            }
            return -1
        }
    }

    // Converts an object to an array
    function oc(a){
       var obj = {}
       for(var i=0;i<a.length;i++){
            obj[a[i]]=''
       }
       return obj
    }

    // Fills a template with data from an object
    function format(string, data) {
        "use strict"
        return string.replace(
            /\{\{(?:#(.+?)#)?\s*(.+?)\s*\}\}/g,
            function(m, cond, id) {
                var rv = data[id]
                if (rv === false){
                    return ''
                } else {
                    return rv? (cond || '') + rv : cond? m : ''
                }
            }
       )
    }

    // Sort all items in sort_queue and output them through provided callback
    function sortout(callback){
        hyve.sort_queue.sort(function(a,b){
            return a['date'] - b['date']
        })
        hyve.sort_queue.forEach(function(item){
            callback(item)
            idx = hyve.sort_queue.indexOf(item)
            if (idx != -1) hyve.sort_queue.splice(idx, 1)
        })
    }

    // return an array of services that support a given method
    function supported(method,custom_services){
        services = []
        check_services = custom_services || Object.keys(hyve.feeds)

        check_services.forEach(function(service){
            if (method in oc(hyve.feeds[service.toLowerCase()].methods)){
               services.push(service.toLowerCase())
           }
        })
        return services
    }

    // Pulls data from several streams and handles all with given callback
    function stream(query, callback, custom_services) {
        callback = callback || function(){}
        method = hyve.method

        services = supported(method,custom_services)

        if (services.length === 0) throw "cannot stream; services is empty"

        if (hyve.debug === true){
            console.log('hyve: method:',method)
            console.log('hyve: services:',services)
        }

        hyve.stop()

        if (hyve.sort_interval){
            if (hyve.method == 'popular'){
                setTimeout(function(){
                    sortout(callback)
                },hyve.sort_interval)
            } else {
                hyve.sort_interval_lock = setInterval(function(){
                    sortout(callback)
                },hyve.sort_interval)
            }
        }

        services.forEach(function(service){
            // set the orig_url to the services feed_url for this method
            if (!hyve.feeds[service].orig_url){
                hyve.feeds[service].orig_url =
                    hyve.feeds[service].feed_urls[method]
            }

            var options = hyve.feeds[service]

            if (options.token_update && hyve.method == 'friends'){
                options.token_update()
                options.token_update_lock = setInterval( options.token_update
                                                       , options.token_timeout
                                                       )
            }


            var runFetch = function(){
                var feed_url

                if (options.format_url){
                    feed_url = format( options.feed_urls[method]
                                    , hyve.feeds[service].format_url(query)
                                    )
                } else {
                    feed_url = format( options.feed_urls[method]
                                    ,{ query:  query
                                    ,  url_suffix: options.url_suffix
                                    ,  result_type: options.result_type
                                    ,  access_token: options.access_token
                                    ,  api_key: options.api_key
                                    ,  auth_user: options.auth_user
                                    ,  auth_signature: options.auth_signature
                                    })
                }

                if (hyve.feeds[service].fetch_url){
                    hyve.feeds[service].fetch_url(service, query, callback)
                } else if (hyve.feeds[service].oauth_version == '1.0'
                            && hyve.method == 'friends') {
                    hyve.fetch_proxy(feed_url,service)
                } else {
                    fetch(feed_url, service, query, callback)
                }
            }
            runFetch()

            var interval = options.interval
            if (hyve.method == 'friends' && options.interval_friends){
                if (options.interval_friends){
                    interval = options.interval_friends
                }
            }

            if (hyve.method != 'popular'){
                hyve.feeds[service].lock = setInterval(function(){
                    runFetch()
                }, interval)
            }
        })
    }

    // specific external wrappers for search/stream functionality
    var friends = {
        stream: function(callback, custom_services) {
            hyve.method = 'friends'
            hyve.callback = callback
            return stream('', callback, custom_services)
        }
    }

    var search = {
        stream: function(query, callback, custom_services) {
            hyve.method = 'search'
            return stream(query, callback, custom_services)
        },
        popular: function(query, callback, custom_services) {
            hyve.method = 'popular'
            return stream(query, callback, custom_services)
        }
    }

    // Stops any running streams for given services
    function stop(custom_services) {
        var services
        services = custom_services || Object.keys(hyve.feeds)
        services.forEach(function(service){
            if (hyve.feeds[service].lock) {
                if (hyve.feeds[service].orig_url){
                    hyve.feeds[service].feed_url = hyve.feeds[service].orig_url
                }
                clearInterval(hyve.feeds[service].lock)
            }
            if (hyve.feeds[service].token_update_lock){
                clearInterval(hyve.feeds[service].token_update_lock)
            }
            if (hyve.sort_interval_lock){
                clearInterval(hyve.sort_interval_lock)
            }
        })
    }

    // Gives some feeds the chance to claim an item as its own, then returns
    // list of claimed/reformatted items, or the unaltered original
    function claim(item,callback){
        var new_items = []
        var services = Object.keys(hyve.feeds)
        item.links.forEach(function(link){
            if (!hyve.links[link]){
                hyve.links[link] = true
                services.forEach(function(service){
                    if (hyve.feeds[service].claim){
                        var new_item = hyve.feeds[service].claim( link
                                                                , item
                                                                , callback
                                                                )
                        if (new_item){
                            new_items.push(new_item)
                        }
                    }
                })
                if (link.search(/.jpg|.png|.gif/i) != -1){
                    var new_item = item
                    new_item.links = []
                    new_item.type = 'image'
                    if (!new_item.source_img){
                        new_item.source_img = link
                    }
                    if (!new_item.thumbnail){
                        new_item.thumbnail = link
                    }
                    new_items.push(new_item)
                }
            } else {
                new_items.push(item)
            }
        })
        if (new_items.length > 0){
            return new_items
        } else {
            return false
        }
    }

    // Place an item in an appropriate queue depending on its defined 'type'
    function enqueue(item){
        if(item){
            hyve.queue[item.type].sort(function(a,b){
                return b['date'] - a['date']
            })
            if (hyve.recall_enable === true){
                var check_id_key = item.service+':'+item.query+':'+item.id
                if (localStorage.getItem(check_id_key) != 'true'){
                    hyve.queue[item.type].unshift(item)
                    store(item)
                }
            } else {
                hyve.queue[item.type].unshift(item)
            }
        } else {
            throw('enqueue: an undefined item was inputted')
        }
    }

    // Removes an item from hyves queue
    function dequeue(item) {
        if (item) {
            idx = hyve.queue[item.type].indexOf(item)
            // use splice instead of delete as delete
            // leaves undefined element in array
            if (idx != -1) hyve.queue[item.type].splice(idx, 1)
        } else {
            throw('dequeue: an undefined item was inputted')
        }
    }

    // Persistantly stores an item in the browser via localStorage
    function store(item){
        var items_key = item.type+':'+item.query
        var items = localStorage.getItem(items_key)
        if (items){
            items = JSON.parse(items)
        } else {
            items = []
        }
        var check_id_key = item.service+':'+item.query+':'+item.id
        if (localStorage.getItem(check_id_key) != 'true'){
            items.unshift(item)
            localStorage.setItem(check_id_key,true)
        }
        trunc_items = items.splice(0,200)
        try {
            localStorage.setItem(items_key,JSON.stringify(trunc_items))
        } catch(e) {
            console.error('store: localStorage quota exceeded. Emptying', e)
            localStorage.clear()
        }
    }

    // Recall previously saved items from localStorage
    function recall(type,query){
        var itemskey = type+':'+query
        var items = JSON.parse(localStorage.getItem(itemskey)) || []
        items.sort(function(a,b){
            return b['date'] - a['date']
        })
        return items
    }

    // Reset queue and refill it with any previously stored data if any exists
    function replenish(query,types){
        if (hyve.recall_enable === true){
            hyve.queue =
                { 'text':[]
                , 'link':[]
                , 'video':[]
                , 'image':[]
                , 'checkin':[]
                }
            types = types || Object.keys(hyve.queue)
            types.forEach(function(type){
                hyve.queue[type] = recall(type,query)
            })
        }
    }


    // similiar to java's hashCode function (32bit)
    function string_hash(s) {
        var hash = 0
        if (s.length === 0) {
            return hash
        }
        for (i = 0 ; i < s.length ; i ++ ) {
            chr  = s.charCodeAt(i)
            hash = ((hash << 5) - hash) + chr
            hash = hash & hash
        }
        return hash
    }

    function processable(item) {
        if (item.text && item.type != 'image') {
            var hash = string_hash(item.text)

            if (hash) {
                if (hyve.items_seen.indexOf(hash) > -1) {
                    return false
                } else {
                    // if list length limit is reached pop the last item and
                    // push to the top
                    if (hyve.items_seen.length > hyve.items_seen_size) {
                        hyve.items_seen.shift()
                    }
                    hyve.items_seen.push(hash)

                    // if hash isn't seen process item
                    return true
                }
            }
        } else {
            return true
        }
        // if no hash do not process
        return false
    }

    // Manually re-classify items as needed, check for dupes, send to callback
    function process(item, callback){

        if (item.date != parseInt(item.date,10)){
            var date_obj = new Date(item.date)
            item.date = date_obj.getTime()/1000
        }

        items = [item]
        item.links = item.links || []
        if (item.links.length > 0) {
            claimed_items = claim(item,callback)
            if (claimed_items){
                items = claimed_items
            }
        }
        if (items){
            items.forEach(function(item){
                // check if item is processable, i.e not a dupe
                if (processable(item)) {
                    if (hyve.queue_enable){
                        enqueue(item)
                    }
                    if ( !hyve.sort_interval ){
                        try {
                            callback(item)
                        } catch(e) {
                            console.error
                                ( 'process:'
                                , e.message
                                , item.service
                                , item.id
                                , item
                                )
                        }
                    } else {
                        hyve.sort_queue.push(item)
                    }
                }
            })
        }
    }

    // Fetches a JSON stream
    var fetch = function() {
        var counter   = 0
        var callbacks = { }
        var head      = !get && document.getElementsByTagName('head')[0]

        // Returns a qualified identifier pointing to a callback
        function get_callback() {
            return format('hyve.callbacks.f{{id}}', { id: ++counter })
        }

        // Cleanup script leftovers from DOM
        function cleanup(script){
            head.removeChild(script)
            for (var property in script){
                delete script[property]
            }
        }

        // Requires a URI using JSONP
        function jsonp(url, callback) {
            var s = document.createElement('script')
            s.type = 'text/javascript'
            s.async = true
            s.src = url

            if (hyve.debug === true) console.log('hyve: JSOP Request:',url)

            var wrap_callback = function(){
                cleanup(s)
                return callback.apply(this,arguments)
            }
            hyve.callbacks['f' + counter] = wrap_callback
            var x = document.getElementsByTagName('script')[0]
            x.parentNode.insertBefore(s,x)
        }

        // Requires a URI using the Node.js request library
        function request(url, callback) {
            get(url, function(error, res, data) {
                try {
                    callback(JSON.parse(data))
                } catch(e){
                    console.error('request: fetch failed - ',url, e)
                    callback({ }, e)
                }
            })
        }

        // Abstracts fetching URIs.
        function fetch(url, service, query, callback, item) {
            var fn = pass(service, query, callback, item)
            var cb = !get && get_callback()
            url    = format(url, { callback: cb })
            var fetcher = get? request : jsonp
            script = fetcher(url, fn)
        }

        // Higher-order function to process the fetched data
        function pass(service, query, callback, item) {
            return function(data) {
                // if service supports multiple parsers use that or fallback to
                // parse
                if (hyve.feeds[service].parsers) {
                    if (hyve.method in hyve.feeds[service].parsers) {
                        hyve.feeds[service].parsers[hyve.method]
                            ( data
                            , query
                            , callback
                            , item
                            )
                    }
                } else {
                    hyve.feeds[service].parse(data, query, callback, item)
                }
            }
        }

        // Export the `fetch` function
        return fetch
    }()

    // A default echo function used when no real request proxy function exists
    function fetch_proxy(feed_url,service){
        console.log('hyve_request_proxy',feed_url,service)
    }

    // Exports data to the outside world
    hyve.friends = friends
    hyve.search = search
    hyve.method = '' // set by the calling stream
    hyve.callback = '' // set by the calling stream
    hyve.stop = stop
    hyve.process = process
    hyve.supported = supported
    hyve.format = format
    hyve.fetch = fetch
    hyve.fetch_proxy = fetch_proxy // override with your own proxy function
    hyve.recall = recall
    hyve.recall_enable = false
    hyve.replenish = replenish
    hyve.queue = {'text':[],'link':[],'video':[],'image':[],'checkin':[]}
    hyve.sort_queue = []
    hyve.queue_enable = false; // enables queuing; no queue by default
    hyve.sort_interval = false; // set to milliseconds to sort at set intervals
    hyve.dequeue = dequeue
    hyve.debug = false
    hyve.items_seen = []
    hyve.items_seen_size = 5000 // length of buffer before rolling begins
    hyve.callbacks = []
    hyve.links = {}
    hyve.feeds = {}

    // Export hyve for node/browser compatibilty
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = hyve
    } else {
        root.hyve = hyve
    }

})(this)
