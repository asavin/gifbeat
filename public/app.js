
var maxErrors = 5;

$(document).ready(function() {

  $('#go').click(function() {
    var url = $('#inputs input').val();
    if (url) {
      getMood(url, false);
    }
    return false;
  });
  
  getSound();
});

function getMood(songUrl, downloadUrl) {
  var arg = (downloadUrl ? 'sound' : 'search');
  $.ajax({
    url: "sounds/mood.json?" + arg + "_url=" + encodeURIComponent(songUrl),
    success: function(data) {
      setTimeout(function() {
        TweetManager.init(songUrl); // USE data...download_url instead!
      }, 5000);
    },
    error: function() {
      console.log('error getsound.json', songUrl);
      maxErrors--;
      if (maxErrors > 0) {
        getSound(songUrl, downloadUrl);
      }
    }
  });
}

function getSCData(songUrl) {
  $.ajax({
    url: "sounds/getsound.json",
    success: function(data) {
      getMood(data['download_url'], true);
    },
    error: function() {
      console.log('error scData', songUrl);
      maxErrors--;
      if (maxErrors > 0) {
        getSCData(songUrl);
      }
    }
  });
}

window.getSound = getSCData;

function getTweets(downloadUrl, callback) {
  $.ajax({
    url: "tweets.json?sound_url=" + encodeURIComponent(downloadUrl),
    success: function(data) {
      callback(data);
    },
    error: function() {
      console.log('error checkStatus', songUrl);
      maxErrors--;
      if (maxErrors > 0) {
        getTweets(downloadUrl, callback);
      }
    }
  });
}

var TweetManager = (function() {
  var currentSong = null;
  var tweets = [];
  var TRIGGER_LOAD_MORE = 2;
  var CHANGE_DELAY = 4000;
  var timer = null;

  var loadMore = function() {
    getTweets(currentSong, function(data) {
      tweets = tweets.concat(data);
      if (!timer) {
        switchTweet();
      }
    });
  };

  var switchTweet = function() {
    if (tweets.length < TRIGGER_LOAD_MORE) {
      loadMore();
    }
    
    var newTweet = tweets.shift();
    
    // OUTPUT NET TWEET
    console.log(newTweet);
    
    timer = setTimeout(function() {
      switchTweet();
    }, 5000);
  };

  return {
    start: function() {
      
    },
    stop: function() {
      
    },
    init: function(song) {
      currentSong = song;
      loadMore();
    }, 
    getTweets: function() {
      return tweets;
    }
  };
  
}());