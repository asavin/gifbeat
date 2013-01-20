$(document).ready(function() {
  var maxErrors = 5;

  function getSound(songUrl, downloadUrl) {
    var arg = downloadUrl ? 'sound' : 'search';
    $.ajax({
      url: "sounds/mood.json?" + arg + "_url=" + encodeURIComponent(songUrl),
      success: function(data) {
        if (songUrl) {
          
        } else {
          
        }
        getTweets(data);
      },
      error: function() {
        console.log('error getsound.json', songUrl);
        maxErrors--;
        if (maxErrors > 0) {
          getSound(songUrl);
        }
      }
    });
  }

  function getSCData(songUrl) {
    $.ajax({
      url: "sounds/getsound.json",
      success: function(data) {
        getMood(data['download_url']);
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

  function getMood(downloadUrl) {
    $.ajax({
      url: "sounds/mood.json?sound_url=" + encodeURIComponent(downloadUrl),
      success: function(data) {
        setTimeout(function() {
          checkStatus(downloadUrl);
        }, 1000);
      },
      error: function() {
        console.log('error getMood', songUrl);
        maxErrors--;
        if (maxErrors > 0) {
          getMood(downloadUrl);
        }
      }
    });
  }

  function checkStatus(downloadUrl) {
    $.ajax({
      url: "sounds/analyse_status.json?sound_url=" + encodeURIComponent(downloadUrl),
      success: function(data) {
        if (data.response.status.code != 0) {
          setTimeout(function() {
            checkStatus(downloadUrl);
          }, 1000);
        } else {
          TweetManager.init(downloadUrl);
        }
      },
      error: function() {
        console.log('error checkStatus', songUrl);
        maxErrors--;
        if (maxErrors > 0) {
          checkStatus(downloadUrl);
        }
      }
    });
  }

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

  $('#go').click(function() {
    var url = $('#inputs input').val();
    if (url) {
      getSound(url, false);
    }
    return false;
  });
});

var TweetManager = function() {
  var currentSong = null;
  var tweets = [];
  var TRIGGER_LOAD_MORE = 2;
  var CHANGE_DELAY = 4000;
  var timer = null;

  var loadMore = function() {
    getTweets(currentSong, function(data) {
      tweets.push(data.tweets);
    });
  };

  var switchTweet = function() {
    if (tweets.length < TRIGGER_LOAD_MORE) {
      loadMore();
    }
    
    var newTweet = tweets.shift();
    
  };

  return {
    start: function() {
      
    },
    stop: function() {
      
    },
    init: function(song) {
      currentSong = song;
    }
  };
};