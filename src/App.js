import React, {useState, useRef, useEffect} from 'react';
// eslint-disable-next-line no-unused-vars
import adapter from 'webrtc-adapter';
import {
  peerConnection,
  peerDisconnection,
  sendMessageToPeer,
  addChannelListener,
} from './peer-connection';

import './App.css';

const constraints = {
  video: {
    width: { ideal: 300 },
    height: { ideal: 300 }
  },
  audio: false,
};

function App() {
  const myCanvas = useRef(null);
  const myVideo = useRef(null);
  const remoteVideo = useRef(null);

  const [isMouseDown, setIsMouseDown] = useState(false);

  const [locations, setLocations] = useState([]);
  const [newLocations, setNewLocations] = useState([]);
  const [myChatMessage, setMyChatMessage] = useState('');
  const [remoteChatMessages, setRemoteChatMessages] = useState([]);

  const room = window.location.hash.substring(1);

  const grabMyWebCamVideo = () => {
    navigator.mediaDevices
        .getUserMedia(constraints)
        .then((stream) => {
      myVideo.current.srcObject = stream;

      peerConnection(room , stream, (stream) => {
        remoteVideo.current.srcObject = stream;
      });
    }).catch((err) => {
      console.log('getUserMedia error', err);
    });
  };

  useEffect(() => {
    grabMyWebCamVideo();

    addChannelListener('chats', (data) => {
      setRemoteChatMessages([...remoteChatMessages, data]);
    });

    addChannelListener('canvas', (data) => {
      const remotePositions = JSON.parse(data);

      let last = {x: -1, y: -1};
      for(let curr of remotePositions) {
        draw(last, curr);
        last = curr;
      }
    });

    return () => {
      peerDisconnection();
    }
  }, []);

  const onMessageChanged = ({target: {value}}) => {
    if(value) {
      setMyChatMessage(value);
    }
  };

  const sendMessage = () => {
    setMyChatMessage('');
    sendMessageToPeer('chats', myChatMessage);
  };

  const draw = (last, current) => {
    if(last.x < 0 || last.y < 0) return;

    const ctx = myCanvas.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(current.x, current.y);
    ctx.closePath();
    ctx.stroke();
  };

  const onMouseUp = (event) => {
    if(!isMouseDown) return;

    sendMessageToPeer('canvas', JSON.stringify(newLocations));

    setIsMouseDown(false);
    setLocations([...locations, newLocations]);
    setNewLocations([]);
  };

  const onMouseDown = ({clientX, clientY}) => {
    setIsMouseDown(true);

    const {offsetLeft, offsetTop} = myCanvas.current;
    setNewLocations([...newLocations, {x: clientX- offsetLeft, y: clientY-offsetTop}]);
  };

  const onMouseMove = ({clientX, clientY}) => {
    if(!isMouseDown) return;

    const {offsetLeft, offsetTop} = myCanvas.current;
    draw(newLocations[newLocations.length - 1], {x: clientX- offsetLeft, y: clientY-offsetTop});

    setNewLocations([...newLocations, {x: clientX- offsetLeft, y: clientY-offsetTop}]);
  };

  return (
    <div className="App">
      <div className="video-wrapper">
          <video ref={myVideo} autoPlay />
          <video ref={remoteVideo} autoPlay />
      </div>
      <div>
        <input value={myChatMessage}
               onChange={onMessageChanged}/>
        <button onClick={sendMessage}>send</button>
      </div>
      <div>
        <h2>Remote Message</h2>
        {remoteChatMessages.map(msg => {
          return <div>{msg}</div>;
        })}
      </div>
      <canvas ref={myCanvas}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseOut={onMouseUp}
              width={500}
              height={300}
      />
    </div>
  );
}

export default App;
