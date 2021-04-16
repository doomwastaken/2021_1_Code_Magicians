import {API} from 'modules/api';
import Store from '../Store';
import {Profile} from 'models/Profile';
import {User} from 'models/User';
import {actionTypes} from 'actions/actions';
import {constants} from 'consts/consts';
import {NotificationModel} from 'models/NotificationModel';
import {HTTPModule} from 'modules/http';

const storeStatuses = constants.store.statuses.userStore;

/**
 * UserStore
 */
class UserStore extends Store {
  /**
   * Constructs new storage for current user
   */
  constructor() {
    super();

    this._user = new User(new Profile());
    this._userLoaded = false;

    this._notifications = [];
    this._socketReady = false;
    this._newNotification = false;
  }

  /**
   * Process event
   * @param {Object} action
   */
  processEvent(action) {
    this._status = storeStatuses.ok;

    switch (action.actionType) {
      case actionTypes.user.login:
        this._login(action.data);
        break;
      case actionTypes.user.logout:
        this._logout();
        break;
      case actionTypes.user.signup:
        this._signup(action.data);
        break;
      case actionTypes.user.deleteProfile:
        this._deleteProfile();
        break;
      case actionTypes.user.editProfile:
        this._editProfile(action.data);
        break;
      case actionTypes.user.changePassword:
        this._changePassword(action.data);
        break;
      case actionTypes.user.changeAvatar:
        this._changeAvatar(action.data);
        break;
      case actionTypes.user.statusProcessed:
        this._status = storeStatuses.ok;
        break;
      case actionTypes.notifications.readNotification:
        this._turnOffNotification(action.data);
        break;
    }
  }

  /**
   * login
   * @param {Object} credentials
   * @private
   */
  _login(credentials) {
    if (this._user.authorized()) {
      return;
    }

    API.loginUser(credentials).then((response) => {
      switch (response.status) {
        case 204:
          this._fetchUserData();
          break;
        case 403:
          this._status = storeStatuses.clientError;
          break;
        case 404:
        case 401:
          this._status = storeStatuses.invalidCredentials;
          break;
        default:
          this._status = storeStatuses.internalError;
      }

      if (response.status !== 204) {
        this._trigger('change');
      }
    });
  }

  /**
   * signup
   * @param {Object} credentials
   * @private
   */
  _signup(credentials) {
    if (this._user.authorized()) {
      this._status = storeStatuses.clientError;
      return;
    }

    API.signupUser(credentials).then((response) => {
      switch (response.status) {
        case 201:
          this._fetchUserData();
          break;
        case 403:
        case 400:
          this._status = storeStatuses.clientError;
          break;
        case 409:
          this._status = storeStatuses.signupConflict;
          break;
        default:
          this._status = storeStatuses.internalError;
      }

      if (response.status !== 201) {
        this._trigger('change');
      }
    });
  }

  /**
   * logout
   * @private
   */
  _logout() {
    if (!this._user.authorized()) {
      this._status = storeStatuses.clientError;
      return;
    }

    API.logoutUser().then((response) => {
      switch (response.status) {
        case 204:
          this._user.onLogout();
          this._status = storeStatuses.unauthorized;
          this._disconnectFromNotifications();
          break;
        case 401:
          this._status = storeStatuses.clientError;
          break;
        default:
          this._status = storeStatuses.internalError;
      }

      this._userLoaded = false;
      this._trigger('change');
    });
  }

  /**
   * Delete profile
   * @private
   */
  _deleteProfile() {
    if (!this._user.authorized()) {
      this._status = storeStatuses.clientError;
      return;
    }

    API.deleteSelfProfile().then((response) => {
      switch (response.status) {
        case 204:
          this._user.onLogout();
          this._status = storeStatuses.unauthorized;
          break;
        case 401:
          this._status = storeStatuses.clientError;
          break;
        default:
          this._status = storeStatuses.internalError;
      }

      this._userLoaded = false;
      this._trigger('change');
    });
  }

  /**
   * Add changes to user profile
   * @param {Object} changes
   * @private
   */
  _editProfile(changes) {
    if (!this._user.authorized()) {
      this._status = storeStatuses.clientError;
      return;
    }

    const profile = this._user.profile;
    changes = Object.fromEntries(
        Object
            .entries(changes)
            .filter((change) => change[1] !== profile[change[0]]),
    );

    if (Object.keys(changes).length === 0) {
      return;
    }

    API.editProfile(changes).then((response) => {
      switch (response.status) {
        case 204:
          this._fetchUserData();
          this._status = storeStatuses.profileEdited;
          break;
        case 409:
          this._status = storeStatuses.editConflict;
          break;
        case 401:
          this._status = storeStatuses.clientError;
          break;
        default:
          this._status = storeStatuses.internalError;
      }

      if (response.status !== 204) {
        this._trigger('change');
      }
    });
  }

