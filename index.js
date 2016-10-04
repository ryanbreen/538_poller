var spawn = require('child_process').spawn;
var request = require('request');
var zlib = require('zlib');

var last_change = undefined;

var client = require('twilio')(process.env.TWILIO_KEY, process.env.TWILIO_SECRET);

var sendSms = function(to, message) {
  client.messages.create({
    body: message,
    to: to,
    from: '+16172063628'
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

        numbers.forEach(function(number) {
          sendSms(number, clinton);
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