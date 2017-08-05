import React from 'react';

const ToggleSwitch = ({ changeUserReViewSetting, reViewSetting }) => {
  return (
    <div className="toggle-switch">
      {reViewSetting ?
        <label className="switch">
          <input
            type="checkbox"
            onChange={changeUserReViewSetting}
            checked
          />
          <span className="slider round" />
          <label className="toggle-switch-label col-lg-6">Show Watched Movies</label>
        </label> :
          <label className="switch">
            <input
              type="checkbox"
              onChange={changeUserReViewSetting}
            />
            <span className="slider round" />
          <label className="toggle-switch-label col-lg-6">Show Watched Movies</label>
        </label>
      }
    </div>
  );
};

export default ToggleSwitch;
