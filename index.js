var spawn = require('child_process').spawn;
var request = require('request');
var zlib = require('zlib');

var last_change = undefined;

var client = require('twilio')(process.env.TWILIO_KEY, process.env.TWILIO_SECRET);

var sendSms = function(to, message) {
  client.messages.create({
    body: message,
    to: to,
    from: process.env.TWILIO_FROM
  }, function(err, data) {
    if (err) {
      console.error('Could not notify administrator');
      console.error(err);
    }
  });
};

var numbers = [];
if (process.env.TWILIO_CONTACTS) {
  numbers = process.env.TWILIO_CONTACTS.split(';');
}

process.on('uncaughtException', function(err) {
  console.log("Uncaught error: %s", err);
});

var check = function() {

  request('http://projects.fivethirtyeight.com/2016-election-forecast/', {encoding: null}, function(err, response, body){
    
    if (err) return;

    var handle = function(text) {
      var match = text.match(/race\.stateData = ([^;]*)/m);
      var obj = JSON.parse(match[1]);
      var prob = Math.round(obj.sentences.polls.probability * 100) / 100;

      // If this happens, I don't want to know.
      if (obj.sentences.polls.leader != 'Clinton') {
        process.exit(1);
      }

      if (last_change != prob) {

        var direction = "↔️";

        if (last_change > prob) direction = "️⬇";
        else if (last_change < prob) direction = "⬆️";

        last_change = prob;

        var msg = prob + '% ' + direction;

        console.log("[%s] %s", new Date(), msg);

        numbers.forEach(function(number) {
          sendSms(number, msg);
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