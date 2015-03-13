/**
 * Created by sangeshi on 2/23/2015.
 */
var cassandra = require('cassandra-driver');
var async = require('async');

var client = new cassandra.Client({contactPoints: ['127.0.0.1'], keyspace: 'dashboard'});




