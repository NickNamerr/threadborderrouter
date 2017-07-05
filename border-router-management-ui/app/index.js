var coap       = require('coap')
  , express    = require('express')
  , http       = require('http')
  , os         = require('os')
  , format     = require('string-template')
  , _          = require('lodash')
  , ip         = require('ip')
  , url        = require('url'); 

coap.registerFormat('application/cbor', 60);

var app = express();
app.use(express.static('public'))

var PORT    = 80;
var server  = http.createServer(app);
var io      = require('socket.io')(server);

server.listen(PORT, function() {
  console.log('Sever listening on ', PORT);
});

var devicelist      =  {};
devicelist.nodelist =  [];

var rulesarray      =  [];
var ruleslist       =  {};

var coapPort        = 4983; //used to listen for coap locally (on-border-router)
var timeoutList     =  [];

// Store the type of server we have identified
var SERVER_TYPE_UNDEFINED = 0;
var SERVER_TYPE_BORDER_ROUTER = 1;
var SERVER_TYPE_EXTERNAL_SERVER = 2;

var serverType = SERVER_TYPE_UNDEFINED;

// Time in ms to scan for any changes in IP addresses
var INTERFACE_SCAN_TIMEOUT_MS = 5000;

// Time in milliseconds for temperature reporting interval
var DEFAULT_REPORTING_INTERVAL_TEMP = 15000;

// Time in milliseconds for contact state
var DEFAULT_REPORTING_INTERVAL_CONTACTSTATE = 1500;

// Used for listening for 2001:: global addresses
var globalAddressObjects = [];

// Used for sending commands to the border router application
var borderRouterAddressObjects = [];

// Used for sending commands to the external servers
var externalServerAddressObjects = [];

// This is the address manually given to the border router, and is
// used as a way to route external IP packets in to the border router
var gatewayAddress = '2001:db8:8569:b2b1::1';

// Used for routing CoAP in and out of the border router device, this
// will either be the gatewayAddress above, or a generic server if this
// is used extrenally from the border router itself
var communicationServer;

// Used for multicast brightness
var globalBrightness = 254; 

// Constants for LED values
var LED_ON = 1;
var LED_OFF = 0;
var LED_MAX_BRIGHTNESS = 254;
var LED_MIN_BRIGHTNESS = 1;
var LED_BRIGHTNESS_ADJUST_INCREMENT_UP = 34;
var LED_BRIGHTNESS_ADJUST_INCREMENT_DOWN = -34;

// Server Start:
//
// Look for wlan0, which is present on the border router itself and
// holds the gateway address for external routing - if we find this
// then we are a border router and need to scan the interfaces to
// keep track of the addresses we need to route externally
var ipInterfaces = os.networkInterfaces();

try {
  if (findAddressInObject(gatewayAddress, ipInterfaces['wlan0'])) {
    console.log('PLATFORM: BORDER ROUTER');
    console.log('Found Border Router Gateway address: ' + gatewayAddress);
    serverType = SERVER_TYPE_BORDER_ROUTER;

    // Start the gateway address CoAP listener
    communicationServer = startCoAPServer(gatewayAddress, coapPort);

    // Scan immediately for the border-router addresses since we
    // are running on a border router, then make sure it runs
    // on a timer to keep itself up to date
    scanInterfaces();
    setInterval(scanInterfaces, INTERFACE_SCAN_TIMEOUT_MS);
  }
} catch (e) {
  console.log('Error looking at IP interfaces for wlan0, ' + e);
}

if (serverType === SERVER_TYPE_UNDEFINED) {
  console.log('PLATFORM: EXTERNAL SERVER');
  console.log('No Border Router gateway address found: ' + gatewayAddress);
  serverType = SERVER_TYPE_EXTERNAL_SERVER;

  // Start a generic CoAP listener since we are running externally
  communicationServer = startCoAPServer();
}

function findAddressInObject(address, objects) {
  var found = false;
  for (var i = 0; i < objects.length; i++) {
    if (objects[i].address === address) {
      return true;
    }
  }
  return false;
}

