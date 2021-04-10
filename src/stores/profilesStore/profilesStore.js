import Store from '../Store.js';
import {Profile} from '../../models/profile/Profile.js';
import {constants} from '../../consts/consts.js';
import {actionTypes} from '../../actions/actions.js';
import {appDispatcher} from '../../appManagers/dispatcher.js';
import {API} from '../../modules/api.js';
import {userStore} from '../userStore/UserStore.js';
import {pinsStore} from '../pinsStore/pinsStore.js';
import {boardsStore} from '../boardsStore/boardsStore.js';

const storeStatuses = constants.store.statuses.profilesStore;

/**
 * ProfilesStore
 */
class ProfilesStore extends Store {
  /**
   * Makes new profiles store
   */
  constructor() {
    super();

    this._profiles = [];
    this._profile = new Profile({ID: 0});

    this._lastAction = {
      actionType: null,
      data: {},
    };
  }

  /**
   * Process it
   * @param {Object} action
   */
  processEvent(action) {
    if (this._lastAction === action) {
      return;
    }

    switch (action.actionType) {
      case actionTypes.profiles.follow:
        appDispatcher.waitFor([userStore.dispatcherToken]);
        this._follow(action.data, true);
        break;
      case actionTypes.profiles.unfollow:
        appDispatcher.waitFor([userStore.dispatcherToken]);
        this._follow(action.data, false);
        break;
      case actionTypes.common.loadForeignProfile:
        appDispatcher.waitFor([userStore.dispatcherToken]);
        this._fetchProfile(action.data);
        break;
      case actionTypes.common.loadPin:
        appDispatcher.waitFor([pinsStore.dispatcherToken]);
        // need to fetch commentators' profiles and pin's author's profile

        this._fetchProfiles({profileIDs: pinsStore.getComments().map((comment) => comment['userID'])});
        this._fetchProfile({profileID: pinsStore.getPin()['authorID']});
        break;
      case actionTypes.common.loadBoard:
        appDispatcher.waitFor([boardsStore.dispatcherToken]);

        this._fetchProfile({profileID: boardsStore.getBoard()['authorID']});
        break;
      default:
        return;
    }

    this._lastAction = action;
  }

  /**
   * Follow profile
   * @param {Object} data
   * @param {Boolean} follow
   * @private
   */
  _follow(data, follow = true) {
    if (!userStore.getUser().authorized()) {
      this._status = storeStatuses.userUnauthorized;
      return;
    }

    API.followProfile(data.profileID, follow).then((response) => {
      switch (response.status) {
        case 200:
        case 204:
          if (this._profile.ID === data.profileID) {
            if (follow) {
              this._profile.follow();
            } else {
              this._profile.unfollow();
            }
          }

          this._status = follow ? storeStatuses.followed : storeStatuses.unfollowed;
          this._trigger('change');
          break;
        case 401:
          this._status = storeStatuses.userUnauthorized;
          break;
        case 400:
        case 404:
        case 409:
          this._status = storeStatuses.clientSidedError;
          break;
        default:
          this._status = storeStatuses.internalError;
          break;
      }
    });
  }

  /**
   * Fetch profile
   * @param {Object} data
   * @private
   */
  _fetchProfile(data) {
    console.log(this._profile, data.profileID);
    if (this._profile.ID === data.profileID) {
      return;
    }

    API.getProfileByUsernameOrID(data.profileID).then((response) => {
      switch (response.status) {
        case 200:
          this._profile = new Profile(response.responseBody);
          this._trigger('change');
          break;
        case 400:
        case 404:
          this._status = storeStatuses.clientSidedError;
          break;
        default:
          this._status = storeStatuses.internalError;
          break;
      }
    });
  }

  /**
   * Fetch profiles
   * @param {Object} data
   * @private
   */
  _fetchProfiles(data) {
    Promise
        .all(data.profileIDs.map((profileID) => API.getProfileByUsernameOrID(profileID)))
        .then((responses) => {
          responses.forEach((response) => {
            switch (response.status) {
              case 200:
                this._profiles.push(new Profile(response.responseBody));
                break;
              case 400:
              case 404:
                this._status = storeStatuses.clientSidedError;
                break;
              default:
                this._status = storeStatuses.internalError;
                break;
            }
          });

          this._trigger('change');
        });
  }


  /**
   * Get profile
   * @return {Profile}
   */
  getProfile() {
    return this._profile;
  }

  /**
   * Get profiles
   * @return {[]}
   */
  getProfiles() {
    return this._profiles;
  }
}

export const profilesStore = new ProfilesStore();
