#!/usr/bin/node

//var hyve = require('../dist/hyve.js')

var hyve = require('../src/hyve.core.js')
require('../src/hyve.twitter.js')

hyve.queue_enable = false
hyve.recall_enable = false

console.log('Starting Stream')

// examples:
// hyve.friends.stream(callback, [services])
// hyve.search.stream(query, callback, [services])

hyve.search.stream('android', function(data){
    console.log(data.service +' : '+ data.text)
}, ['twitter'])
