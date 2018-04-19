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

let updatePeriod = config.get('updatePeriod');

let status = { last: {}, current: {} };

function httpXMLRequest(params, postData) {
  return new Promise(function(resolve, reject) {
    let req = http.request(params, function(res) {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return reject(new Error('statusCode = ' + res.statusCode));
      }
      res.setEncoding('utf8');
      res.on('readable', function() {
        let xml = res.read();
        if (xml) {
          parseString(xml, (err, result) => {
            if (!err) {
              resolve(result);
            } else {
              reject(err);
            }
          });
        }
      });
    });
    req.on('error', function(err) {
      reject(err);
    });
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

function update() {
  httpXMLRequest({host: 'enasolar-gt', method: 'GET', path: '/meters.xml'}).then(function(xml) {
    status.current.outputPower = (xml.response.OutputPower * 1.0).toFixed(3);
    status.current.inputVoltage = ((xml.response.InputVoltage * 1.0) + (xml.response.InputVoltage2 * 1.0)).toFixed(1);
    status.current.outputVoltage = (xml.response.OutputVoltage * 1.0).toFixed(1);
    status.generating = !(status.current.outputPower == 0);
    httpXMLRequest({host: 'enasolar-gt', method: 'GET', path: '/data.xml'}).then(function(xml) {
      status.current.energyToday = (parseInt(xml.response.EnergyToday, 16) / 100.0).toFixed(2);
      status.current.hoursToday = Math.floor(xml.response.HoursExportedToday / 60);
      status.current.minutesToday = xml.response.HoursExportedToday % 60;
      status.current.energyYesterday = (parseInt(xml.response.EnergyYesterday, 16) / 100.0).toFixed(2);
      status.current.hoursYesterday = Math.floor(xml.response.HoursExportedYesterday / 60);
      status.current.minutesYesterday = xml.response.HoursExportedYesterday % 60;
      status.current.energyLifetime = (parseInt(xml.response.EnergyLifetime, 16) / 100.0).toFixed(2);
      status.current.hoursLifetime = Math.floor(parseInt(xml.response.HoursExportedLifetime, 16) / 60);
      status.current.minutesLifetime = parseInt(xml.response.HoursExportedLifetime, 16) % 60;
      status.current.daysProducing = parseInt(xml.response.DaysProducing, 16);
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
        status.initialised = true;
      }

      terminal.clear();
      if (status.generating) {
        terminal.brightGreen();
      } else {
        terminal.brightRed();
      }
      terminal('Exporting');
      terminal.defaultColor();
      terminal.moveTo(15, 2, "Generating %skW", status.current.outputPower.padStart(11));
      terminal.moveTo(12, 3, "Input voltage %sV", status.current.inputVoltage.padStart(12));
      terminal.moveTo(11, 4, "Output voltage %sV", status.current.outputVoltage.padStart(12));
      terminal.moveTo(20, 6, "Today %skWh %sh %sm", status.current.energyToday.padStart(10), String(status.current.hoursToday).padStart(6), String(status.current.minutesToday).padStart(2));
      terminal.moveTo(16, 7, "Yesterday %skWh %sh %sm", status.current.energyYesterday.padStart(10), String(status.current.hoursYesterday).padStart(6), String(status.current.minutesYesterday).padStart(2));
      terminal.moveTo(17, 8, "Lifetime %skWh %sh %sm", status.current.energyLifetime.padStart(10), String(status.current.hoursLifetime).padStart(6), String(status.current.minutesLifetime).padStart(2));
      terminal.moveTo(1, 10, "Average daily production %skWh %s days", status.current.averageDailyProduction.padStart(10), String(status.current.daysProducing).padStart(6));
    });
  });

  setTimeout(update, updatePeriod * 1000);
}

update();
