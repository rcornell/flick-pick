import React from 'react';
import Welcome from '../containers/Welcome.jsx';


class App extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <Welcome />
    );
  }
}

export default App;