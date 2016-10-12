var spawn = require('child_process').spawn;
var request = require('request');
var zlib = require('zlib');

var last_change = {
  polls: undefined,
  plus: undefined,
  now: undefined
};

var last_numbers = {
  polls: undefined,
  plus: undefined,
  now: undefined
}

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

var LAST_MESSAGE = undefined;

var check = function() {

  var url = MODE === "S" ? "http://projects.fivethirtyeight.com/2016-election-forecast/senate/" : 'http://projects.fivethirtyeight.com/2016-election-forecast/';
  var desired_outcome = MODE === "S" ? "Democrats" : "Clinton";

  request(url, {encoding: null}, function(err, response, body){
    
    if (err) return;

    var changed = false;

    var handle = function(text) {
      var match = text.match(/race\.stateData = ([^;]*)/m);
      var obj = JSON.parse(match[1]);

      var message = "";

      ["polls", "plus", "now"].forEach(function(type) {

        var winner = obj.sentences[type].leader;
        var prob = Math.round(obj.sentences[type].probability * 100) / 100;

        if (obj.sentences[type].probability != last_numbers[type]) {
          changed = true;
        }

        last_numbers[type] = obj.sentences[type].probability;

        var direction = "↔️";

        if (last_change[type] > prob) direction = "⬇";
        else if (last_change[type] < prob) direction = "⬆️";

        last_change[type] = prob;

        message += winner + " (" + type + ") " + prob + '% ' + direction;

        if (type != "now") {
          message += ", ";
        }

      });

      if (MODE === "S") {
        message = "[Senate] " + message;
      }

      // Special case at startup: we don't want to send an alert each time we restart the process.
//      if (LAST_MESSAGE == "buns") {
      if (LAST_MESSAGE == undefined) {
        LAST_MESSAGE = message;
        console.log("At start time, message is %s", message);
        return;
      } else if (changed) {      
        console.log("[%s] %s", new Date(), message);
        LAST_MESSAGE = message;
        numbers.forEach(function(number) {
          sendSms(number, message);
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
