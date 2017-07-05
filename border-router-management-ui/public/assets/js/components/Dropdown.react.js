/**
 * @jsx React.DOM
 */

var Flux = require('../Flux');
var React = require('react');

class Dropdown extends React.Component {
	componentDidMount() {
		$(React.findDOMNode(this)).dropdown({
			transition: 'slide down'
		});
	}

	onSelect(value) {
		if (this.props.onSelect) {
			this.props.onSelect(value);
		}
	}

	render() {
		var items = _.map(this.props.options, function(item, index) {
			return (
				<div className="item"
					onClick={this.onSelect.bind(this, item.value)}>{item.name}</div>
			);
		}, this);

		return (
			<div className="ui selection dropdown">
				<input type="hidden" />
				<div className="text">No Selection</div>
				<i className="dropdown icon"></i>
				<div className="menu">
					{items}
				</div>
			</div>
		);
	}
}

Dropdown.propTypes = {
	options: React.PropTypes.array.isRequired,
	onSelect: React.PropTypes.func.isRequired
};

module.exports = Dropdown;