function startCoAPServer(address, listenPort) {
  try {
    var coapServer;
    coapServer = coap.createServer({ type: 'udp6' });
    if (address == null) {
      coapServer.listen(function() {
        console.log('CoAP Server Started (Generic)');
      });
    } else {
      coapServer.listen(listenPort, address, function() {
        console.log('CoAP Server Started for IP=' + address + ' Port=' + listenPort);
      });
    }
    coapServer.on('request', handleCoAPRequest);
    coapServer.on('response', handleCoAPResponse);
    return coapServer;
  } catch(e) {
    console.log('Error Starting Border Router CoAP Server on IP=' + address + ': ' + e);
  }
  return null;
}

function scanInterfaces() {
  var ipInterfaces = os.networkInterfaces();

  // Look for tun0, present on the border router itself
  try {
    ipInterfaces['tun0'].forEach(function(iface) {
      try {
        // Ignore non-IPv6 and internal addresses
        if ('IPv6' !== iface.family || iface.internal !== false) {
          return;
        }

        // Keep track of all fdXX addresses, border router addresses (should
        // only be one at a time)
        if (iface.address.indexOf('fd') == 0) {
          if (!findAddressInObject(iface.address, borderRouterAddressObjects)) {
            console.log('Found new Border Router Address: ' + iface.address);
            var newBorderRouterAddressServer = {
              address: iface.address
            }
            borderRouterAddressObjects.push(newBorderRouterAddressServer);
          }
        }
      } catch (e) {
        console.log("scanInterfaces: Error setting up new servers, ", e);
      }
    });
  } catch (e) {
    console.log("scanInterfaces: No tun0 interface found - clearing existing lists, ", e);
    globalAddressObjects = [];
    borderRouterAddressObjects = [];
  }
}

function handleNodeJoined(req) {
  console.log('Handling Node Joined Request');
  try {
    var device = JSON.parse(req.payload);
    io.emit('nodejoined', JSON.stringify(device));
  } catch (e) {
    console.log("Error with node joined string parsing: ", e);
  }

  // Echo the nodejoined request to external servers that we are aware of
  if (serverType === SERVER_TYPE_BORDER_ROUTER) {
    coapPostToMultipleAddresses(externalServerAddressObjects, 'borderrouter/nodejoined', {
      payload: req.payload
    });
  }

  // sensor-actuator-node sample application requires subscription for timing and button presses
  if (device.type === "sensor-actuator-node") {
    if( serverType == SERVER_TYPE_BORDER_ROUTER) {
      coapPost(device.ip, 'subscriber/subscribe', {
        payload: JSON.stringify({ip: gatewayAddress, port: coapPort})
      });
    } else {
      coapPost(device.ip, 'subscriber/subscribe');
    }
  }

  var euiInList = false;
  device.ledOnOff = LED_ON;
  device.ledBrightness = LED_MAX_BRIGHTNESS;
  device.temperature = 25;

  for (var x = 0; x < devicelist.nodelist.length; x++) {
    if (devicelist.nodelist[x].eui64 === device.eui64) {
      devicelist.nodelist[x].ip = device.ip;
      // devicelist.nodelist[x].ledOnOff = LED_ON;
      // devicelist.nodelist[x].ledBrightness = LED_MAX_BRIGHTNESS;
      euiInList = true;
    }
    devicelist.nodelist[x].euiNum = parseInt(devicelist.nodelist[x].eui64.replace("000D6F000", "0"), 16);
    devicelist.nodelist[x].euiNum = parseInt(devicelist.nodelist[x].eui64.replace("000B571007", "0"), 16);
  }

  var sortBy = function(field, reverse, primer) {
    var key = primer ?
        function(x) { return primer(x[field])} :
        function(x) { return x[field]};
    reverse = !reverse ? 1 : -1;
    return function(a, b) {
      return a = key(a), b = key(b), reverse * ((a > b) - (b > a));
    };
  };

  devicelist.nodelist.sort(sortBy('euiNum', false, parseInt));

  if (euiInList === false) {
    devicelist.nodelist.push(device);
  }
}

