import React from 'react';
import { Button } from 'react-bootstrap';

let count = 0;

// This long const prevents a server call we don't HAVE to make.
const trophyIDs = ['Login1', 'Login10', 'Login50', 'Like1', 'Like10', 'Like50', 'Dislike1', 'Dislike10', 'Dislike50',
'Lightning1', 'Lightning10', 'Lightning50', 'Lightning100', 'MovieNight1', 'MovieNight10', 'LaunchPad1',
'Seen1', 'Seen10', 'Seen50', 'TrophyHunter15', 'TrophyHunter32', 'Horror1', 'Horror10', 'Horror50',
'Action1', 'Action10', 'Action50', 'Comedy1', 'Comedy10', 'Comedy50', 'Drama1', 'Drama10', 'Drama50'];

class DashboardTrophies extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      trophySliceIndex: 0
    };
    this.nextTrophies = this.nextTrophies.bind(this);
    this.prevTrophies = this.prevTrophies.bind(this);
  }

  nextTrophies() {

  }

  prevTrophies() {

  }

  render() {
    return (
      <div>
        <div className="row">
          <div className="col-lg-12">
            <div className="trophies-box badgeList">
              <div>
                {this.props.trophies.sort((a,b) => a - b).map(trophyString =>
                  (<div className="trophy">
                    <div key={count+=1} id={trophyString} className="sprite"></div>
                  </div>)
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="row">
          <div className="col-lg-4">
            <Button className="small-tile-button">
              <span className="glyphicon glyphicon-arrow-left" />
            </Button>
          </div>
          <div className="col-lg-4">
            <Button className="small-tile-button">
              <span className="glyphicon glyphicon-arrow-right" />
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

export default DashboardTrophies;

/*
<div className="test-badge-box">
  <div id="noob-2" className="sprite"></div>
</div>

*/