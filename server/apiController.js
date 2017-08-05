const axios = require('axios');
const Sequelize = require('sequelize');
const db = require('../database/dbsetup.js');

const omdbUrl = `http://www.omdbapi.com/?apikey=${process.env.OMDB_API_KEY}&t=`;
const omdbIMDBSearchUrl = `http://www.omdbapi.com/?apikey=${process.env.OMDB_API_KEY}&i=`;
const omdbSearchUrl = `http://www.omdbapi.com/?apikey=${process.env.OMDB_API_KEY}&s=`;
const theMovieDbUrl = `https://api.themoviedb.org/3/search/movie?api_key=${process.env.TMDB_API_KEY}&query=`;
const theMovieDbPosterUrl = 'http://image.tmdb.org/t/p/w185';
const quoteUrl = 'https://andruxnet-random-famous-quotes.p.mashape.com/?cat=movies&count=1"';
const regex = /[^a-zA-Z0-9]+/g;
const QUOTE_API_KEY = process.env.QUOTE_API_KEY;
const trophyHunterId = 8;
const loginTrophyId = 2;
const lightningTrophyId = 4;
const launchPadTrophyId = 6;
const movieNightTrophyId = 5;
const likeTrophyId = 1;
const dislikeTrophyId = 3;
const seenTrophyId = 7;

const genreTagMap = { Action: 17, Horror: 113, Comedy: 50, Drama: 2 };
const genreNameTrophyMap = { Horror: 9, Comedy: 10, Drama: 11, Action: 12 };

const getYouTubeUrl = (title) => {
  const titleForUrl = title.replace(regex, '+');
  console.log('Url is: ', titleForUrl);
  return `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${titleForUrl}+movie+trailer&key=${process.env.YOUTUBE_API_KEY}`;
};
// HARD CODED REQUESTS
module.exports.checkSession = (req, res, next) => {
  if (req.sessionID) {
    db.session.findOne({
      where: { sid: req.sessionID },
      include: [{ model: db.users, as: 'user' }]
    })
    .then((sessionSave) => {
      if (sessionSave) {
        if (sessionSave.userId) {
          return res.send({ success: true, message: 'authentication succeeded', profile: sessionSave.User });
        }
        return res.send({ success: false, message: 'session exists but userId is not assigned', profile: null });
      }
      return res.send({ success: false, message: 'no session found', profile: null });
    });
  } else {
    next();
  }
};

const trophyHunter = userAndTrophy =>
  db.userTrophies.findOne({ where: {
    user_Id: userAndTrophy.user.id,
    trophy_Id: trophyHunterId
  },
    include: [{ model: db.trophies, as: 'trophy' }]
  })
    .then(hunter => hunter.update({ trophyCount: hunter.trophyCount + userAndTrophy.trophy.length }))
    .then(hunter => {
      const { targetNums } = hunter.trophy;
      const { trophyCount } = hunter;
      // Check to see if trophyCount is now either 15 or 32
      for (let i = 0; i < targetNums.length; i += 1) {
        if (trophyCount === targetNums[i]) {
          // trophyCount is 15 or 32
          // create new hasTrophies string
          const newArray =
            hunter.dataValues.hasTrophies
              .split(';')
              .map((curr, ind) => {
                if (ind === i) {
                  return 1;
                }
                return curr;
              });
          // Update hasTrophies and trophyCount
          return hunter.update({
            hasTrophies: newArray,
            trophyCount: hunter.trophyCount + 1
          })
            .then(() => {
              const trophyName = hunter.trophy.trophyNames[i];
              userAndTrophy.trophy.push(trophyName);
              return userAndTrophy;
            });
        }
      }
      // If trophyCount is not 15 or 32, just return the input object
      return userAndTrophy;
    });

module.exports.getTwoMovies = (req, res) => {
  // At first, randomly select two movies from DB
  let firstMovieId = null;
  let secondMovieId = null;

  // Movie IDs from table MUST remain sequential
  // in the form this is currently coded
  db.movies.count()
    .then((maxMovieCount) => {
      firstMovieId = Math.ceil(Math.random() * maxMovieCount);
      do {
        secondMovieId = Math.ceil(Math.random() * maxMovieCount);
      } while (firstMovieId === secondMovieId);
      return [firstMovieId, secondMovieId];
    })
    .then(idArray =>
      idArray.map(id =>
        new Promise((resolve, reject) =>
          db.movies.find({ where: { id } })
            .then(foundMovie => resolve(foundMovie))
            .catch(error => reject(error))
        )
      )
    )
    .then(dbPromises => Promise.all(dbPromises))
    .then(resultsArray => res.status(200).send(resultsArray))
    .catch(error => res.status(500).send(error));
};

