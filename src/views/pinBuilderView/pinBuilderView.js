import {View} from '../view.js';
import {actions} from 'actions/actions';
import {toastBox} from 'components/toast/toast';

import PinBuilderViewTemplate from './pinBuilderView.hbs';
import './pinBuilderView.scss';
import {pinsStore} from 'stores/pinsStore/pinsStore';
import {boardsStore} from 'stores/boardsStore/boardsStore';
import {User} from 'models/User';
import {userStore} from 'stores/userStore/UserStore';
import {Profile} from 'models/Profile';
import {constants} from 'consts/consts';
import {appRouter} from 'appManagers/router';
import {descriptionRegexp} from 'consts/regexp';
import {Page} from 'components/page/page';

/**
 * Build pin view
 */
export class PinBuilderView extends View {
  /**
   * Makes new pin building view
   * @param {Object} props
   */
  constructor(props = {}) {
    super(props, document.getElementById('app'));

    const payload = {
      name: '',
      description: '',
      image: '',
      link: '',
    };

    this.tmpl = PinBuilderViewTemplate;
    this.setState(payload);
    this.submit = this.submit.bind(this);

    this.createBoard = this.createBoard.bind(this);

    pinsStore.bind('change', this.refresh);
    boardsStore.bind('change', this.refresh);
  }

  /**
   * Did
   */
  didMount() {
    const user = userStore.getUser() || new User(new Profile(constants.mocks.defaultProfile));
    if (!user.authorized() && userStore.getStatus() === constants.store.statuses.userStore.unauthorized) {
      appRouter.back();
      return;
    }

    if (pinsStore.getStatus() === constants.store.statuses.pinsStore.pinCreated) {
      appRouter.go(`/pin/${pinsStore.getNewPinID()}`);
      actions.pins.statusProcessed();
      return;
    }

    document.querySelector('.pin-builder-form').addEventListener('submit', this.submit);
    document.getElementById('create-board').addEventListener('click', this.createBoard);
    document.getElementById('file-input').addEventListener('change', this.previewImage);
    super.didMount();
  }

  /**
   * Will
   */
  willUnmount() {
    document.querySelector('.pin-builder-form').removeEventListener('submit', this.submit);
    document.getElementById('create-board').removeEventListener('click', this.createBoard);
    document.getElementById('file-input').removeEventListener('change', this.previewImage);


    super.willUnmount();
  }

  /**
   * Returns pinBuilder view html
   * @return {String}
   */
  render() {
    const user = userStore.getUser() || new User(new Profile(constants.mocks.defaultProfile));
    if (!user.authorized() &&
      userStore.getStatus() === constants.store.statuses.userStore.unauthorized) {
      appRouter.back();
      return '';
    }

    const boards = user.profile.ID ? boardsStore.getBoardsByProfileID(user.profile.ID) : constants.mocks.boards;
    const select = document.getElementById('board-name');
    if (boards && select) {
      for (let i = 0; i <= boards.length; i++) {
        const opt = document.createElement('option');
        opt.value = boards[i].ID;
        opt.innerHTML = boards[i].title;
        select.appendChild(opt);
      }
    }
    // const boards = user.profile.ID ? boardsStore.getBoardsByProfileID(user.profile.ID) : constants.mocks.boards;
    // const select = document.getElementById('board-name');
    // for (let i = 0; i<=boards.length; i++) {
    //   const opt = document.createElement('option');
    //   opt.value = boards[i].ID;
    //   opt.innerHTML = boards[i].title;
    //   select.appendChild(opt);
    // }

    this._nestedComponents.set('page', new Page({
      ...this.props,
      page__content: this.tmpl({
        ...this.props,
        profile: user.profile,
        // board: boards[0],
      }),
    }));

    return this._nestedComponents.get('page').render();
  }

  /**
   * Submit callback
   * @param {Event} event
   */
  submit(event) {
    event.preventDefault();

    const name = document.querySelector('[name="name"]').value.trim();
    const description = document.querySelector('[name="description"]').value.trim();
    const image = document.getElementById('file-input');

    const nameError = name.match(descriptionRegexp);
    if (!nameError || nameError[0] !== name) {
      toastBox.addToast('Add name to the pin', true);
      return;
    }

    const descriptionError = description.match(descriptionRegexp);
    if (!descriptionError || descriptionError[0] !== description) {
      toastBox.addToast('Add your awesome pin description', true);
      return;
    }

    // const nameError = name.match(descriptionRegexp);
    // if (!nameError || nameError[0] !== name) {
    //   toastBox.addToast('Add name to the pin', true);
    //   return;
    // }
    //
    // const descriptionError = description.match(descriptionRegexp);
    // if (!descriptionError || descriptionError[0] !== description) {
    //   toastBox.addToast('Add your awesome pin description', true);
    //   return;
    // }

    if (!image.files[0]) {
      toastBox.addToast('Don\'t forget your pin image!', true);
      return;
    }

    const payload = {
      title: name,
      description: description,
      // tags: [],
      // boardID: 0,
    };
    const formData = new FormData();

    formData.append('pinInfo', JSON.stringify(payload));
    formData.append('pinImage', image.files[0]);
    actions.pins.createPin(formData);
    this.setState(payload);
  }

  /**
   * createBoard callback
   * @param {Event} event
   */
  createBoard(event) {
    event.preventDefault();

    const boardTitle = document.getElementById('board-name').value;

    if (!boardTitle) {
      toastBox.addToast('Don\'t forget your board name!', true);
      return;
    }
    const boardData = {
      title: boardTitle,
      description: 'Amazingestest-board',
    };
    actions.boards.createBoard(boardData);
  }

  /**
   * previewImage callback
   * @param {Event} event
   */
  previewImage(event) {
    event.preventDefault();
    const file = document.getElementById('file-input').files;
    if (file.length > 0) {
      const fileReader = new FileReader();

      fileReader.onload = function(event) {
        document.getElementById('preview-label').style.backgroundImage = 'url(\'' + event.target.result + '\')';
      };

      fileReader.readAsDataURL(file[0]);
    }
    //
    // const image = document.getElementById('file-input');
    // document.getElementById('preview-label').style.backgroundImage = image.files[0];
  }
}
