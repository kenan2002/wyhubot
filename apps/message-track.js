'use strict';

module.exports = track;

const _ = require('lodash');
const co = require('co');
const jsdiff = require('diff')

const keyToMessageMap = new Map();
const pinMap = new Map();

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
      case 'delete_message_pin':
        handleDeleteMessagePin(message.data);
        break;
      default:
    }
  }

  function handleMessageUpdate(message) {
    // ignore the hubot itself
    if (message.uid === me.id) {
      return;
    }

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
      const diffResult = diffMessages(originalMessage.text, message.text);
      reply(`消息修改了：\n${diffResult}`);
    }

    keyToMessageMap.set(key, message);
  }

  function handleNewMessagePin(data) {
    const {message, uid} = data;

    co(function*() {
      const reply = utils.createReplyWithTyping(rtm, {
        refer_key: message.key,
        vchannel_id: message.vchannel_id,
        channel_id: message.vchannel_id,
        uid: me.id
      });

      const mention = utils.createMentionString(uid);
      const result = yield reply(mention + ' 你偷偷置顶了这条消息');

      pinMap.set(message.key, {
        pinMentionKey: result.key,
        userId: uid,
      });
    });
  }

  function handleDeleteMessagePin(data) {
    co(function*() {
      const {message_key, uid, vchannel_id} = data;
      if (pinMap.has(message_key)) {
        const pinInfo = pinMap.get(message_key);
        if (pinInfo.userId === uid) {
          yield http.message.delete({
            vchannel_id,
            message_key: pinInfo.pinMentionKey
          });
          pinMap.delete(message_key);
        }
      }
    });
  }

  function diffMessages(originalMessage, updatedMessage) {
    let originalValue = "";
    let updatedValue = "";

    const diff = jsdiff.diffChars(originalMessage, updatedMessage);
    diff.forEach(function(part){
        const value = part.value;
        if (part.added) {
            updatedValue += "**" + value + "**";
        } else if (part.removed) {
            originalValue += "~~" + value + "~~";
        } else {
            updatedValue += value;
            originalValue += value;
        }
    });

    return `原消息：${originalValue}\n***\n新消息：${updatedValue}`;
  }
}

