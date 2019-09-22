import io from 'socket.io-client';

// const configuration = {
//   'iceServers': [{
//     'urls': 'stun:stun.l.google.com:19302'
//   }]
// };

const configuration = null;
const socket = io('http://localhost:3001');

function log(...msg) {
  // console.log(msg);
}
function connect(
    room,
    createPeerConnection,
    signalingMessageCallback,
) {
  let isInitiator = false;

  socket.on('created', function(room, clientId) {
    log('Created room', room, '- my client ID is', clientId);
    isInitiator = true;
  });

  socket.on('joined', function(room, clientId) {
    log('This peer has joined room', room, 'with client ID', clientId);
    isInitiator = false;
    createPeerConnection(isInitiator, configuration);
  });

  socket.on('full', function(room) {
    alert('Room ' + room + ' is full. We will create a new room for you.');
    window.location.hash = '';
    window.location.reload();
  });

  socket.on('ready', function() {
    log('Socket is ready');
    createPeerConnection(isInitiator, configuration);
  });

  socket.on('log', function(array) {
    log(array);
  });

  socket.on('message', function(message) {
    log('Client received message:', message);
    signalingMessageCallback(message);
  });

// Joining a room.
  socket.emit('create or join', room);
}

function disconnect(room) {
  socket.emit('bye', room);
}

function sendMessage(message) {
  log('Client sending message: ', message);
  socket.emit('message', message);
}

export {
  connect,
  disconnect,
  sendMessage,
};