// Populates Tags Model and MovieTags Model
module.exports.populateTags = (req, res) => {
  db.movies.findAll({})
    .then(movieArray =>
      movieArray.map((movie) => {
        const acc = [];
        acc.push(...movie.dataValues.genre.split(', ').map(item => [item, 'genre']));
        acc.push(...movie.dataValues.director.split(', ').map(item => [item, 'director']));
        acc.push(...movie.dataValues.actors.split(', ').splice(3).map(item => [item, 'actor']));
        return acc;
      }).map((movieTagsArray, index) =>
        movieTagsArray.map(movieTagArray =>
          new Promise((resolve, reject) =>
            db.tags.findOrCreate({ where: {
              tagName: movieTagArray[0],
              tagType: movieTagArray[1]
            } })
            .then((foundTag) => {
              db.movieTags.findOrCreate({ where: {
                movie_Id: movieArray[index].id,
                tag_Id: foundTag[0].dataValues.id
              } })
              .then(movieTag => resolve(movieTag));
            })
            .catch(error => reject(error))
          )
        )
      )
    )
    .then(myPromises =>
      myPromises.map(promiseArray =>
        Promise.all(promiseArray)
      ))
    .then(resultsArray => res.status(200).send(resultsArray))
    .catch(error => res.status(500).send(error));
};

const buildOrIncrementMovieTags = (currentMovie, userId) =>
  db.movieTags.findAll({ where: { movie_Id: currentMovie.id } })
    .then((movieTags) => {
      return movieTags.map(movieTag =>
        new Promise((resolve, reject) => {
          if (movieTag.dataValues.movie_Id === currentMovie.id) {
            return db.userTags.find({ where: {
              tag_Id: movieTag.dataValues.tag_Id,
              user_Id: userId
            } })
            .then((userTag) => {
              const picksIncrement = currentMovie.selected ? 1 : 0;
              if (userTag === null) {
                return db.userTags.create({
                  viewsCount: 1,
                  picksCount: picksIncrement,
                  tag_Id: movieTag.dataValues.tag_Id,
                  user_Id: userId
                });
              }
              return userTag.increment('viewsCount', { by: 1 })
                .then(() => {
                  if (currentMovie.selected) {
                    return userTag.increment('picksCount', { by: picksIncrement });
                  }
                });
            })
            .then(() => resolve())
            .catch((err) => {
              console.log('Error in userTag if/else promise: ', err);
              reject();
            });
          }
        })
      );
    })
    .then(clickedMovieTagPromises => Promise.all(clickedMovieTagPromises))
    .catch(error => console.log('Error in buildOrIncrementMovieTags, ', error));

const checkGenreTrophies = (user, clickedMovie) => {
  const selectedGenres = clickedMovie.genre.split(', ');

  // Filter to trophy-fied genre IDs
  const validTrophyGenres = selectedGenres.filter(genre => genreNameTrophyMap[genre]);
  const genreTagIds = validTrophyGenres.map(name => ({ tag_Id: genreTagMap[name] }));
  const trophyIds = validTrophyGenres.map(genre => ({ trophy_Id: genreNameTrophyMap[genre] }));
  const resultObj = {
    user,
    trophy: []
  };

  let userTrophies;
  return db.userTrophies.findAll({ where: {
    user_Id: user.id, $or: [...trophyIds] },
    include: [{ model: db.trophies, as: 'trophy' }]
  })
    .then((matchedUserTrophies) => {
      console.log('Found matched user trophies: ', matchedUserTrophies);
      userTrophies = matchedUserTrophies;
    })
    .then(() => {
      return db.userTags.findAll({ where:
        { user_Id: user.id, $or: [...genreTagIds] },
        include: [{ model: db.tags, as: 'tag' }]
      });
    })
    .then(userTags => userTags.map((userTag) => {
      const trophyId = genreNameTrophyMap[userTag.tag.tagName];
      const userTrophy = userTrophies.find(t => t.trophy_Id === trophyId);
      return {
        genre: userTag.tag.tagName,
        userTrophyId: userTrophy.id,
        picksCount: userTag.picksCount,
        hasTrophies: userTrophy.hasTrophies,
        trophyCount: userTrophy.trophyCount,
        trophyNames: userTrophy.trophy.trophyNames,
        targetNums: userTrophy.trophy.targetNums
      };
    }))
    .then((userTrophiesAndPicks) => {

      // See if any trophies have been earned
      // i.e. if picksCount === a targetNum
      const trophies = userTrophiesAndPicks.reduce((acc, obj) => {
        const { picksCount, targetNums } = obj;
        const trophyIndex = targetNums.indexOf(picksCount);
        if (trophyIndex > -1) {
          obj.trophyIndex = trophyIndex;
          acc.push(obj);
          resultObj.trophy.push(obj.trophyNames[trophyIndex]); // Side effect
        }
        return acc;
      }, []);

      if (!trophies.length) {
        return;
      }

      const proms = trophies.map(obj =>
        new Promise((resolve) => {
          return db.userTrophies.findOne({ where: {
            id: obj.userTrophyId
          }})
          .then((userTrophy) => {
            const nextTrophyIndex = userTrophy.hasTrophies.indexOf(0);
            const newHasTrophyArray = userTrophy.hasTrophies.map((char, index) => {
              if (index === nextTrophyIndex) {
                return 1;
              }
              return char;
            });
            return userTrophy.update({
              hasTrophies: newHasTrophyArray,
              trophyCount: obj.picksCount
            });
          })
          .then(resolve);
        })
      );

      return Promise.all(proms);
    })
    .then(() => {
      return trophyHunter(resultObj);
    })
    .then((userObj) => {
      return userObj;
    });
};

