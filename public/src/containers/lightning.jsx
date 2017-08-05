import React from 'react';
import LargeMovieTile from '../components/largeMovieTile.jsx';

let tileIndex = 0;

class Lightning extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div className="row'">
        {this.props.movies.map(movie =>
          (<LargeMovieTile
            key={tileIndex += 1}
            handleLightningTileClick={this.props.handleLightningTileClick}
            movie={movie}
            isLightning
          />)
        )}
      </div>
    );
  }
}

export default Lightning;
