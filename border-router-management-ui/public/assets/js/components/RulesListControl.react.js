/**
 * @jsx React.DOM
 */

var Flux = require('../Flux');
var React = require('react');


class RulesListControl extends React.Component {
	render() {
		var items = _.map(this.props.items, function(item) {
			if (item === undefined) {
				return (
					<div className="item">
						<div className="content">
							<a className="header">
							</a>
						</div>
					</div>
				);
			} else {
				return (
					<div className="item">
						<div className="content">
							<a className="header">
								{item.from.name} - {item.to.name}
							</a>
						</div>
					</div>
				);
			}
		});

		return (
			<div className="ui segment">
				<div className="ui divided list">
					{items}
				</div>
			</div>
		);
	}
}

RulesListControl.propTypes = {
	items: React.PropTypes.array.isRequired,
};

module.exports = RulesListControl;
