var util = require('util');
var express = require('express');
var Twitter = require('twitter');
var _ = require('underscore');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

// Express setup
app.engine('html', require('ejs').renderFile);
app.use(express.static('public'));
app.get('/', function (req, res) {
	res.render(__dirname + '/index.html');
});

// See if user specified retweet expiration
var args = process.argv.slice(2);
app.locals.minutesUntilStale = args[0] || 5;
var millisecondsUntilStale = app.locals.minutesUntilStale * 60 * 1000;

var twit = new Twitter({
	consumer_key: 'INSERT_CONSUMER_KEY_HERE',
	consumer_secret: 'INSERT_CONSUMER_SECRET_HERE',
	access_token_key: 'INSERT_ACCESS_TOKEN_KEY_HERE',
	access_token_secret: 'INSERT_ACCESS_TOKEN_SECRET_HERE'
});

// The main object to track retweets
var retweets = {};

// Track Retweets from the stream
twit.stream('statuses/sample', function(stream) {
	stream.on('data', function(tweet) {
		if (tweet.retweeted_status) {
			retweets[tweet.retweeted_status.id_str] = (retweets[tweet.retweeted_status.id_str] || tweet.retweeted_status);
			retweets[tweet.retweeted_status.id_str].retweets = (retweets[tweet.retweeted_status.id_str].retweets || []);
			retweets[tweet.retweeted_status.id_str].retweets.push(tweet.created_at);
		}
	});
});

var sendTopTen = function() {
	var topTen = _.chain(retweets)
		.values()
		.sortBy(function(t) { return t.retweets.length;})
		.last(10)
		.value()
		.reverse();
	io.emit('retweets', topTen);
};

var purgeStaleEntries = function() {
	var now = Date.now();
	var tweets = _.values(retweets);

	// remove old retweet times from tweet
	_.each(tweets, function(tweet) {
		var retweetTimes = tweet.retweets;
		tweet.retweets = _.reject(tweet.retweets, function(time) {
			return (now - Date.parse(time) > millisecondsUntilStale);
		}); 
	});

	// remove retweets with no retweet times
	for (id in retweets) {
		if (retweets[id].retweets.length === 0) {
			delete retweets[id];
		}
	}
}

// Calculate the top 10 retweeted tweets every second
setInterval(sendTopTen, 1000);

// Purge stale retweets every ten seconds
setInterval(purgeStaleEntries, 10000);

server.listen(3000);
console.log("Server started. Open http://localhost:3000 to view site.");
