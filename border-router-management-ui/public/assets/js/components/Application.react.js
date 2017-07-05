/**
 * @jsx React.DOM
 */

var ControlPanel = require('./ControlPanel.react');
var Config = require('../Config');
var Flux = require('../Flux');
var React = require('react');
var About = require('./About.react');

class Application extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			selectedMenu: 'home',
			windowWidth: window.innerWidth
		};
	}

	selectTab(tab) {
		this.setState({
			selectedMenu: tab
		});
	}

	handleClick(tab) {
		this.selectTab(tab)
	}

  handleResize(e) {
    this.setState({ 
    	windowWidth: window.innerWidth
    });
  }

	componentDidMount() {
		Flux.actions.connect();
		Flux.actions.getIP();
		window.addEventListener('resize', this.handleResize.bind(this));
	}

	componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize.bind(this));
  }

	render() {
		var spaced;
		if (this.state.windowWidth < 500) {
			spaced = 'fluid two item';
		} else {
			spaced = '';
		}

		var menu = (
			<div className={'ui ' + spaced + ' menu'}
				style={{margin: '0rem 0rem', 'borderRadius':'0rem'}} >
				<a className={this.state.selectedMenu === 'home' ? 'active item' : 'item'}
					onTouchStart={this.handleClick.bind(this, 'home')}
					onClick={this.handleClick.bind(this, 'home')}>
					<i className="home icon"></i> Home
				</a>
				<a className={this.state.selectedMenu === 'about' ? 'active item' : 'item'}
					onTouchStart={this.handleClick.bind(this, 'about')}
					onClick={this.handleClick.bind(this, 'about')}>
					<i className="info circle icon"></i> About
				</a>
			</div>
		);

		var content;

		if(this.state.selectedMenu == 'home'){
			content = <ControlPanel />;
		} else if(this.state.selectedMenu == 'about'){
			content = <About />;
		}

		return (
			<div className="application">
				{menu}
				{content}
			</div>
		);
	}
}

module.exports = Application;
