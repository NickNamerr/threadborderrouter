/**
 * @jsx React.DOM
 */

var Config = require('../Config');
var Flux = require('../Flux');
var React = require('react');
var Version = require('../Version');

class About extends React.Component {
  constructor(props) {
    super(props);
    
    this.state = {
      serverInfo: Flux.stores.store.serverInfo,
      displayName: 'About',
    };
  }

  componentDidMount() {
    Flux.stores.store.getBuildInfo(function(info) {
      this.setState({
        time: info.time,
        version: info.version
      });
    }.bind(this));
    
    Flux.stores.store.on('change', function() {
      this.setState({
        serverInfo: Flux.stores.store.serverInfo
      });
    }.bind(this));
  }

  componentWillUnmount() {
    Flux.stores.store.removeListener('change')
  }

  render() {
    var style = {'paddingLeft': '1em', 'margin': '0.0em 0.0em 0.2em 0.0em', 'fontSize': '14px'}; 
    var styleHeader = {'fontWeight': 'bold', 'margin': '0.0em 0.0em 0.2em 0.0em', 'fontSize': '14px'};

    // Make ethernet IPv6 Interfaces
    var ethernetInterfaces6 = _.map(this.state.serverInfo.eth0, function(item) {
      if (item.family == 'IPv6') {
        return (
          <p style={style} key={item.address}>
            {item.address}/{item.subnetSize}</p> 
        )
      }
    });

    // Make ethernet IPv4 Interfaces
    var ethernetInterfaces4 = _.map(this.state.serverInfo.eth0, function(item) {
      if (item.family == 'IPv4') {
        return (
          <p style={style} key={item.address}>
          {item.address}</p> 
        )
      }
    });

    // Make wireless IPv6 Interfaces
    var wirelessInterfaces6 = _.map(this.state.serverInfo.wlan0, function(item) {
      if (item.family == 'IPv6') {
        return (
         <p style={style} key={item.address}>
          {item.address}/{item.subnetSize}</p> 
        )
      }
    });

    // Make wireless IPv4 Interfaces
    var wirelessInterfaces4 = _.map(this.state.serverInfo.wlan0, function(item) {
      if (item.family == 'IPv4') {
        return (
          <p style={style} key={item.address}>
          {item.address}
          </p>
        )
      }
    });


    // Make ethernet IPv6 Interfaces
    var tunnelInterfaces6 = _.map(this.state.serverInfo.tun0, function(item) {
      if (item.family == 'IPv6') {
        return (
          <p style={style} key={item.address}>
          {item.address}/{item.subnetSize}</p> 
        )
      }
    });

    // Make ethernet IPv4 Interfaces
    var tunnelInterfaces4 = _.map(this.state.serverInfo.tun0, function(item) {
      if (item.family == 'IPv4') {
        return (
          <p style={style} key={item.address}>
          {item.address}
          </p>
        )
      }
    });

    return (
      <div className="ui segment control-panel"
        style={{margin: '0rem 0rem', 'borderRadius':'0rem'}} >
        <div className="header">
            <img className="logo" src="/assets/silicon-labs-logo.png" 
            style={{'width':'10em', 'marginLeft':'1em'}}/>
            <img className="threadlogo" src="/assets/thread-logo.png" 
            style={{'marginLeft':'1.5em'}}/>
        </div>
        
        <div className="ui divider"></div>
        
        <h4><u>Version</u></h4>
        <p>
          {this.state.version} {this.state.time}<br/>
        </p>
          
        <h4><u>Network </u></h4>

        <p style={styleHeader}>eth0:</p>
        {ethernetInterfaces6}
        {ethernetInterfaces4}
        <p style={styleHeader}>wlan0:</p>
        {wirelessInterfaces6}
        {wirelessInterfaces4}
        <p style={styleHeader}>tun0:</p>
        {tunnelInterfaces6}
        {tunnelInterfaces4}

        <h4><u>Support</u></h4>
        <p>
          Visit <a href="http://www.silabs.com">Silicon Labs</a><br />
          Visit <a href="http://community.silabs.com/">Silicon Labs Community</a><br />
          Contact <a href="http://www.silabs.com/support/Pages/default.aspx">Support</a><br/>
        </p>

        <p>
          <i>Copyright &copy; 2016 Silicon Laboratories, Inc. All rights reserved.</i>
        </p>

        <div className="ui divider"></div>

        <div className="footer">
          <h5 className="ui right aligned header">{this.state.version}</h5>
        </div>
      </div>
    );
  }
}

module.exports = About;
