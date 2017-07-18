import React from 'react';
import TagBubble from './tagBubble.jsx';

let bubbleCount = 0;
class LaunchPadTags extends React.Component {

  constructor(props) {
    super(props);
    this.goToNext = this.goToNext.bind(this);
    this.goToPrev = this.goToPrev.bind(this);
  }

  goToNext() {
    if (this.props.step < 3) {
      this.props.setStep(this.props.step + 1);
    }
  }

  goToPrev() {
    if (this.props.step > 1) {
      this.props.setStep(this.props.step - 1);
    }
  }

  render() {
    return (
      <div className="launchPadPage">
        <div className="launchPad-controls">
          <div>
            <button className="btn btn-default btn-spacing" onClick={this.goToPrev}>Prev</button>
            <button className="btn btn-primary btn-spacing" onClick={this.goToNext}>Next</button>
            {
              this.props.step === 3 ?
                <button
                  onClick={() => this.props.postSelectedTags(this.props.selectedTags)}
                  className="btn btn-success btn-spacing"
                >
                  Submit
                </button>
                : null
            }
          </div>
        </div>

        <div className="pull-left">
          {this.props.tagArray.map(tagItem =>
            (<TagBubble
              isSelected={this.props.isSelected}
              key={bubbleCount += 1}
              tagName={tagItem}
              tag={this.props.tag}
              selectItem={this.props.selectItem}
            />)
            
          )}
        </div>
      </div>
    );
  }
}

export default LaunchPadTags;

/*
<TagBubble
  selectItem={this.props.selectItem}
  tag={this.props.tag}
  key={bubbleCount += 1}
  tagName={tagItem}
/>
*/
