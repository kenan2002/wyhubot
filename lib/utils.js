'use strict';

module.exports = {
  analyseMention,
  createMentionString,
  sendChannelTyping,
  createChannelTyping,
  sendToChannel,
  createReplyFunction,
  createReplyWithTyping
};

function analyseMention(text) {
  const regex = /@<=(=\S+?)=>/g;
  let result = [];
  let matched;
  while (matched = regex.exec(text)) {
    const [mentionString, userId] = matched;
    result.push({
      userId: userId,
      mentionString: mentionString,
      index: matched.index
    });
  }
  return result;
}

function createMentionString(userId) {
  return '@<=' + userId + '=>';
}

function sendToChannel(rtm, { vchannel_id, channel_id, refer_key, text }) {
  return rtm.send({
    type: 'channel_message',
    text,
    channel_id,
    vchannel_id: vchannel_id || channel_id,
    refer_key
  });
}

function sendChannelTyping(rtm, { channel_id, uid }) {
  return rtm.send({
    type: 'channel_typing',
    channel_id,
    uid
  });
}

function createChannelTyping(rtm, { channel_id, uid }) {
  return function () {
    return sendChannelTyping(rtm, { channel_id, uid });
  }
}

function createReplyFunction(rtm, { vchannel_id, channel_id, refer_key }) {
  return function (text) {
    return sendToChannel(rtm, {
      text,
      vchannel_id,
      channel_id,
      refer_key
    });
  }
}

function createReplyWithTyping(rtm, { vchannel_id, channel_id, refer_key, uid }) {
  return function (text) {
    sendChannelTyping(rtm, { channel_id, uid });
    return sendToChannel(rtm, {
      text,
      vchannel_id,
      channel_id,
      refer_key
    });
  }
}