  /**
   * Change password
   * @param {Object} data - payload data with password
   * @private
   */
  _changePassword(data) {
    if (!this._user.authorized()) {
      this._status = storeStatuses.clientError;
      return;
    }

    API.changeUserPassword(data.password).then((response) => {
      switch (response.status) {
        case 204:
          this._status = storeStatuses.passwordChanged;
          break;
        case 401:
          this._status = storeStatuses.clientError;
          break;
        default:
          this._status = storeStatuses.internalError;
      }

      this._trigger('change');
    });
  }

  /**
   * Change it
   * @param {FormData} avatarFormData
   * @private
   */
  _changeAvatar(avatarFormData) {
    if (!this._user.authorized()) {
      this._status = storeStatuses.unauthorized;
      return;
    }

    API.changeAvatar(avatarFormData).then((response) => {
      switch (response.status) {
        case 204:
          this._fetchUserData();
          this._status = storeStatuses.avatarUploaded;
          break;
        case 400:
          this._status = storeStatuses.badAvatarImage;
          break;
        case 401:
          this._status = storeStatuses.clientError;
          break;
        default:
          this._status = storeStatuses.internalError;
      }

      if (response.status !== 204) {
        this._trigger('change');
      }
    });
  }

  /**
   * Fetch it
   * @private
   */
  _fetchUserData() {
    this._fetchingUser = true;
    let authorized = false;
    let profile = new Profile();

    API.getSelfProfile().then((response) => {
      switch (response.status) {
        case 200:
          authorized = true;
          profile = new Profile(response.responseBody);
          if (!this._notificationsConnected) {
            this._connectToNotifications();
          }
          break;
        case 401:
          this._user.onLogout();
          this._status = storeStatuses.unauthorized;
          break;
        default:
          this._status = storeStatuses.internalError;
      }

      this._user = new User(profile, authorized);
      this._fetchingUser = false;
      this._userLoaded = true;

      this._trigger('change');
    });
  }


  /**
   * Connect and start getting notifications
   */
  _connectToNotifications() {
    this._ws = this._ws || new WebSocket(constants.network.wsURL);
    this._ws.addEventListener('error', () => {
      this._status = storeStatuses.internalError;
      this._socketReady = false;
    });

    this._ws.addEventListener('close', () => this._socketReady = false);

    this._ws.addEventListener('open', () => {
      this._notificationsConnected = true;
      this._socketReady = true;
      this._status = storeStatuses.ok;

      this._ws.send(JSON.stringify({userID: this._user.profile.ID, CSRFToken: HTTPModule.getCSRFToken()}));
    });

    this._ws.addEventListener('message', (event) => {
      let message = {};
      try {
        message = JSON.parse(event.data);
      } catch (e) {
        this._status = storeStatuses.internalError;
      }

      switch (message.type) {
        case 'all-notifications':
          this._notifications = message['allNotifications'].map((notificationData) => {
            if (!notificationData.isRead) {
              this._newNotification = true;
            }

            return new NotificationModel(notificationData);
          });

          this._trigger('change');
          break;
        case 'notification':
          this._notifications.push(new NotificationModel(message.notification));
          this._newNotification = true;
          this._trigger('change');
          break;
        case 'ping':
          break;
        default:
          this._status = storeStatuses.internalError;
      }
    });
  }

  /**
   * Disconnect
   * @private
   */
  _disconnectFromNotifications() {
    this._notificationsConnected = false;
    this._notifications = null;
    this._ws.close();
  }

  /**
   * Mark notification as read
   * @param {Object} data
   * @private
   */
  _turnOffNotification(data) {
    API.markNotificationRead(data.notificationID).then((response) => {
      switch (response.status) {
        case 204:
        case 409:
          this._notifications.find((n) => n.ID === Number(data.notificationID)).markAsRead();
          this._newNotification = this._notifications.some((n) => !n.isRead);
          break;
        case 401:
        case 403:
        case 404:
        default:
          this._status = storeStatuses.internalError;
      }

      this._trigger('change');
    });
  }

  /**
   * Returns user data
   * @return {User}
   */
  getUser() {
    if (!this._fetchingUser) {
      if (this._userLoaded) {
        return this._user;
      }

      this._fetchUserData();
    }

    return null;
  }

  /**
   * Get them
   * @return {[]}
   */
  getNotifications() {
    return this._notifications;
  }

  /**
   * Has it?
   * @return {Boolean}
   */
  hasNewNotification() {
    return this._newNotification;
  }
}

export const userStore = new UserStore();
