var spawn = require('child_process').spawn;
var request = require('request');
var zlib = require('zlib');

var last_change = undefined;

var check = function() {

  request('http://projects.fivethirtyeight.com/2016-election-forecast/', {encoding: null}, function(err, response, body){
    
    if (err) return;

    var handle = function(text) {
      var match = text.match(/race\.stateData = ([^;]*)/m);
      var obj = JSON.parse(match[1]);
      var clinton = obj.sentences.polls.leader + ': ' + obj.sentences.polls.probability;

      if (last_change != clinton) {
        last_change = clinton;
        console.log("[%s] %s", new Date(), clinton);

        var display = spawn('osascript', ['-e', 'display notification "' + clinton + '" with title "Polls Changed"']);
        display.stderr.on('data', (data) => {
          console.log(`stderr: ${data}`);
        });
      }
    };

    if(response.headers['content-encoding'] == 'gzip'){
      zlib.gunzip(body, function(err, dezipped) {
        handle(dezipped.toString());
      });
    } else {
      handle(body);
    }
  });
}

check();

setInterval(check, 60*1000);