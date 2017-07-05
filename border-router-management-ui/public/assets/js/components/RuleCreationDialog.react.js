/**
 * @jsx React.DOM
 */

var Dropdown = require('./Dropdown.react');
var React = require('react');


class RuleCreationDialog extends React.Component {
	
	_onInputSelect(switchId) {
		this.setState({input: switchId});
	}

	_onOutputSelect(lightId) {
		this.setState({output: lightId});
	}

	_onCreate() {
		if (this.state && !_.isUndefined(this.state.input) && !_.isUndefined(this.state.output)) {
			if (this.props.onRuleCreate) {
				this.props.onRuleCreate(this.state);
			}
		}
	}

	render() {
		return (
			<div>
				<h5>Input Node</h5>
				<Dropdown onSelect={this._onInputSelect.bind(this)}
					options={this.props.inputdevices} />
				<h5>Output Node</h5>
				<Dropdown onSelect={this._onOutputSelect.bind(this)}
					options={this.props.outputdevices} />
				<div className="ui divider"></div>
				<div className="positive ui button"
					onClick={this._onCreate.bind(this)}>
					Bind
				</div>
				<div className="negative ui button"
					onClick={this.props.onCancel}>
					Cancel
				</div>
			</div>
		);
	}
}

RuleCreationDialog.propTypes = {
	inputdevices: React.PropTypes.array.isRequired,
	outputdevices: React.PropTypes.array.isRequired,
	onRuleCreate: React.PropTypes.func,
	onCancel: React.PropTypes.func,
};

module.exports = RuleCreationDialog;
