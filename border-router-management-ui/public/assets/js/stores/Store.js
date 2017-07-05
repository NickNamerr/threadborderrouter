var Constants = require('../Constants');
var Fluxxor = require('fluxxor');

var friendlyNames = {};
friendlyNames[Constants.DEVICE_TYPE_SENSOR_NODE] = 'Device';

var Store = Fluxxor.createStore({
  initialize: function() {
    this.devices = [];
    this.buildinfo = '';
    this.rules = [];
    this.serverInfo = {};

    this.bindActions(
      Constants.DEVICE_LIST_UPDATED, this.onDeviceListUpdated,
      Constants.RULES_LIST_UPDATED, this.onRulesListUpdated,
      Constants.NODE_LEFT, this.onNodeLeft,
      Constants.NODE_JOINED, this.onNodeJoined,
      Constants.INFO_UPDATE, this.onServerInfo,
      Constants.NEW_TOGGLE, this.onToggle,
      Constants.NEW_TEMP, this.onTemp
    );
  },

  getBuildInfo: function(callback) {
    if (this.buildinfo === '') {
      $.getJSON('/assets/version.json', function(data) {
        this.buildinfo = data;
        callback(this.buildinfo);
      }.bind(this));
    } else {
      callback(this.buildinfo);
    }
  },

  onDeviceListUpdated: function(devices) {
    var devicesByEui64 = this._devicesByEui64();

    var items = _.map(devices.nodelist, function(item) {
      item.buttonState = item.buttonState || false;

      // Preserve extended information
      if (devicesByEui64[item.eui64] === undefined) {
        item.extended = false;
      } else {
        item.extended = devicesByEui64[item.eui64].extended;
        item.buttonState = devicesByEui64[item.eui64].buttonState || false;
        item.temp = devicesByEui64[item.eui64].temp;
      }
      return item;
    }, this);

    // Add logic to add the meta-devices
    this._updateDeviceList(items);
  },

  onServerInfo: function(serverInfo) {
    this.serverInfo = serverInfo;
    this.emit('change');
  },

  onRulesListUpdated: function(rules) {
    var formattedRules = this.convertRulesFromIndex(rules);
    this.rules = formattedRules;
    this.emit('change');
  },

  onToggle: function(toggleState) {
    // Add contact to node data
    var items = _.map(this.devices, function(item) {
      if (item.eui64 === toggleState.eui64) {
        item.buttonState = !item.buttonState;
        return item;
      } else {
        return item;
      }
    }, this);

    this._updateDeviceList(items);
  },

  onTemp: function(tempMessage) {
    var items = _.map(this.devices, function(item) {
      if (item.eui64 === JSON.parse(tempMessage).eui64) {
        item.temp = (JSON.parse(tempMessage).temp / 1000).toFixed(2);
        return item;
      } else {
        return item;
      }
    }, this);

    this._updateDeviceList(items);
  },

  onNodeLeft: function(leftNode) {
    _.remove(this.devices, function(device) {
      return device.eui64 === leftNode.eui64;
    });

    _.remove(this.rules, function(rule) {
      return rule.from === leftNode.eui64 ||
        rule.to === leftNode.eui64;
    });

    this._updateDeviceList(this.devices);
  },

  onNodeJoined: function(newNode) {
    this._updateDevice(newNode.eui64, newNode);
  },

  _updateDevice: function(eui64, attributes) {
    var devicesByEui64 = this._devicesByEui64();
    var device = devicesByEui64[eui64] || {};

    _.assign(device, attributes);
    device.extended = device.extended || false;
    device.buttonState = device.buttonState || false;

    devicesByEui64[eui64] = device;

    this._updateDeviceList(_.values(devicesByEui64));
  },

  _updateDeviceList: function(devices) {
    this.devices = this.orderDeviceList(devices);
    this.emit('change');
  },

  _devicesByEui64: function() {
    return _.indexBy(this.devices, 'eui64');
  },

  sortBy: function(field, reverse, primer) {
    var key = primer ?
        function(x) { return primer(x[field]) } :
        function(x) { return x[field] };
    reverse = !reverse ? 1 : -1;
    return function(a, b) {
        return a = key(a), b = key(b), reverse * ((a > b) - (b > a));
    };
  },

  convertRulesFromIndex: function(rulesupdate) {
    var devicesByIndex = _.indexBy(this.devices, 'index');

    return _.map(rulesupdate, function(rule) {
      if (devicesByIndex[rule.inindex] === undefined ||
        devicesByIndex[rule.outindex] === undefined)
      {
      } else {
        return {
          from: devicesByIndex[rule.inindex].eui64,
          to: devicesByIndex[rule.outindex].eui64
        };
      }
    });
  },

  /* Gets rules with additional data populated from device list */
  getRules: function() {
    // Split into form: {29u9f2: {euid: 29u9f2, index: 0, ...}} for easy lookup
    var devicesByEui64 = this._devicesByEui64();
    // Turn pairs of eui64 references to devices from this.devices
    return _.map(this.rules, function(rule) {
      if ( rule != undefined) {
        return {
          from: devicesByEui64[rule.from.eui64],
          to: devicesByEui64[rule.to.eui64]
        };
      }
    });
  },

  addRule: function(fromNode, toNode) {
    this.rules.push({from: fromNode, to: toNode});
    this.emit('change');
  },

  clearRules: function() {
    this.rules.length = 0;
    this.emit('change');
  },

  extendItemToggle: function(passedItem) {
    var items = _.map(this.devices, function(item) {
      if (item.eui64 === passedItem.eui64) {
        item.extended = !item.extended; 
        return item;
      } else {
        return item;
      }
    }, this);

    this._updateDeviceList(items);
  },

  getHumanReadableDevice: function(device) {
    var deviceType = device.type;
    var humanName;
    var image;

    if (deviceType === Constants.DEVICE_TYPE_SENSOR_NODE) {
      image = '/assets/bulbsensor.png';
      humanName = friendlyNames[deviceType];
    } else {
      humanName = 'Unknown';
      image = null;
    }

    return {
      name: humanName,
      image: image,
      data: device
    };
  },

  getHumanReadableDevices: function(devices) {
    if (!devices) {
      devices = this.getDevices();
    }
    return _.map(devices, this.getHumanReadableDevice);
  },

  getHumanReadableRules: function() {
    // Process like a monad
    return _.map(this.getRules(), (function(rule) {
      if(rule != undefined)
      {
        return {
          to: this.getHumanReadableDevice(rule.to),
          from: this.getHumanReadableDevice(rule.from)
        };
      }
    }).bind(this));
  },

  getGlobalIP: function() {
    return this.ip.ip;
  },

  isThreadSensorNode: function(device) {
    var deviceType = device.type;
    return deviceType === Constants.DEVICE_TYPE_SENSOR_NODE;
  },

  getDevices: function() {
    return this.devices;
  },

  getThreadOutputDevices: function() {
    return _.filter(this.getDevices(), function(device) {
      var deviceType = device.type;
      return deviceType === Constants.DEVICE_TYPE_SENSOR_NODE;
    });
  },

  getThreadInputDevices: function() {
    return _.filter(this.getDevices(), function(device) {
      var deviceType = device.type;
      return (deviceType == Constants.DEVICE_TYPE_SENSOR_NODE);
    });
  },

  orderDeviceList: function(devices) {
    var modifiedDevices = devices.sort(function(a, b) {
      return parseInt(a.eui64, 16) - parseInt(b.eui64, 16);
    });

    _.times(modifiedDevices.length, function(i) {
      modifiedDevices[i].itemNum = i + 1;
    });

    return modifiedDevices;
  },

  testDevices: function() {
    this.onDeviceListUpdated(this.createDeviceList());
  },

  createDeviceList: function() {
    var items = [];

    var testDevice6 = {
      ip: '0000:0000:0000:0000:0000:0000:0000:1234',
      eui64: '0000000000000007',
      type: 'lighting-sample'
    };

    testDevice6.temp = '72';
    testDevice6.luxReading = '301';
    testDevice6.buttonState = false;
    testDevice6.extended = false;
    items.push(testDevice6);

    var testDevice6Dup = {
      ip: '0000:0000:0000:0000:0000:0000:0000:1234',
      eui64: '0000000000000017',
      type: 'lighting-sample'
    };

    testDevice6Dup.temp = '72';
    testDevice6Dup.luxReading = '301';
    testDevice6Dup.buttonState = false;
    testDevice6Dup.extended = false;
    items.push(testDevice6Dup);

    var testDevice7 = {
      ip: '0000:0000:0000:0000:0000:0000:0000:1234',
      eui64: '0000000000000006',
      type: 'sensor-actuator-node'
    };

    testDevice7.occupancystate = 0;
    testDevice7.extended = false;
    items.push(testDevice7);

    var tempDevices = {};
    tempDevices.nodelist = items; 
    return tempDevices;
  }
});

module.exports = Store;
