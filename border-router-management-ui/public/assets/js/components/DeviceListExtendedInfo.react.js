
/**
 * @jsx React.DOM
 */

var Flux = require('../Flux');
var React = require('react');

class DeviceListExtendedInfo extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      showMessage: false
    };
  }

  resetDevice() {
    Flux.actions.resetDevice(this.props.item.data);
  }

  render() {
    var item = this.props.item;

    return (
      <div className="ui grid">
        <div className="two column row">
          <div className="column">
            <p style={{'padding-left': '0px', 'font-size':'10pt', 'margin': '0.0em 0em 0.0em 0.5em'}}>IP: {item.data.ip}</p>
            <p style={{'padding-left': '0px', 'font-size':'10pt', 'margin': '0.0em 0em 0.0em 0.5em'}}>EUI: {item.data.eui64}</p>
          </div>
          <br/>
          <div className="column">
            <div className='ui basic left floated silabsiconbuttons button'
              style={{'padding-left': '0px', 'margin': '0.5em 0em 0.5em 0.5em'}}
              onClick={this.resetDevice.bind(this)}>
              Detach Device From Network
            </div>
          </div>
        </div>
      </div>);
  }
}

DeviceListExtendedInfo.propTypes = {
  item: React.PropTypes.object.isRequired
};

module.exports = DeviceListExtendedInfo;