function handleNodeTemperatureUpdate(req, res) {
  console.log('Handling Temperature Update of ' + payloadToString(req.payload));
  io.emit('tempread', payloadToString(req.payload));
}

function handleNodeButtonEvent(req, res) {
  console.log('Handling Button Toggle Event');
  io.emit('togglestate', payloadToString(req.payload));
}

function handleCoAPRequest(req, res) {
  console.log('Recieved CoAP Request URI ' + req.url + ' from node IP: ' + req.rsinfo.address);
  switch (req.url) {
    case '/borderrouter/nodejoined': handleNodeJoined(req, res); break;
    case '/device/announce': handleNodeJoined(req, res); break;
    case '/device/temperature' : handleNodeTemperatureUpdate(req, res); break;
    case '/device/button' : handleNodeButtonEvent(req, res); break;
    default: console.log('Unhandled URI ' + req.url); break;
  }
}

function handleCoAPResponse(req) {
  console.log("Received CoAP Response:" + req.toString());
}

// Socket IO connection management
io.on('connection', function(socket) {
  console.log('SocketIO Client Connected ID: ' + socket.id);

  io.emit('devicestate', JSON.stringify(devicelist));

  // Device/rule management
  socket.on('discover', function() {
    console.log('Discover devices');
    if (serverType === SERVER_TYPE_BORDER_ROUTER) {
      coapPostToMultipleAddresses(borderRouterAddressObjects, 'server/discover');
    } else {
      coapPost(gatewayAddress, 'server/discover');
    }
  });
  
  socket.on('clearlist', function(data) {
    console.log('Clear Device List');
    devicelist.nodelist = [];
    io.emit('devicestate', JSON.stringify(devicelist));
  });

  socket.on('bindrule', function(data) {
    console.log("SocketIO Recieved on 'bindrule': " + data.toString());

    try {
      var rule = JSON.parse(data);

      for (var x = 0; x < devicelist.nodelist.length; x++) {
        if (devicelist.nodelist[x].eui64 === rule.toeui64) {
          rule.toip = devicelist.nodelist[x].ip;
        }
      }

      ruleslist[rule.fromeui64] = rule.toeui64;
      rulesarray.push(rule);

    } catch (e) {
      console.log("Error with JSON Parsing in bindrule': " + e);
    }
  });

  socket.on('clearrules', function(data) {
    console.log('Clear Rules');
    rulesarray = [];
  });

  socket.on('loadinfo', function(data) {
    console.log('Requesting info be loaded from client connection');
    try {
      var ipInfoMessage = {};


      if (os.type() == 'Linux' || true) {
        try {
          var tempInterfaces = os.networkInterfaces(); 
          
          // Return info about eth0 interfaces over socket IO
          ipInfoMessage.eth0 = _.map(tempInterfaces['eth0'], function(iface) {
            var tempIface = {}
            if (iface.family == 'IPv6') {
              tempIface.subnetSize = sizeOfBitmask(iface.netmask);
            }
            tempIface.address = iface.address;
            tempIface.family = iface.family;
            return tempIface;
          });

          // Return info about wlan0 interfaces over socket IO
          ipInfoMessage.wlan0 = _.map(tempInterfaces['wlan0'], function(iface) {
            var tempIface = {}
            if (iface.family == 'IPv6') {
              tempIface.subnetSize = sizeOfBitmask(iface.netmask);
            }
            tempIface.address = iface.address;
            tempIface.family = iface.family;
            return tempIface;
          });

          // Return info about tun0 interfaces over socket IO
          ipInfoMessage.tun0 = _.map(tempInterfaces['tun0'], function(iface) {
            var tempIface = {}
            if (iface.family == 'IPv6') {
              tempIface.subnetSize = sizeOfBitmask(iface.netmask);
            }
            tempIface.address = iface.address;
            tempIface.family = iface.family;
            return tempIface;
          });
        } catch(e) {
          console.log("Error getting IP addresses from system: " + e.toString());
        }
      } else {
        ipInfoMessage.eth0 = [];
        ipInfoMessage.eth0.push({address: 'unknown', family: 'unknown'});
      }

      socket.emit('info', JSON.stringify(ipInfoMessage));
    } catch (e) {
      console.log("Error sending IP address over socket: " + e.toString());
    }
  });

  function sizeOfBitmask(string) {
    //Convert to form ffffff
    var removeColons = string.replace(/:/gi,''); 

    var size = 0;

    for (var i = 0, len = removeColons.length; i < len; i++) { 
      size = size + parseInt(removeColons.charAt(i), 16).toString(2).replace(/0/gi,'').length;
    }

    return size; 
  }

  // Device/node specific commands
  socket.on('togglebuzz', function(data) {
    var device = getObjectFromData(data);
    console.log('Toggle Buzz on ' + device.ip.toString());
    coapPost(device.ip, 'device/buzzer');
  });

  socket.on('togglenode', function(data) {
    var device = getObjectFromData(data);
    nodeToggle(device.ip);
  });

  socket.on('resetdevice', function(data) {
    var device = getObjectFromData(data);
    nodeReset(device);
  });

  socket.on('resetnetwork', function(data) {
    console.log('Clear Device List and Reset Network');
    var device = getObjectFromData(data);
    networkReset();
  });

  socket.on('error', function(err) {
    console.log("Socket IO Error: " + err.stack);
  });
});

