
/**
 * @jsx React.DOM
 */

var Flux = require('../Flux');
var React = require('react');
var DeviceListExtendedInfo = require('./DeviceListExtendedInfo.react.js');

class DeviceListControl extends React.Component {
  
  constructor(props) {
    super(props);
  }

  onDeviceToggle(item) {
    Flux.actions.toggleLightThread(item);
  }

  onDeviceBuzz(item) {
    Flux.actions.toggleBuzzThread(item);
  }

  onExtendToggle(item) {
    Flux.stores.store.extendItemToggle(item.data);
  }

  render() {
    var items = _.map(this.props.items, function(item) {
      var deviceControls = (
          <div>
            <div className="ui basic button silabsiconbuttons"
              onClick={this.onDeviceToggle.bind(this, item)}>
              Toggle Light
            </div>
            <div className="ui basic button silabsiconbuttons"
              onClick={this.onDeviceBuzz.bind(this, item)}>
              Buzz
            </div>
            <br/>
            <div className='ui basic button silabssmalltext'
              style={{'boxShadow':'0px 0px 0px 0px rgba(39, 41, 43, 0.0) inset'}}>
              {(item.data.temp === undefined) ? 'Temp: Loading..' :
                'Temp: ' + item.data.temp + ' °C'
              }
            </div>
            <div className='ui basic button silabssmalltext'
              style={{'boxShadow':'0px 0px 0px 0px rgba(39, 41, 43, 0.0) inset'}}>
              {item.data.buttonState ? "Button: On" : "Button: Off"}
            </div>
          </div>
        );

      var dropdown = (
        <i className="large caret right icon"
          style={{ position: 'absolute', right: '0em', top: '1.2em',
          'float': 'right'}}
          onClick={this.onExtendToggle.bind(this, item)}
        />
      );

      var dropdownExtended = (
        <i className="large caret down icon"
          style={{ position: 'absolute', right: '0em', top: '1.2em',
          'float': 'right'}}
          onClick={this.onExtendToggle.bind(this, item)}
        />
      );

      return (
        <div className="item">
          <img className="ui tiny image"
            style={{ width: '70px', marginRight: '2px', marginLeft: '2px'}}
            src={item.image} />
          <div className="content">
            <div className="silabsicon header">{item.name + ' ' + item.data.itemNum}</div>
            <div className="description">
              { item.description ? item.description : '' }
            </div>
            {deviceControls}
          </div>
          <div>
            { item.data.extended ? <DeviceListExtendedInfo item={item}/> : '' }
          </div>
            { !item.data.extended ? dropdown : dropdownExtended }
        </div>
      );
    }, this);

    return (
      <div className="ui segment">
        <div className="ui divided list device-list">
          {items}
        </div>
      </div>
    );
  }
}

DeviceListControl.propTypes = {
  items: React.PropTypes.array.isRequired
};

module.exports = DeviceListControl;
