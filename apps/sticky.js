'use strict';

module.exports = sticky;

function sticky(clients, utils) {
  const rtm = clients.rtm;
  const http = clients.http;
  const Events = clients.RTMClientEvents;

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
      case 'delete_channel_member':
        handleDeleteChannelMember(message);
        break;
    }
  }

  function handleDeleteChannelMember(message) {
    if (!me) {
      return;
    }
    const uid = message.data.uid;
    if (uid === me.id) {
      const channel_id = message.data.channel_id;
      const vchannel_id = message.data.vchannel_id;
      const reply = utils.createReplyFunction(rtm, {
        channel_id,
        vchannel_id
      });

      http.channel.join({
        channel_id
      }).then(function () {
        reply('别踢我，我错了');
      }).catch(function (e) {
        console.error(e);
      });
    }
  }
}