function getObjectFromData(data) {
  // Parses the data that comes from Socket IO clients
  try {
    var device = JSON.parse(data);
    return device;
  } catch (e) {
    console.log('Error parsing JSON data: ' + data.toString());
  }
  return null;
}

function payloadToString(buf) {
  return String.fromCharCode.apply(null, new Uint16Array(buf));
}

function getDeviceFromIPAddress(ipAddress) {
  var deviceListByIPAddress = _.indexBy(devicelist.nodelist, 'ip');
  return deviceListByIPAddress[ipAddress];
}

function coapPost(address, path, options) {
  console.log('POST to coap://[' + address + ']/' + path);

  options = options || {};

  var req = coap.request({
    'host': address,
    'pathname': path,
    'method': 'POST',
    'confirmable': options.confirmable || true
  });

  if (options.payload != null) {
    req.write(options.payload);
  }

  req.end();
}

function coapPostToMultipleAddresses(addressObjects, path, options) {
  for (var i = 0; i < addressObjects.length; i++) {
    coapPost(addressObjects[i].address, path, options);
  }
}

//
// Dimmable Light
//
function nodeToggle(address) {
  var deviceFromList = getDeviceFromIPAddress(address);
  if (deviceFromList.ledOnOff === LED_OFF) {
    deviceFromList.ledOnOff = LED_ON;
  } else {
    deviceFromList.ledOnOff = LED_OFF;
  }
  console.log('Toggle Node LED on ' + address.toString() + ' to ' + deviceFromList.ledOnOff.toString());

  coapPost(address, 'device/onoffout', {
    payload: deviceFromList.ledOnOff.toString()
  });
}

function nodeReset(device) {
  console.log('Send Node Reset: ' + device.ip.toString());
  var deviceFromList = getDeviceFromIPAddress(device.ip);

  devicelist.nodelist = _.filter(devicelist.nodelist, function(device){
    return !(device.eui64 === deviceFromList.eui64); 
  }.bind(this)); 

  io.emit('devicestate', JSON.stringify(devicelist));

  coapPost(device.ip, 'device/reset', {
    confirmable: false
  });
}

function networkReset() {
  devicelist.nodelist = [];

  io.emit('devicestate', JSON.stringify(devicelist));

  coapPostToMultipleAddresses(borderRouterAddressObjects, 'borderrouter/reset', {
    confirmable: false
  });
}

