'use strict';

module.exports = RTMLogger;

const winston = require('winston');

function RTMLogger(clients) {
  const rtm = clients.rtm;
  const Events = clients.RTMClientEvents;

  rtm.on(Events.ONLINE, handleOnline);
  rtm.on(Events.OFFLINE, handleOffline);
  rtm.on(Events.EVENT, handleRTMEvent);
  rtm.on(Events.ERROR, handleError);

  function handleOnline() {
    console.log('ONLINE');
  }

  function handleOffline() {
    console.log('OFFLINE');
  }

  function handleRTMEvent(message) {
    console.log('MESSAGE');
    console.log(message);
  }

  function handleError(errorEvent) {
    console.log('ERROR');
    console.error(errorEvent);
  }
};
