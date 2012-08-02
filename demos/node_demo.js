#!/usr/bin/node

var hyve = require('../src/hyve.core.js')
require('../src/hyve.twitter.js')
require('../src/hyve.facebook.js')

hyve.queue_enable = false
hyve.recall_enable = false

console.log('Starting Stream')

// examples:
// hyve.friends.stream(callback, [services])
// hyve.search.stream(query, callback, [services])
// hyve.search.popular(query, callback, [services])

hyve.search.stream('android', function(data){
    console.log(data.service +' : '+ data.text)
}, ['twitter','facebook'])


