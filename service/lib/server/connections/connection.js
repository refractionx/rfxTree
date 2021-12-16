'use strict';

import EventEmitter from 'events';

class Connection extends EventEmitter {
  constructor(id) {
    super();
    this.id = id;
    this.state = 'open';
  }

  close() {
    this.state = 'closed';
    this.emit('closed');
  }

  toJSON() {
    return {
      id: this.id,
      state: this.state
    };
  }
}

export default Connection;
