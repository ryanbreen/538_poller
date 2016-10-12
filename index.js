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

var MODE = process.env.MODE || "P";

var check = function() {

  var url = MODE === "S" ? "http://projects.fivethirtyeight.com/2016-election-forecast/senate/" : 'http://projects.fivethirtyeight.com/2016-election-forecast/';
  var desired_outcome = MODE === "S" ? "Democrats" : "Clinton";

  request(url, {encoding: null}, function(err, response, body){
    
    if (err) return;

    var handle = function(text) {
      var match = text.match(/race\.stateData = ([^;]*)/m);
      var obj = JSON.parse(match[1]);
      var prob = Math.round(obj.sentences.polls.probability * 100) / 100;

      // If this happens, I don't want to know.
      if (obj.sentences.polls.leader != desired_outcome) {
        process.exit(1);
      }

      // Special case at startup: we don't want to send an alert each time we restart the process.
//      if (last_change == "buns") {
      if (last_change == undefined) {
        last_change = prob;
        console.log("At start time, prob is %s", prob);
        return;
      }

      if (last_change != prob) {

        var direction = "↔️";

        if (last_change > prob) direction = "⬇";
        else if (last_change < prob) direction = "⬆️";

        last_change = prob;

        var msg = prob + '% ' + direction;

        if (MODE === "S") {
          console.log("[%s] Senate %s", new Date(), msg);
        } else {
          console.log("[%s] %s", new Date(), msg);
        }

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
