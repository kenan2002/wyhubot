'use strict';

const clients = require('./lib/clients');
const utils = require('./lib/utils');

// require('./apps/rtm-logger')(clients, utils);
require('./apps/commander')(clients, utils);
require('./apps/sticky')(clients, utils);
