'use strict';

const HTTPClient = require('bearychat').HTTPClient;
const RTMClient = require('bearychat-rtm-client');
const WebSocket = require('ws');

const token = process.env.HUBOT_TOKEN;

const httpClient = new HTTPClient(token);
const rtmClient = new RTMClient({
  url: function () {
    return httpClient.rtm.start()
      .then(function (data) {
        return data.ws_host;
      });
  },
  WebSocket: WebSocket
});

module.exports = {
  http: httpClient,
  rtm: rtmClient,
  RTMClientEvents: RTMClient.RTMClientEvents,
  RTMClientState: RTMClient.RTMClientState
};
