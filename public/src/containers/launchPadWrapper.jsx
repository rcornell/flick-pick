import React from 'react';
import axios from 'axios';
import LaunchPad from './launchPad.jsx';
import { Redirect } from 'react-router-dom';

// DATA OBJECTS
const decades = ['Silent Era', '30s', '40s', '50s', '60s', '70s', '80s', '90s', '00s'];
const actors = ['Christian Bale', 'Al Capino', 'Clint Eastwood'];
const directors = ['Steven Spielberg', 'Christopher Nolan'];
const genres = ['Action', 'Adventure', 'Animation', 'Biography', 'Comedy', 'Crime', 'Documentary', 'Drama', 'Family', 'Film-Noir', 'History', 'Horror', 'Music', 'Musical', 'Mystery', 'Romance', 'Sci-Fi', 'Sport', 'Thriller', 'War', 'Western'];
const rated = ['G', 'PG', 'PG13', 'R', 'NC-17'];
const tagsObj = {
  actor: actors,
  director: directors,
  genre: genres,
  year: decades,
  rated
};
const selectedObj = {
  actor: [],
  director: [],
  genre: [],
  rated: [],
  year: []
};

class LaunchPadWrapper extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      tagData: tagsObj,
      selectedTags: selectedObj
    };

    this.isSelected = this.isSelected.bind(this);
    this.selectItem = this.selectItem.bind(this);
    this.getTagsData = this.getTagsData.bind(this);
  }

  componentWillMount() {
    // this.getTagsData();
  }

  selectItem(tagItem, tag) {
    if (this.state.selectedTags[tag].indexOf(tagItem) > -1) {
      const index = this.state.selectedTags[tag].indexOf(tagItem);
      const selectedTags = this.state.selectedTags[tag].filter((_, i) => i !== index);
      console.log('selectedTags is now: ', selectedTags);
      this.setState({ selectedTags });
    } else {
      const newSelectedTagObj = Object.assign({}, this.state.selectedTags);
      newSelectedTagObj[tag].push(tagItem);
      this.setState({ selectedTags: newSelectedTagObj });
    }
  }

  postSelectedTags(submittedTags) {
    console.log('Entering postSelectedTags with tags: ', submittedTags);
  }

  getTagsData() {
    return axios.get('/api/selectedTags')
      .then((results) => {
        console.log('Tags API Call', results.data);
        this.setState({
          tagData: results.data
        });
        return results;
      })
      .catch(err => console.error('Error retrieving movies: ', err));
  }

  isSelected(tag, tagItem) {
    return (this.state.selectedTags[tag].indexOf(tagItem) > -1) ? 'tag-bubble-active' : 'tag-bubble-default';
  }

  render() {
    return (
      <div>
        <LaunchPad
          tags={this.state.tagData}
          selectedTags={this.state.selectedTags}
          isSelected={this.isSelected}
          selectItem={this.selectItem}
          postSelectedTags={this.postSelectedTags}
        />
      </div>
    );
  }
}

export default LaunchPadWrapper;
