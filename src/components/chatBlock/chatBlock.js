import { Component } from '../component';
import { userStore } from '../../stores/userStore';
import { actions } from '../../actions/actions';

import ChatBlockTemplate from './chatBlock.hbs';
import './chatBlock.scss';
import { Profile } from '../../models/Profile';

/**
 * Chat block. Later can be used in mobile
 */
export class ChatBlock extends Component {
  /**
   * Makes new chat block
   * @param {Object} props
   */
  constructor(props) {
    super(props);
    this.tmpl = ChatBlockTemplate;
  }

  /**
   * Returns the html code for chatBlock
   * @return {String}
   */
  render() {
    const user = userStore.getUser();
    const chat = userStore.getChat();
    const profile = chat && new Profile(chat.targetProfile);

    const messages = chat && chat.messages.map((message) => {
      message.isSelf = message.authorID === (user && user.profile.ID);

      return message;
    });

    return this.tmpl({
      ...this.props,
      profile,
      messages,
    });
  }

  /**
   * Did
   */
  didMount() {
    document
      .querySelector('.chat__send-button')
      .addEventListener('click', this.submitMessageForm);
    document
      .querySelector('.chat__message-form')
      .addEventListener('submit', this.submitMessageForm);
  }

  /**
   * Will
   */
  willUnmount() {
    document
      .querySelector('.chat__send-button')
      .removeEventListener('click', this.submitMessageForm);
    document
      .querySelector('.chat__message-form')
      .removeEventListener('submit', this.submitMessageForm);
  }

  /**
   * Submit form
   * @param {Event} event
   */
  submitMessageForm(event) {
    event.preventDefault();

    const messageText = document.querySelector('.chat__message-input').value.trim();
    const chat = userStore.getChat();
    const targetUsername = chat && chat.targetProfile.username;

    if (messageText && targetUsername) {
      actions.messages.sendMessage(messageText, targetUsername);
    }
  }
}