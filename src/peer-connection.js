import {connect, disconnect, sendMessage} from './signaling'
import {switchCase} from "@babel/types";

function logError(err) {
  if (!err) return;
  if (typeof err === 'string') {
    console.warn(err);
  } else {
    console.warn(err.toString(), err);
  }
}

let peerConn;
let dataChannel, canvasChannel;
let channelDataListener = {};
function onLocalSessionCreated(desc) {
  console.log('local session created:', desc);
  peerConn.setLocalDescription(
      desc,
      () => {
        console.log('sending local desc:', peerConn.localDescription);
        sendMessage(peerConn.localDescription);
      },
      logError
  );
}

function onDataChannelCreated(channel) {
  console.log('onDataChannelCreated:', channel);

  channel.onopen = function() {
    console.log('CHANNEL opened!!!');
  };

  channel.onclose = function () {
    console.log('Channel closed.');
  };

  channel.onmessage = ({data}) => {
    channelDataListener[channel.label](data);
  };
}

function createPeerConnectionCallback(connectedRemoteCallback, myStream) {

  return function createPeerConnection(isInitiator, config) {
    console.log('Creating Peer connection as initiator?', isInitiator, 'config:',
        config);
    peerConn = new RTCPeerConnection(config);

    peerConn.onicecandidate = function(event) {
      console.log('icecandidate event:', event);
      if (event.candidate) {
        sendMessage({
          type: 'candidate',
          sdpMLineIndex: event.candidate.sdpMLineIndex,
          sdpMid: event.candidate.sdpMid,
          candidate: event.candidate.candidate
        });
      } else {
        console.log('End of candidates.');
      }
    };

    peerConn.onaddstream = (event) => {
      connectedRemoteCallback(event.stream);
    };
    peerConn.addStream(myStream);

    if (isInitiator) {
      console.log('Creating Data Channel');
      dataChannel = peerConn.createDataChannel('chats');
      onDataChannelCreated(dataChannel);

      canvasChannel = peerConn.createDataChannel('canvas');
      onDataChannelCreated(canvasChannel);

      console.log('Creating an offer');
      peerConn.createOffer(onLocalSessionCreated, logError);
    } else {
      peerConn.ondatachannel = (event) => {
        console.log('ondatachannel:', event.channel);

        switch(event.channel.label) {
          case 'chats':
            dataChannel = event.channel;
            onDataChannelCreated(dataChannel);
            break;
          case 'canvas':
            canvasChannel = event.channel;
            onDataChannelCreated(canvasChannel);
            break;
        }
      };
    }
  }
}

function signalingMessageCallback(message) {

  if (message === null) {

  } else if (message.type === 'offer') {
    console.log('Got offer. Sending answer to peer.');
    peerConn.setRemoteDescription(new RTCSessionDescription(message), function() {},
        logError);
    peerConn.createAnswer(onLocalSessionCreated, logError);

  } else if (message.type === 'answer') {
    console.log('Got answer.');
    peerConn.setRemoteDescription(new RTCSessionDescription(message), function() {},
        logError);

  } else if (message.type === 'candidate') {
    peerConn.addIceCandidate(new RTCIceCandidate({
      candidate: message.candidate,
      sdpMid: message.sdpMid,
      sdpMLineIndex: message.sdpMLineIndex
    }));

  }
}

function peerConnection(room, myStream, connectedRemoteCallback) {
  connect(
    room,
    createPeerConnectionCallback(connectedRemoteCallback, myStream),
    signalingMessageCallback,
  );
}

function peerDisconnection() {
  disconnect();
}

function sendMessageToPeer(label, message) {
  switch (label) {
    case 'chats':
      dataChannel && dataChannel.send(message);
      break;
    case 'canvas':
      canvasChannel && canvasChannel.send(message);
      break;
    default:
      break;
  }
}

function addChannelListener(label, callback) {
  channelDataListener[label] = callback;
}

export  {
  peerConnection,
  peerDisconnection,
  sendMessageToPeer,
  addChannelListener,
};
