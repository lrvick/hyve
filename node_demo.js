#!/usr/bin/node

var hyve = require('./hyve.js')

require('./plugins/twitter.js')

hyve.queue_enable = false
hyve.recall_enable = false

console.log('Starting Stream')

// examples:
// hyve.friends.stream(callback, [services])
// hyve.search.stream(query, callback, [services])

hyve.search.stream('android', function(data){
    console.log(data.service +' : '+ data.text)
}, ['twitter'])