const checkLightningTrophy = (userAndTrophyObj) => {
  const user_Id = userAndTrophyObj.user.id;
  const trophy_Id = lightningTrophyId;

  return db.userTrophies.findOne({
    where: { trophy_Id, user_Id },
    include: { model: db.trophies, as: 'trophy' }
  })
    .then(userTrophy => userTrophy.update({
      trophyCount: userTrophy.trophyCount + 1
    }))
    .then((userTrophy) => {
      const { trophyCount } = userTrophy;
      const { targetNums, trophyNames } = userTrophy.trophy;
      const trophyIndex = targetNums.indexOf(trophyCount);
      if (trophyIndex > -1) {
        const trophyName = trophyNames[trophyIndex];
        userAndTrophyObj.trophy.push(trophyName); // Side effect
        const newHasTrophyArray =
          userTrophy.hasTrophies
          .map((char, index) => (index === trophyIndex) ? 1 : char);
        return userTrophy.update({ hasTrophies: newHasTrophyArray });
      }
    })
    .then(() => trophyHunter(userAndTrophyObj));
};

module.exports.handleLightningSelection = (req, res) => {
  if (!req.user) {
    return res.sendStatus(200);
  }
  const { clickedMovie, discardedMovie } = req.body;
  buildOrIncrementMovieTags(clickedMovie, req.user.id)
  .then(buildOrIncrementMovieTags(discardedMovie, req.user.id))
  .then(() => checkGenreTrophies(req.user, clickedMovie))
  .then(userAndTrophyObj => checkLightningTrophy(userAndTrophyObj))
  .then((userAndTrophyObj) => {
    res.status(200).send(userAndTrophyObj);
  })
  .catch(error => res.status(500).send(error));
};

module.exports.findDuplicateTagIDs = (req, res) => {
  db.userTags.findAll({ where: { user_Id: 2 } })
    .then((matchedTags) => {
      const seen = {};
      const tags = [];
      matchedTags.forEach((tag) => {
        if (seen[tag.tag_Id]) {
          tags.push(tag);
        }
        seen[tag.tag_Id] = true;
      });
      res.send(tags);
    });
};

const getTopResults = (req, res) => {
  db.userMovies.findAll({})
    .then((userMovies) => {
      const topMovies = userMovies.reduce((memo, obj) => {
        const match = memo.find(item => item.movie_Id === obj.movie_Id);
        if (match) {
          match.likes += obj.liked;
        } else {
          memo.push({ movie_Id: obj.movie_Id, likes: obj.liked });
        }
        return memo;
      }, [])
      .sort((a, b) => b.likes - a.likes)
      .slice(0, 6)
      .map(obj => ({ id: obj.movie_Id }));

      db.movies.findAll({ where: {
        $or: [...topMovies]
      } })
        .then(movies => res.send(movies))
        .catch(err => res.status(500).send(err));
    });
};

module.exports.getTopResults = getTopResults;

