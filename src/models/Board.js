import {Model} from './Model';

/**
 * Board model
 */
export class Board extends Model {
  /**
   * Constructor
   * @param {Object} props : {
   *   ID,
   *   userID,
   *   title,
   *   description,
   *   avatarLink,
   * }
   */
  constructor(props = {}) {
    super(props);

    this.pins = [];
  }

  /**
   * Add some pins
   * @param {Array} pins - array of Pins
   */
  addPins(pins) {
    this.pins = [...this.pins, pins];
  }
}
