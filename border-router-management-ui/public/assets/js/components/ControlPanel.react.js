/**
 * @jsx React.DOM
 */

var Config = require('../Config');
var DeviceListControl = require('./DeviceListControl.react');
var Flux = require('../Flux');
var React = require('react');
var RuleCreationDialog = require('./RuleCreationDialog.react');
var RulesListControl = require('./RulesListControl.react');
var Version = require('../Version');

class ControlPanel extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
		  addingDevice: false,
		  addingDeviceProgress: 0,
		  addingRule: false,
		  reforming: false,
		  displayName: 'ControlPanel'
		};
	}

	componentDidMount() {
		Flux.stores.store.getBuildInfo(function(info) {
		  this.setState({
		    version: info.version
		  });
		  this.forceUpdate();
		}.bind(this));

		Flux.stores.store.on('change', function() {
		    this.forceUpdate();
		}.bind(this));
	}

	componentWillUnmount() {
	  Flux.stores.store.removeListener('change')
	}

	onDiscover() {
		Flux.actions.requestDevicesThread();
	}

	onClearList() {
		Flux.actions.clearListThread();
		this.forceUpdate();
	}

	onAddRule() {
		this.setState({addingRule: true});
	}

	onClearRules() {
		Flux.stores.store.clearRules();
		Flux.actions.clearRulesThread();
	}

	onCreateRuleThread(state) {
		Flux.stores.store.addRule(state.input, state.output)
		Flux.actions.createRuleThread(state.input.eui64, state.output.eui64);
		this.setState({addingRule: false});
	}

	onCancelRuleCreation() {
		this.setState({addingRule: false});
	}

	onNetworkReset() {
		Flux.actions.resetNetwork();
	}

	_generateInputThreadList() {
		return _.chain(Flux.stores.store.getThreadInputDevices()).map(function(device) {
			var name = Flux.stores.store.getHumanReadableDevice(device);
			return {value: device, name: name.name};
		}).value();
	}

	_generateOutputThreadList() {
		//all thread devices can be output
		return _.chain(Flux.stores.store.getThreadOutputDevices()).map(function(device) {
			var name = Flux.stores.store.getHumanReadableDevice(device);
			return {value: device, name: name.name};
		}).value();
	}

	render() {
		var devices = (
			<div className="column">
				<DeviceListControl 
					items={Flux.stores.store.getHumanReadableDevices()}/>
				<div className="ui grid">
					<div className="three column row">
						<div className="column">
							<div className='ui basic silabsglobal button'
								style={{width: '100%', padding: '1em .5em 1em .5em'}}
								onClick={this.onDiscover.bind(this)}>
								Discover Devices
							</div>
						</div>
						<div className="column">
							<div className='ui basic silabsglobal button'
								style={{width: '100%', padding: '1em .5em 1em .5em'}}
								onClick={this.onClearList.bind(this)}>
								Clear Devices
							</div>
						</div>
						<div className="column">
							<div className='ui basic silabsglobal button'
								style={{width: '100%', padding: '1em .5em 1em .5em'}}
								onClick={this.onNetworkReset.bind(this)}>
							  Network Reset
							</div>
						</div>
					</div>
				</div>
			</div>
		);

		var rules = (
			<div className="column">
				<h4>Device Binding Rules</h4>
				<RulesListControl items={Flux.stores.store.getHumanReadableRules()} />

				<div className={
					'positive ui button ' + (!this.state.addingRule ? '' : 'hidden')}
					onClick={this.onAddRule.bind(this)}>
					<i className="plus icon"></i>
					Set Rule
				</div>
				<div className={
					'negative ui button ' + (!this.state.addingRule ? '' : 'hidden')}
					onClick={this.onClearRules.bind(this)}>
					Clear Rules
				</div>
				<div className={'ui segment adding-rule ' + (this.state.addingRule ? '' : 'hidden-rule')}>
					<RuleCreationDialog
						inputdevices={this._generateInputThreadList()}
						outputdevices={this._generateOutputThreadList()}
						onCancel={this.onCancelRuleCreation.bind(this)}
						onRuleCreate={this.onCreateRuleThread.bind(this)} />
				</div>
			</div>
		);

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
				<div className="ui stackable grid">
					<div className="sixteen wide column">
						{devices}
					</div>
				</div>
				<br/>
				<div className="ui divider"></div>
				<div className="footer">
					<h5 className="ui right aligned header">{this.state.version}</h5>
				</div>
			</div>
		);
	}
}

module.exports = ControlPanel;