// Brain 2
module.exports.getSmartUserResults = (req, res) => {
  const params = {
    knownTagsPercentage: 85,
    likeValue: 3,
    dislikeValue: -2,
    numRandomTagsPicked: 3,
    numberOfResults: 6
  };
  db.userTags.count({
    where: { user_Id: req.user.id }
  })
  .then((count) => {
    if (count === 0) { return getTopResults(req, res); }
    db.movies.findAll({})
    .then((allMovies) => {
      if (!req.user.reView) {
        return db.userMovies.findAll({ where: { user_Id: req.user.id, seen: true } })
        .then(seenMovies =>
          allMovies.filter(curr =>
            seenMovies.findIndex(item =>
              item.dataValues.movie_Id === curr.dataValues.id) === -1)
        )
        .catch(err => res.send(err));
      }
      return allMovies;
    })
    .then((newAllMovies) => {
      db.tags.findAll({})
      .then((allTags) => {
        db.userTags.findAll({
          where: { user_Id: req.user.id },
          include: [{ model: db.tags, as: 'tag' }] })
        .then((myUserTags) => {
          const finalTagWeights = myUserTags.map((curr) => {
            const data = curr.dataValues;
            return {
              tagWeight: data.picksCount +
                (params.likeValue * data.likesCount) + (params.dislikeValue * data.dislikesCount),
              user_Id: data.user_Id,
              id: data.tag_Id,
              tagName: data.tag.dataValues.tagName,
              tagType: data.tag.dataValues.tagType
            };
          }).filter(item => item.tagWeight > 0);
          const unknownTags = allTags.filter(curr =>
            finalTagWeights.findIndex(item =>
              item.tag_Id === curr.dataValues.id) === -1);
          const totalWeight = finalTagWeights.reduce((acc, curr) =>
            acc + curr.tagWeight, 0);
          const knownSpectrum = finalTagWeights.reduce((acc, curr, index, array) => {
            if (index - 1 < 0) {
              acc.push([(curr.tagWeight / totalWeight)
                * (params.knownTagsPercentage / 100), curr]);
            } else if (index === array.length - 1) {
              acc.push([(params.knownTagsPercentage / 100), curr]);
            } else {
              acc.push([((curr.tagWeight / totalWeight) * (params.knownTagsPercentage / 100))
                + acc[index - 1][0], curr]);
            }
            return acc;
          }, []);
          const unknownTagWeight = ((100 - params.knownTagsPercentage) / 100) / unknownTags.length;
          console.log('Working');
          const randomTagArray = [];
          for (let i = 0; i < params.numberOfResults; i += 1) {
            const tempArray = [];
            for (let j = 0; j < params.numRandomTagsPicked; j += 1) {
              const randomNum = Math.random();
              if (randomNum <= params.knownTagsPercentage / 100) {
                for (let l = 0; l < knownSpectrum.length; l += 1) {
                  if (knownSpectrum[l][0] > randomNum) {
                    tempArray.push(knownSpectrum[l === 0 ? l : l - 1][1]);
                    l = Infinity;
                  }
                }
              } else {
                const numerator = (randomNum - ((params.knownTagsPercentage) / 100));
                const ind = parseInt(numerator / unknownTagWeight, 10);
                tempArray.push(unknownTags[ind].dataValues);
              }
            }
            randomTagArray.push(tempArray);
          }
          console.log('Chosen Tags :', randomTagArray);
          const movieSelection = randomTagArray.map((item) => {
            let filteredMovies = newAllMovies;
            for (let i = 0; i < params.numRandomTagsPicked; i += 1) {
              if (item[i].tagType === 'actor') {
                const newFilteredMovies = filteredMovies.filter(movie =>
                  movie.dataValues.actors.split(', ').includes(item[i].tagName)
                );
                if (newFilteredMovies > 0) filteredMovies = newFilteredMovies;
              } else if (item[i].tagType === 'director') {
                const newFilteredMovies = filteredMovies.filter(movie =>
                  movie.dataValues.director.split(', ').includes(item[i].tagName)
                );
                if (newFilteredMovies > 0) filteredMovies = newFilteredMovies;
              } else {
                const newFilteredMovies = filteredMovies.filter(movie =>
                  movie.dataValues.genre.split(', ').includes(item[i].tagName)
                );
                if (newFilteredMovies > 0) filteredMovies = newFilteredMovies;
              }
            }
            return filteredMovies[Math.floor(Math.random() * filteredMovies.length)].dataValues;
          });
          console.log('Movie Selection :', movieSelection);
          return movieSelection;
        })
        .then((movies) => {
          const moviePromises = movies.map(movie =>
            new Promise((resolve, reject) => {
              db.userMovies.findOne({ where: {
                movie_Id: movie.id,
                user_Id: req.user.id
              } })
              .then((userMovie) => {
                const hydramovie = Object.assign({}, movie);
                if (userMovie) {
                  hydramovie.liked = userMovie.liked;
                } else {
                  hydramovie.liked = 0;
                }
                return hydramovie;
              })
              .then(hydratedMovie => resolve(hydratedMovie))
              .catch(error => reject(error));
            })
          );
          return Promise.all(moviePromises);
        })
        .then(hydratedMovies => res.send(hydratedMovies))
        .catch(err => res.send(err));
      })
      .catch(err => res.send(err));
    })
    .catch(err => res.send(err));
  });
};


/// Movie night only!!!!

// Placeholder logic
module.exports.getRandomResults = (req, res) => {
  // We don't yet need the user info in the next line
  // const { user } = req.session.passport;
  // console.log('USER IS: ', user);
  if (!res.userTrophyObj) res.userTrophyObj = { user: req.user, trophy: [] };
  // Placeholder logic, selects five random movies.
  db.movies.count()
    .then((maxMovieCount) => {
      const moviesToGrab = [];

      // Create objects for the Movie.findAll $or operator,
      // which takes objects like this { dbColumn: columnValue }
      for (let i = 0; i < 5; i += 1) {
        let randomMovieId = Math.floor(Math.random() * (maxMovieCount + 1));

        // Need to handle if 0 bc no id 0 in table.
        // Also the linter didn't like the simple way I wrote this at first
        randomMovieId = randomMovieId === 0 ? 1 : randomMovieId;
        moviesToGrab.push({
          id: randomMovieId
        });
      }
      console.log('Calling Movie.findAll with: ', ...moviesToGrab);
      db.movies.findAll({
        where: {
          $or: [...moviesToGrab]
        }
      })
      .then((movies) => {
        const moviePromises = movies.map(movie =>
          new Promise((resolve, reject) => {
            db.userMovies.findOne({ where: {
              movie_Id: movie.dataValues.id,
              user_Id: req.user.id
            } })
            .then((userMovie) => {
              const hydramovie = Object.assign({}, movie);
              if (userMovie) {
                hydramovie.dataValues.liked = userMovie.liked;
              } else {
                hydramovie.dataValues.liked = 0;
              }
              return hydramovie;
            })
            .then(hydratedMovie => resolve(hydratedMovie.dataValues))
            .catch(error => reject(error));
          })
        );
        return Promise.all(moviePromises);
      })
      .then(hydratedMovies => res.send({
        movies: hydratedMovies, userTrophyObj: res.userTrophyObj
      }))
      .catch(err => res.send(err));
    });
};

