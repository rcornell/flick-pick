import React from 'react';
import SmallMovieTile from './smallMovieTile.jsx';

const SearchResultsTable = ({ movies, selectSmallTile }) => {
  let count = 0;
  const arr = [];
  for (let i = 0; i < movies.length; i += 2) {
    const result = (
      <div key={count += 1}>
        <div>
          <span className="col-sm-6">
            { movies[i] &&
              <SmallMovieTile
                key={count += 1}
                showButtons
                selectSmallTile={selectSmallTile}
                movie={movies[i]}
                fromSearch
              />
            }
          </span>
          <span className="col-sm-6">
            { movies[i + 1] &&
              <SmallMovieTile
                key={count += 1}
                showButtons
                selectSmallTile={selectSmallTile}
                movie={movies[i + 1]}
                fromSearch
              />
            }
          </span>
        </div>
      </div>
    );
    arr.push(result);
  }

  return (
    <div className="col-sm-6 search-table">
      {movies.length ? arr : null}
    </div>
  );
};

export default SearchResultsTable;
