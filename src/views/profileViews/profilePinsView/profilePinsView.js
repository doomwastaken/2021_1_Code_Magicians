import { PinsFeed } from 'components/pinsFeed/pinsFeed';
import { pinsStore } from 'stores/pinsStore';
import { userStore } from 'stores/userStore';
import { boardsStore } from 'stores/boardsStore';
import { ProfileView } from '../profileView/profileView';

/**
 * Profile pins view
 */
export class ProfilePinsView extends ProfileView {
  /**
   * Makes profile pins view
   * @param {Object} props
   */
  constructor(props = {}) {
    super(props);
  }

  /**
   * Rendering profile pins html
   * @return {String}
   */
  render() {
    const profileBoards = boardsStore
      .getBoardsByProfileID(this.props.pathArgs.profileID
            || (userStore.getUser() && userStore.getUser().profile.ID));

    const mainBoard = profileBoards && profileBoards.find((board) => board.title === 'Saved pins');

    this._nestedComponents.set('_pinsFeed', new PinsFeed({
      ...this.props,
      pins: pinsStore.getPinsByBoardID(mainBoard && mainBoard.ID),
    }));

    this._profileMainContent = this._nestedComponents.get('_pinsFeed').render();

    return super.render();
  }
}