module.exports.getQuote = (req, res) => {
  axios(quoteUrl, {
    method: 'GET',
    headers: { 'X-Mashape-Key': QUOTE_API_KEY }
  })
    .then(results => res.send(results.data))
    .catch(err => res.status(500).send(err));
};

module.exports.getTrailer = (req, res) => {
  const url = getYouTubeUrl(req.body.movie.title + ' ' + req.body.movie.year);
  axios.get(url)
    .then(results => res.send(results.data.items[0]))
    .catch(err => res.sendStatus(404));
};

module.exports.getSearchAutoComplete = (req, res) => {
  const { query } = req.body;
  const url = theMovieDbUrl + query;
  axios.get(url)
    .then(results => res.send(results.data.results))
    .catch((err) => {
      console.log('Error in autocomplete: ', err);
      res.status(500).send(err);
    });
};

const handleLikeOrDislike = (movie, userId, isLike) =>
  db.userMovies.findOrCreate({ where: {
    user_Id: userId,
    movie_Id: movie.id
  } })
    .then((findOrCreateObj) => {
      const userMovie = findOrCreateObj[0];
      const likedValue = isLike ? 1 : -1;
      return userMovie.update({ liked: likedValue, seen: true })
        .then(() => userMovie);
    })
    .then(() =>
      db.movieTags.findAll({ where: {
        movie_Id: movie.id
      } })
    )
    .then(movieTags =>
      movieTags.map(movieTag =>
        new Promise((resolve, reject) => {
          db.userTags.findOne({ where: {
            tag_Id: movieTag.dataValues.tag_Id,
            user_Id: userId
          } })
          .then((userTag) => {
            if (!userTag && isLike) {
              return db.userTags.create({
                likesCount: 1,
                tag_Id: movieTag.dataValues.tag_Id,
                user_Id: userId
              });
            }
            if (!userTag && !isLike) {
              return db.userTags.create({
                dislikesCount: 1,
                tag_Id: movieTag.dataValues.tag_Id,
                user_Id: userId
              });
            }
            if (userTag && isLike) {
              return userTag.increment('likesCount', { by: 1 });
            }
            if (userTag && !isLike) {
              return userTag.increment('dislikesCount', { by: 1 });
            }
          })
          .then(results => resolve(results))
          .catch(error => reject(error));
        })
      )
    )
    .then(movieTagPromises => Promise.all(movieTagPromises));

const getDetailedMovieInformation = movieUrl =>
  axios.post(movieUrl)
    .then((results) => {
      const movie = Object.assign({}, results.data, {
        Ratings: JSON.stringify(results.data.Ratings)
      });
      return db.movies.findOrCreate({ where: {
        title: movie.Title,
        year: movie.Year,
        rated: movie.Rated,
        genre: movie.Genre,
        plot: movie.Plot,
        ratings: movie.Ratings,
        poster: movie.Poster,
        director: movie.Director,
        writer: movie.Writer,
        actors: movie.Actors
      } });
    })
    .then((findOrCreateObj) => {
      const movieFromDb = findOrCreateObj[0];
      return movieFromDb;
    });

module.exports.handleLikeOrDislikeFromSearch = (req, res) => {
  console.log(req.body.movie);
  const movieUrl = omdbIMDBSearchUrl + req.body.movie.imdbID;
  getDetailedMovieInformation(movieUrl)
    .then(movieFromDb => handleLikeOrDislike(movieFromDb, req.user.id, req.body.isLike))
    .then(() => {
      if (req.body.isLike) {
        return this.checkTrophy({ user: req.user, trophy: [] }, likeTrophyId, false);
      }
      return this.checkTrophy({ user: req.user, trophy: [] }, dislikeTrophyId, false);
    })
    .then(userTrophyObj => this.checkTrophy(userTrophyObj, seenTrophyId, true))
    .then(userTrophyObj => res.send(userTrophyObj))
    .catch((err) => {
      console.log('Error liking search movie: ', err);
      res.status(500).send(err);
    });
};

