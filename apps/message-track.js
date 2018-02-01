'use strict';

module.exports = track;

const _ = require('lodash');
const co = require('co');

const keyToMessageMap = new Map();

function track(clients, utils) {
  const rtm = clients.rtm;
  const http = clients.http;
  const Events = clients.RTMClientEvents;

  let me;

  rtm.on(Events.EVENT, handleRTMEvents);

  getMe();

  function getMe() {
    return http.user.me()
      .then(function (data) {
        me = data;
      })
  }

  function handleRTMEvents(message) {
    switch(message.type) {
      case 'channel_message':
        keyToMessageMap.set(message.key, message);
        break;
      case 'update_channel_message':
        handleMessageUpdate(message.data);
        break;
      case 'new_message_pin':
        handleNewMessagePin(message.data);
        break;
      default:
    }
  }

  function handleMessageUpdate(message) {
    const key = message.key;

    if (!keyToMessageMap.has(key)) {
      return;
    }

    const originalMessage = keyToMessageMap.get(key);
    message.channel_id = originalMessage.channel_id;

    const reply = utils.createReplyWithTyping(rtm, {
      refer_key: key,
      vchannel_id: message.vchannel_id,
      channel_id: message.channel_id,
      uid: me.id
    });

    if (message.deleted) {
      reply(`消息被删了：${originalMessage.text}`);
    } else {
      reply(`消息修改了，原文是：${originalMessage.text}`);
    }

    keyToMessageMap.set(key, message);
  }

  function handleNewMessagePin(data) {
    const {message, uid} = data;

    const reply = utils.createReplyWithTyping(rtm, {
      refer_key: message.key,
      vchannel_id: message.vchannel_id,
      channel_id: message.vchannel_id,
      uid: me.id
    });

    const mention = utils.createMentionString(uid);
    reply(mention + ' 你偷偷置顶了这条消息');
  }
}