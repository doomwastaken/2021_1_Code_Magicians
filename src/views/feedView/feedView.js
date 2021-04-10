import {View} from '../view.js';
import {userStore} from '../../stores/userStore/UserStore.js';
import {PinsFeed} from '../../components/pinsFeed/pinsFeed.js';
import {Page} from '../../components/page/page.js';
import {constants} from '../../consts/consts.js';

/**
 * Main pins feed view
 */
export class FeedView extends View {
  /**
   * Makes new feed view
   * @param {Object} props
   */
  constructor(props = {}) {
    super(props, document.getElementById('app'));

    userStore.bind('change', this.refresh);
  }

  /**
   * Returns html
   * @return {String}
   */
  render() {
    const tmpl = Handlebars.templates['feedView.hbs'];

    this._nestedComponents.set('_pinsFeed', new PinsFeed({...this.props, pins: constants.mocks.pins}));
    this._nestedComponents.set('page', new Page({
      ...this.props,
      page__content: tmpl({
        pinsFeed: this._nestedComponents.get('_pinsFeed').render(),
      }),
    },
    ));

    return this._nestedComponents.get('page').render();
  }
}