module.exports.handleLikeOrDislikeFromResults = (req, res) => {
  const { movie } = req.body;
  db.movies.findOne({ where: {
    id: movie.id
  } })
  .then(matchedMovie => handleLikeOrDislike(matchedMovie, req.user.id, req.body.isLike))
  .then(() => {
    if (req.body.isLike) {
      return this.checkTrophy({ user: req.user, trophy: [] }, likeTrophyId, false);
    }
    return this.checkTrophy({ user: req.user, trophy: [] }, dislikeTrophyId, false);
  })
  .then(userTrophyObj => this.checkTrophy(userTrophyObj, seenTrophyId, true))
  .then(userTrophyObj => res.send(userTrophyObj))
  .catch((err) => {
    console.log('Error liking results movie: ', err);
    res.status(500).send(err);
  });
};

module.exports.handleLikeFromScraper = (movie, userId) => {
  db.movies.findOne({ where: {
    id: movie.id
  } })
  .then(matchedMovie => handleLikeOrDislike(matchedMovie, userId, true))
  .catch((err) => {
    console.log('Error liking scraped movie: ', err);
  });
};

const setMovieFromDbAsSeen = (movieId, req, res) =>
  db.userMovies.findOrCreate({ where: {
    user_Id: req.user.id,
    movie_Id: movieId
  } })
    .then((findOrCreateObj) => {
      const userMovie = findOrCreateObj[0];
      return userMovie.update({ seen: true });
    })
    .then(() => this.checkTrophy({ user: req.user, trophy: [] }, seenTrophyId, true))
    .then(userTrophyObj => res.send(userTrophyObj))
    .catch((err) => {
      console.log('Error marking movie seen: ', err);
      res.sendStatus(500);
    });

module.exports.setResultsMovieAsSeen = (req, res) => {
  const { movie } = req.body;
  db.movies.findOne({ where: {
    id: movie.id
  } })
  .then(movieFromDb => setMovieFromDbAsSeen(movieFromDb.id, req, res));
};

module.exports.setSearchedMovieAsSeen = (req, res) => {
  console.log(req.body.movie);
  const movieUrl = omdbIMDBSearchUrl + req.body.movie.imdbID;
  getDetailedMovieInformation(movieUrl)
    .then(movieFromDb => setMovieFromDbAsSeen(movieFromDb.id, req, res));
};

// Testing. Not currently used.
module.exports.handleMovieSearchTMDB = (req, res) => {
  let { movieName } = req.body;
  movieName = movieName.replace(regex, '+');
  const searchUrl = theMovieDbUrl + movieName;
  console.log(searchUrl);
  axios.post(searchUrl)
    .then((results) => {
      // Shape the data from The Movie Database into
      // what OMDB API uses
      const movies = results.data.results.map((movie) => {
        const posterUrl =
          movie.poster_path ? theMovieDbPosterUrl + movie.poster_path : '';

        return {
          title: movie.title,
          plot: movie.overview,
          year: movie.release_date.slice(0, 4),
          poster: posterUrl
        };
      });
      res.send(movies);
    })
    .catch(err => res.status(500).send(err));
};

const hydrateLikesAndDislikes = (movies, userId) => {
  const proms = db.userMovies.findAll({
    where: { user_Id: userId },
    include: [{ model: db.movies, as: 'movie' }]
  })
    .then(userMovieRefs =>
      movies.map((movie) => {
        const match = userMovieRefs.find(ref => ref.movie.title === movie.title);
        if (match) {
          return Object.assign({}, movie, { liked: match.liked });
        }
        return movie;
      })
    );
  return proms;
};

module.exports.handleMovieSearchOMDB = (req, res) => {
  let { movieName } = req.body;
  movieName = movieName.replace(regex, '+');
  if (movieName[movieName.length - 1] === '+') {
    movieName = movieName.substring(0, movieName.length - 1);
  }
  const searchUrl = omdbSearchUrl + movieName;
  console.log('Searching for movies: ', searchUrl);
  axios.post(searchUrl)
    .then((results) => {
      console.log('Received results: ', results.data);
      const movieObjects = results.data.Search.map(movie => (
        {
          title: movie.Title,
          year: movie.Year,
          poster: movie.Poster,
          imdbID: movie.imdbID,
          liked: 0
        }
      ));
      return movieObjects;
    })
    .then((movies) => {
      if (req.user) {
        console.log('Trying to hydrate');
        return hydrateLikesAndDislikes(movies, req.user.id);
      }
      return movies;
    })
    .then(hydratedMovies => res.send(hydratedMovies))
    .catch(err => res.status(404).send(err));
};

const reshapeMovieData = movie =>
  Object.assign({}, {
    title: movie.Title,
    poster: movie.Poster,
    plot: movie.Plot,
    rated: movie.Rated,
    year: movie.Year,
    genre: movie.Genre,
    director: movie.Director,
    writer: movie.Writer,
    actors: movie.Actors,
    metascore: movie.Metascore
  });

module.exports.getLargeTileData = (req, res) => {
  console.log('getLargeTileData received: ', req.body.movie);
  const movieUrl = omdbIMDBSearchUrl + req.body.movie.imdbID;
  axios.post(movieUrl)
    .then((results) => {
      console.log('getLargeTileData received: ', results.data);
      const movie = reshapeMovieData(results.data);
      res.send(movie);
    })
    .catch(err => console.log('Error getting movie: ', err));
};

