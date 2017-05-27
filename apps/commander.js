'use strict';

const _ = require('lodash');

module.exports = function (clients, utils) {
  const rtm = clients.rtm;
  const http = clients.http;
  const Events = clients.RTMClientEvents;

  const masterId = '=bw74b';
  let me;

  getMe();

  rtm.on(Events.EVENT, handleRTMEvent);

  function getMe() {
    return http.user.me()
      .then(function (data) {
        me = data;
      })
  }

  function handleRTMEvent(message) {
    switch (message.type) {
      case 'channel_message':
        handleChannelMessage(message);
        break;
      case 'update_user':
        handleUpdateUser(message);
        break;
      default:
    }
  }

  function handleChannelMessage(message) {
    const mentions = utils.analyseMention(message.text);
    const myMention = mentions.find(function (mention) {
      return me && me.id === mention.userId;
    });
    if (myMention) {
      const commandString = message.text.slice(myMention.index + myMention.mentionString.length + 1).trim();
      const args = commandString.split(/\s+/);
      handleCommand(message, args);
    }
  }

  const commandHandlers = {
    add(...mentionStrings) {
      const message = this;

      const reply = utils.createReplyFunction(rtm, {
        refer_key: message.key,
        vchannel_id: message.vchannel_id,
        channel_id: message.channel_id
      });

      const userIds = mentionStrings.map(function (u) {
        const [mention] = utils.analyseMention(u);
        if (mention) {
          return mention.userId;
        } else {
          return null;
        }
      }).filter(_.identity);

      if (userIds.length === 0) {
        reply('你总要告诉我加谁吧？');
        return;
      }

      Promise.all(userIds.map(function (uid) {
        return http.channel.invite({
          channel_id: message.channel_id,
          invite_uid: uid
        });
      })).then(function () {
        reply('加完啦！');
      }).catch(function (e) {
        reply('没加成，出错了：' + e.message);
      });
    },

    kick(...mentionStrings) {
      const message = this;

      const reply = utils.createReplyFunction(rtm, {
        refer_key: message.key,
        vchannel_id: message.vchannel_id,
        channel_id: message.channel_id
      });

      const userIds = mentionStrings.map(function (u) {
        const [mention] = utils.analyseMention(u);
        if (mention) {
          return mention.userId;
        } else {
          return null;
        }
      }).filter(_.identity);

      if (_.includes(userIds, masterId)) {
        reply('不许踢我的主人！');
        return;
      }

      if (userIds.length === 0) {
        reply('你想让我踢谁啊？');
        return;
      }

      Promise.all(userIds.map(function (uid) {
        return http.channel.kick({
          channel_id: message.channel_id,
          kick_uid: uid
        });
      })).then(function () {
        reply('踢完啦');
      }).catch(function (e) {
        reply('没踢成，出错了：' + e.message);
      });
    }
  };

  function handleCommand(message, args) {
    const [command, ...commandArgs] = args;
    const handler = commandHandlers.hasOwnProperty(command) && commandHandlers[command];
    if (typeof handler === 'function') {
      handler.apply(message, commandArgs);
    }
  }

  function handleUpdateUser(message) {
    if (me && message.data.id === me.id) {
      getMe();
    }
  }
};
