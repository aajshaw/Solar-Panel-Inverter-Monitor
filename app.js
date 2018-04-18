"use strict"

const http = require('http');
const parseString = require('xml2js-parser').parseString;
const terminal = require('terminal-kit').terminal;
const edge = require('edge-js');

const config = require('./config');

const play = edge.func(function() {/*
  async (input) => {
    var player = new System.Media.SoundPlayer((string)input);
    player.PlaySync();
    return null;
  }
*/});

// require('terminal-kit').getDetectedTerminal(function(err, term) {
//   if (err) {
//     console.dir(err);
//   } else {
//     console.dir(term);
//   }
// });

//play(__dirname + '/assets/zapsplat_sound_design_ascending_metalic_tone_powerful_electric.wav');
//play(config.get('soundDailyKw'));

let updatePeriod = config.get('updatePeriod');

let status = { last: {}, current: {} };

function update() {
  http.request({
    host: 'enasolar-gt',
    method: 'GET',
    path: '/meters.xml'
  }, function (response) {
    response.setEncoding('utf8');
    response.on('readable', function () {
      let xml = response.read();
      if (xml) {
        parseString(xml, (err, result) => {
          if (!err) {
            status.current.outputPower = (result.response.OutputPower * 1.0).toFixed(3);
            status.current.inputVoltage = ((result.response.InputVoltage * 1.0) + (result.response.InputVoltage2 * 1.0)).toFixed(1);
            status.current.outputVoltage = (result.response.OutputVoltage * 1.0).toFixed(1);
          }
          status.generatingColor = (status.current.outputPower == 0) ? 'red' : 'green';
          console.dir(status);
        });
      }
    });
  }).end();

  http.request({
    host: 'enasolar-gt',
    method: 'GET',
    path: '/data.xml'
  }, function (response) {
    response.setEncoding('utf8');
    response.on('readable', function () {
      let xml = response.read();
      if (xml) {
        parseString(xml, (err, result) => {
          if (!err) {
            status.current.energyToday = (parseInt(result.response.EnergyToday, 16) / 100.0).toFixed(2);
            status.current.hoursToday = Math.floor(result.response.HoursExportedToday / 60);
            status.current.minutesToday = result.response.HoursExportedToday % 60;
            status.current.energyYesterday = (parseInt(result.response.EnergyYesterday, 16) / 100.0).toFixed(2);
            status.current.hoursYesterday = Math.floor(result.response.HoursExportedYesterday / 60);
            status.current.minutesYesterday = result.response.HoursExportedYesterday % 60;
            status.current.energyLifetime = (parseInt(result.response.EnergyLifetime, 16) / 100.0).toFixed(2);
            status.current.hoursLifetime = Math.floor(parseInt(result.response.HoursExportedLifetime, 16) / 60);
            status.current.minutesLifetime = parseInt(result.response.HoursExportedLifetime, 16) % 60;
            status.current.daysProducing = parseInt(result.response.DaysProducing, 16);
            status.current.averageDailyProduction = (status.current.energyLifetime / status.current.daysProducing).toFixed(2);

            if (status.initialised) {
              if (Math.floor(status.current.energyToday) > Math.floor(status.last.energyToday)) {
                play(config.get('soundDailyKw'));
              }
              let energy = Math.floor(status.current.energyLifetime);
              if (energy % 10 == 0 && energy > Math.floor(status.last.energyLifetime)) {
                if (energy % 1000 == 0) {
                  play(config.get('soundLifetime1Mw'));
                } else if (energy % 100 == 0) {
                  play(config.get('soundLifetime100Kw'));
                } else if (energy % 10 == 0) {
                  play(config.get('soundLifetime10Kw'));
                }
              }
              status.last.energyToday = status.current.energyToday;
              status.last.energyLifetime = status.current.energyLifetime;
            } else {
              status.last.energyToday = status.current.energyToday;
              status.last.energyLifetime = status.current.energyLifetime;
            }
          }
          console.dir(status);
        });
      }
    });
  }).end();

  setTimeout(update, updatePeriod * 1000);
}

update();