module.exports.verifyUserEmail = (req, res) => {
  const { email } = req.body;
  db.users.findOne({ where: { email } })
    .then((user) => {
      const responseObj = user ? { success: true, user } : { success: false };
      res.send(responseObj);
    })
    .catch((error) => {
      console.log(`Error finding user by email ${req.body.email}:`, error);
      res.sendStatus(500);
    });
};

module.exports.getMovieNightResults = (req, res) => {
  this.checkTrophy({ user: req.user, trophy: [] }, movieNightTrophyId, true)
  .then((userTrophyObj) => {
    res.userTrophyObj = userTrophyObj;
    this.getRandomResults(req, res);
  });
};

module.exports.getTagsforLaunchPad = (req, res) => {
  db.userTags.findAll({ include: [{ model: db.tags, as: 'tag' }] })
  .then((allUserTags) => {
    const userTagWeights = allUserTags.reduce((acc, curr) => {
      if (acc.hasOwnProperty(curr.dataValues.tag_Id)) {
        acc[curr.dataValues.tag_Id].count += curr.dataValues.picksCount
          + (curr.dataValues.likesCount - curr.dataValues.dislikesCount);
      } else {
        acc[curr.dataValues.tag_Id] = {
          count: curr.dataValues.picksCount
            + (curr.dataValues.likesCount - curr.dataValues.dislikesCount),
          id: curr.dataValues.tag_Id,
          tagName: curr.dataValues.tag.tagName,
          tagType: curr.dataValues.tag.tagType
        };
      }
      return acc;
    }, {});
    const tagObject = { genre: [], actor: [], director: [] };
    Object.keys(userTagWeights).forEach((curr) => {
      tagObject[userTagWeights[curr].tagType].push(userTagWeights[curr]);
    });
    const sortedTagObject = {};
    Object.keys(tagObject).forEach((item) => {
      sortedTagObject[item] = tagObject[item].sort((a, b) => b.count - a.count);
      if (sortedTagObject[item].length > 27) {
        sortedTagObject[item] = sortedTagObject[item].slice(0, 27);
      }
    });
    return sortedTagObject;
  })
  .then((sortedTagObject) => {
    const Promises = Object.keys(sortedTagObject).map((item) => {
      if (sortedTagObject[item].length < 27) {
        const neededNum = 27 - sortedTagObject[item].length;
        return new Promise((resolve, reject) => {
          db.tags.findAll({
            limit: neededNum,
            where: {
              tagType: item,
              id: {
                $notIn: sortedTagObject[item].map(tag => tag.tag_Id)
              }
            }
          })
          .then((tagsToAdd) => {
            tagsToAdd.forEach((tag) => {
              sortedTagObject[item].push(tag.dataValues);
            });
            resolve();
          })
          .catch(err => reject(err));
        });
      }
      return new Promise(resolve => resolve());
    });
    return Promise.all(Promises)
    .then(() => sortedTagObject);
  })
  .then(sortedTagObject => res.send(sortedTagObject))
  .catch(err => res.status(500).send('Error finding tags: ', err));
};

module.exports.postLaunchPadTags = (req, res) => {
  const params = {
    numToIncrement: 5
  };
  const updatePromises = req.body.map(id =>
    new Promise((resolve, reject) => {
      db.userTags.findOne({ where: { tag_Id: id, user_Id: req.user.id } })
      .then((userTag) => {
        if (userTag === null) {
          return db.userTags.create({
            viewsCount: params.numToIncrement,
            picksCount: params.numToIncrement,
            tag_Id: id,
            user_Id: req.user.id
          });
        }
        return userTag.increment(['viewsCount', 'picksCount'], { by: params.numToIncrement });
      })
      .then(() => resolve())
      .catch(err => reject(err));
    })
  );
  Promise.all(updatePromises)
  .then(() =>
    this.checkTrophy({ user: req.user, trophy: [] }, launchPadTrophyId, true)
  )
  .then((userTrophyObj) => {
    console.log('User Trophy Object :', userTrophyObj);
    res.send(userTrophyObj);
  })
  .catch(error => res.send(error));
};

