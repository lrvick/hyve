#!/usr/bin/node

var hyve = require('./hyve.js')

hyve.queue_enable = false
hyve.recall_enable = false

console.log('Starting Stream')

hyve.stream('android', function(data){
    console.log(data.service +' : '+ data.text)
},['facebook','twitter'])
