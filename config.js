"use strict"

const nconf = require('nconf');

nconf.file('./config.json');

nconf.defaults({
  "updatePeriod": 10,
  "windowIcon": __dirname + "/assets/panel.ico",
  "soundDailyKw" : __dirname + "/assets/Blastwave_FX_CashRegister_S08IN_92.wav",
  "soundLifetime10Kw" : __dirname + "/assets/zapsplat_sound_design_ascending_metalic_tone_powerful_electric.wav",
  "soundLifetime100Kw": __dirname + "/assets/zapsplat_emergency_alarm_siren.wav",
  "soundLifetime1Mw": __dirname + "/assets/Blastwave_FX_ExplosionCrash_S08WA_132.wav"
});

module.exports = {
  get: function(key) {
    return nconf.get(key);
  }
};
