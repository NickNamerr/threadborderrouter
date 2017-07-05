var Constants = require('../Constants');

var ApiUrl = '';

var _socket = null;

function restfulCall (type, url, data, success, error) {
  $.ajax({
    type: type,
    url: ApiUrl + url,
    contentType: 'application/json',
    xhrFields: {
      withCredentials: true
    },
    data: JSON.stringify(data),
    processData: false,
    success: success,
    error: error,
    crossDomain: true
  });
}

var ServerActions = {
  // Bind all actions to socket callback
  connect: function() {
             console.log("CONNECTION");
    _socket = io.connect();

    _socket.on('nodejoined', function(newNode) {
      this.dispatch(Constants.NODE_JOINED, JSON.parse(newNode));
    }.bind(this));

    _socket.on('nodeleft', function(leftNode) {
      this.dispatch(Constants.NODE_LEFT, JSON.parse(leftNode));
    }.bind(this));

    _socket.on('devicestate', function(state) {
      this.dispatch(Constants.DEVICE_LIST_UPDATED, JSON.parse(state));
    }.bind(this));

    _socket.on('ruleslist', function(rulesstate) {
      this.dispatch(Constants.RULES_LIST_UPDATED, JSON.parse(rulesstate).ruleslist);
    }.bind(this));

    _socket.on('info', function(data) {
      this.dispatch(Constants.INFO_UPDATE, JSON.parse(data));
    }.bind(this));

    _socket.on('togglestate', function(payload) {
      this.dispatch(Constants.NEW_TOGGLE, JSON.parse(payload));
    }.bind(this));

    _socket.on('tempread', function(message) {
      this.dispatch(Constants.NEW_TEMP, message);
    }.bind(this));

    _socket.on('contact', function(message) {
      this.dispatch(Constants.NEW_CONTACT, message);
    }.bind(this));

    _socket.on('connect_error', function() {
        console.log('connect_error');
    }.bind(this));

    _socket.on('connect_timeout', function() {
        console.log('connect_timeout');
    }.bind(this));

    _socket.on('reconnect_attempt', function() {
        console.log('reconnect_attempt');
    }.bind(this));

    _socket.on('reconnect_failed', function() {
        console.log('Reconnection failed');
    }.bind(this));
  },

  clearListThread: function() {
    _socket.emit('clearlist', '{"cmd":"cleardevices"}');
  },

  toggleLightThread: function(item) {
    _socket.emit('togglenode', '{"ip":"' + item.data.ip + '"}');
  },

  toggleBuzzThread: function(item) {
    _socket.emit('togglebuzz', '{"ip":"' + item.data.ip + '"}');
  },

  createRuleThread: function(from, to) {
    _socket.emit('bindrule', '{"fromeui64":"' + from + '","toeui64":"' + to + '"}');
  },

  clearRulesThread: function() {
    _socket.emit('clearrules', '{"cmd":"clearrules"}');
  },

  requestDevicesThread: function(time) {
    _socket.emit('discover', '{"cmd":"request","time":"15"}');
  },

  getIP: function() {
    _socket.emit('loadinfo', '{"cmdtype":"getIP", "cli": "null"}');
  },

  // resets the selected device
  resetDevice: function(item) {
    _socket.emit('resetdevice', '{"cmd":"resetdevice","ip":"' + item.ip + '"}');
  },

  // resets the network
  resetNetwork: function() {
    _socket.emit('resetnetwork', '{"cmd":"resetnetwork"}');
  },
};

module.exports = ServerActions;
