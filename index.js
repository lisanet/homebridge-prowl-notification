var https = require('https');
var querystring = require('querystring');
var Accessory, Service, Characteristic, UUIDGen;

module.exports = function(homebridge) {
    Accessory = homebridge.platformAccessory;
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    UUIDGen = homebridge.hap.uuid;
    
    homebridge.registerPlatform("homebridge-prowl-notification", "ProwlNotification", ProwlNotification, true);
}

// Platform constructor
// config may be null
// api may be null if launched from old homebridge version
function ProwlNotification(log, config, api) {
    log("ProwlNotification Init");
    this.log = log;
    this.config = config;
    this.accessories = [];
    this.switches = this.config.switches || [];
    
    if (api) {
        this.api = api;
        this.api.on('didFinishLaunching', this.didFinishLaunching.bind(this));
    }
}

// Method to setup accesories from config.json
ProwlNotification.prototype.didFinishLaunching = function () {
    // Add or update accessories defined in config.json
    for (var i in this.switches) this.addAccessory(this.switches[i]);
}


// Function invoked when homebridge tries to restore cached accessory.
// Developer can configure accessory at here (like setup event handler).
// Update current value.
ProwlNotification.prototype.configureAccessory = function(accessory) {
    this.log("Configure Accessory");
    
    this.setService(accessory);
    this.accessories[accessory.context.name] = accessory;
}




// we get accessory data from config.json
ProwlNotification.prototype.addAccessory = function(data) {
    this.log("Add Accessory");
    var uuid;
    
    
    
    // Setup accessory as SWITCH (8) category.
    var uuid = UUIDGen.generate(data.name);
    accessory = new Accessory(data.name, uuid, 8);
    // Setup HomeKit switch service
    accessory.addService(Service.Switch, data.name);
    // New accessory is always reachable
    accessory.reachable = true;
    
    /*
     name: name in Homekit
     subject: subject of  push notification, default is room name
     message: notification text to send
     priority: -2 to 2 priority, default 0
     */
    
    accessory.context.name = data.name;
    accessory.context.subject = data.subject;
    accessory.context.message = data.message;
    accessory.context.priority = data.priority;
    
    // getInitState
    var manufacturer = accessory.context.manufacturer || "Simone Karin Lehmann";
    var model = accessory.context.model || "Prowl Notification Switch";
    var serial = accessory.context.serial || "1.0.0";
    
    // Update HomeKit accessory information
    accessory.getService(Service.AccessoryInformation)
    .setCharacteristic(Characteristic.Manufacturer, manufacturer)
    .setCharacteristic(Characteristic.Model, model)
    .setCharacteristic(Characteristic.SerialNumber, serial);
    
    
    // Setup listeners for different switch events
    this.setService(accessory);
    
    // Store accessory in cache
    this.accessories[data.name] = accessory;
    // Register new accessory in HomeKit
    this.api.registerPlatformAccessories("homebridge-samplePlatform", "ProwlNotification", [accessory]);
    
}


// Method to setup listeners for different events
ProwlNotification.prototype.setService = function (accessory) {
    accessory.getService(Service.Switch)
    .getCharacteristic(Characteristic.On)
    .on('get', this.getState.bind(this, accessory.context))
    .on('set', this.setState.bind(this, accessory.context));
    
    accessory.on('identify', this.identify.bind(this, accessory.context));
}

// Method to handle identify request
ProwlNotification.prototype.identify = function (thisSwitch, paired, callback) {
    this.log(thisSwitch.name + " identify requested!");
    callback();
}


ProwlNotification.prototype.getState = function (thisSwitch, callback) {
    var self = this;
    callback(null);
}

ProwlNotification.prototype.setState = function (thisSwitch, state, callback) {
    var self = this;
    
    this.log("setState");
    
    if (state == true) {
        
        setTimeout(function () {
                   self.accessories[thisSwitch.name].getService(Service.Switch)
                   .setCharacteristic(Characteristic.On, !state);
                   }, 500);
        
        this.sendNotification(thisSwitch);
    }
    callback(null);
}

ProwlNotification.prototype.sendNotification = function(thisSwitch) {
    this.log("send notification");
    
    var data = querystring.stringify({ apikey : this.config.apikey,
                                     application : thisSwitch.subject,
                                     description : thisSwitch.message,
                                     priority : thisSwitch.priority
                                     })
    
    var options = {
    hostname: 'api.prowlapp.com',
    port: 443,
    path: '/publicapi/add',
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': data.length
    }
    };
    
    var req = https.request(options, res => {
                            this.log(`sendNotification statusCode: ${res.statusCode}`)
                            })
    
    req.on('error', error => {
           this.log("senNotification" + error)
           })
    
    req.write(data)
    req.end()
    
}
