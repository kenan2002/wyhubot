'use strict';

const _ = require('lodash');
const co = require('co');

module.exports = function (clients, utils) {
  const rtm = clients.rtm;
  const http = clients.http;
  const Events = clients.RTMClientEvents;

  const masterId = '=bw74b';

  let me;

  const getMe = co.wrap(function *() {
    const data = yield http.user.me();
    me = data;
    return data;
  });

  getMe();

  rtm.on(Events.EVENT, handleRTMEvent);

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

      const reply = utils.createReplyWithTyping(rtm, {
        refer_key: message.key,
        vchannel_id: message.vchannel_id,
        channel_id: message.channel_id,
        uid: me.id
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

      co(function *() {
        try {
          yield userIds.map(function (uid) {
            return http.channel.invite({
              channel_id: message.channel_id,
              invite_uid: uid
            });
          });
          reply('加完啦！');
        } catch (e) {
          reply('出错了：' + e.message);
        }
      });
    },

    kick(...mentionStrings) {
      const message = this;

      const reply = utils.createReplyWithTyping(rtm, {
        refer_key: message.key,
        vchannel_id: message.vchannel_id,
        channel_id: message.channel_id,
        uid: me.id
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

      co(function *() {
        try {
          yield userIds.map(function (uid) {
            return http.channel.kick({
              channel_id: message.channel_id,
              kick_uid: uid
            });
          });
          reply('踢完啦');
        } catch (e) {
          reply('出错了：' + e.message);
        }
      });
    },

    archive() {
      const message = this;

      const reply = utils.createReplyWithTyping(rtm, {
        refer_key: message.key,
        vchannel_id: message.vchannel_id,
        channel_id: message.channel_id,
        uid: me.id
      });

      co(function *() {
        try {
          yield http.channel.archive({
            channel_id: message.channel_id
          });
          reply('拜拜');
        } catch (e) {
          reply('出错了：' + e.message);
        }
      });
    },

    leave() {
      const message = this;

      const reply = utils.createReplyWithTyping(rtm, {
        refer_key: message.key,
        vchannel_id: message.vchannel_id,
        channel_id: message.channel_id,
        uid: me.id
      });

      co(function *() {
        try {
          yield http.channel.kick({
            channel_id: message.channel_id,
            kick_uid: message.uid
          });
          reply(utils.createMentionString(message.uid) + ' 慢走，不送');
        } catch (e) {
          reply('出错了：' + e.message);
        }
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
