var retweetApp = angular.module('retweetApp', ['ngSanitize']);

retweetApp.controller('MainCtrl', function($scope) {
	var socket = io.connect('http://localhost:3000');

	socket.on('retweets', function (retweets) {
		$scope.$apply(function() {
			$scope.tweets = retweets;
		});
	});
});