module.exports.getUserInfo = (req, res) => {
  const user_id = req.body.id;
  const responseObj = {};

  db.users.findOne({
    where: {
      id: user_id
    }
  })
  .then((userResults) => {
    responseObj.userInfo = userResults;
  })
  .then(() =>
    db.userMovies.findAll({
      where: {
        user_Id: user_id
      },
      include: [{ model: db.movies, as: 'movie' }]
    })
    .then((userMoviesResults) => {
      responseObj.userMoviesInfo = userMoviesResults;
    })
  )
  .then(() =>
    db.userTags.findAll({
      where: {
        user_Id: user_id
      },
      include: [{ model: db.tags, as: 'tag' }]
  }))
  .then((userTagsResults) => {
    responseObj.userTagsInfo = userTagsResults;
    const shapedResults = userTagsResults.map(tag => ({
      name: tag.tag.tagName,
      type: tag.tag.tagType,
      dislikesCount: tag.dislikesCount,
      likesCount: tag.likesCount,
      picksCount: tag.picksCount,
      viewsCount: tag.viewsCount,
      id: tag.id
    }));
    responseObj.shapedTagInfo = shapedResults;
  })
  .then(() => db.userTrophies.findAll({
    where: { user_Id: user_id },
    include: [{ model: db.trophies, as: 'trophy' }]
  }))
  .then((userTrophies) => {
    // Get names of all obtained trophies
    const trophies = userTrophies.reduce((acc, userTrophy) => {
      acc = acc.concat(userTrophy.hasTrophies.reduce((arr, item, ind) => {
        if (item) {
          acc.push(userTrophy.trophy.trophyNames[ind]);
        }
        return arr;
      }, []));
      return acc;
    }, []);
    responseObj.earnedTrophies = trophies;
  })
  .then(() => {
    res.send(responseObj);
  })
  .catch((error) => {
    console.log('Error getting info', error);
    res.sendStatus(500);
  })
};

module.exports.getTableData = (req, res) => {
  const responseObj = {};

  db.tags.findAll({})
  .then((tagsTableResults) => {
    responseObj.tagsTableData = tagsTableResults;
  })
  .then(() => {
    res.send(responseObj);
  })
  .catch((error) => {
    res.sendStatus(500);
  });
};

module.exports.updateUserSettings = (req, res) => {
  const { id, reView } = req.body;

  db.users.update({
    reView
  }, {
    where: { id }
  })
  .then(() => {
    console.log('Successfully updated user info (id, reView)', id, reView);
    res.sendStatus(200);
  })
  .catch((error) => {
    console.log('Error updating user info', error);
    res.sendStatus(500);
  });
};

module.exports.setUserWatchedMovie = (req, res) => {
  const { watchedMovieId, watchedMovieTitle, userId } = req.body;
  db.users.update({ watchedMovieId, watchedMovieTitle }, { where: { id: userId } })
    .then(() => res.sendStatus(200))
    .catch(err => res.status(500).send(err));
};

module.exports.setUserWatchedMovieToNull = (user) => {
  db.users.update({ watchedMovieId: null, watchedMovieTitle: null }, { where: { id: user.id } });
};

module.exports.createTrophiesAtFirstLogin = (user) => {
  return db.trophies.findAll({})
    .then((trophiesAll) => {
      const trophyPromises = trophiesAll.map(trophy =>
        new Promise((resolve, reject) => {
          return db.userTrophies.create({
            hasTrophies: trophy.targetNums.reduce((acc) => {
              acc.push(0);
              return acc;
            }, []),
            trophyCount: 0,
            trophy_Id: trophy.id,
            user_Id: user.id
          })
          .then(userTrophy => resolve(userTrophy))
          .catch(err => reject(err));
        })
      );
      return Promise.all(trophyPromises);
    })
    .then(() => {
      return user;
    })
    .catch(err => res.send(err));
};

module.exports.checkTrophy = (userTrophyObj, trophyId, huntTrophie) =>
  db.userTrophies.increment('trophyCount', { by: 1, where: { user_Id: userTrophyObj.user.id, trophy_Id: trophyId } })
    .then(() =>
      db.userTrophies.findOne({
        where: { user_Id: userTrophyObj.user.id, trophy_Id: trophyId },
        include: [{ model: db.trophies, as: 'trophy' }]
      })
      .then((userTrophy) => {
        const index = userTrophy.hasTrophies.indexOf(0);
        if (userTrophy.trophy.targetNums[index] === userTrophy.trophyCount) {
          return db.userTrophies.findOne({
            where: { user_Id: userTrophyObj.user.id, trophy_Id: trophyId }
          })
          .then((trophy) => {
            const newArray = trophy.dataValues.hasTrophies.split(';').map((curr, ind) => {
              if (ind === index) return 1; return curr;
            });
            return db.userTrophies.update({ hasTrophies: newArray },
              { where: { user_Id: userTrophyObj.user.id, trophy_Id: trophyId } })
            .then(() => {
              userTrophyObj.trophy.push(userTrophy.trophy.trophyNames[index]);
              if (huntTrophie) return trophyHunter(userTrophyObj);
              return userTrophyObj;
            })
            .then((userAndTrophyObj) => {
              console.log('userAndTrophyObj is', userAndTrophyObj);
              return userAndTrophyObj;
            });
          })
          .catch(err => console.log('Error checking trophyCount :', err));
        } else {
          if (huntTrophie && userTrophyObj.trophy.length > 0) return trophyHunter(userTrophyObj);
          return userTrophyObj;
        }
      })
      .catch(err => console.log('Error in userTrophy method :', err))
    )
    .catch(err => console.log('Error in userTrophies increment :', err));
