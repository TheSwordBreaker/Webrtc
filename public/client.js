// DOM elements.
const roomSelectionContainer = document.getElementById('room-selection-container')
const roomInput = document.getElementById('room-input')
const connectButton = document.getElementById('connect-button')
const createButton = document.getElementById('create-room')


const videoChatContainer = document.getElementById('video-chat-container')
const localVideoComponent = document.getElementById('local-video')
const remoteVideoComponent = document.getElementById('remote-video')



// Variables.
const socket = io()
const mediaConstraints = {
  audio: true,
  video: { width: 1280, height: 720 },
}
let localStream
let remoteStream
let isRoomCreator
let rtcPeerConnection // Connection between the local device and the remote peer.
let roomId

// Free public STUN servers provided by Google.
const iceServers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:74.125.247.128:3478' },
    {
      url: 'turn:meet.transparent-retail.com:3800',
      username: 'username',
      credential: 'password'
    },
    // {
    //   url: 'turn:uturn.theswordbreaker.repl.co',
    //   username: 'username',
    //   credential: 'password'
    // },
    // {
    //   url: 'turn:uturn.theswordbreaker.repl.co:80',
    //   username: 'username',
    //   credential: 'password'
    // },
//     {
//       url: 'turn:192.158.29.39:3478?transport=udp',
//       credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
//       username: '28224511:1379330808'
//     },
//     {
//       url: 'turn:74.125.247.128:3478?transport=udp',
//       credential: 'B/aqi1XSSZFafgUjtwDge2Ibi/E=',
//       username: 'CJ7i/f4FEgbIhx2CnPAYqvGggqMKIICjBTAK'
//     },
//     {url: "turn:ec2-54-176-1-181.us-west-1.compute.amazonaws.com:3478", username:"tadhackuser", credential:"tadhackpw"},
//     {
//       urls: 'turn:numb.viagenie.ca',
//       credential: '123456789',
//       username: 'babigeh909@boersy.com',
//     },
    
// {
//     url: 'turn:192.158.29.39:3478?transport=udp',
//     credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
//     username: '28224511:1379330808'
// },
// {
//     url: 'turn:192.158.29.39:3478?transport=tcp',
//     credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
//     username: '28224511:1379330808'
// },
// {
//     url: 'turn:turn.bistri.com:80',
//     credential: 'homeo',
//     username: 'homeo'
//  },
//  {
//     url: 'turn:turn.anyfirewall.com:443?transport=tcp',
//     credential: 'webrtc',
//     username: 'webrtc'
// },
// {
//   urls: "turn:13.250.13.83:3478?transport=udp"  ,
//   username: 'YzYNCouZM1mhqhmseWk6',
//   credential: 'YzYNCouZM1mhqhmseWk6'
//   }
// ,
// {
//   urls: "turn:13.250.13.83:3478?transport=tcp"  ,
//   username: 'YzYNCouZM1mhqhmseWk6',
//   credential: 'YzYNCouZM1mhqhmseWk6'
//   },
// //   {
// //     url: 'turn:relay.backups.cz',
// //     credential: 'webrtc',
// //     username: 'webrtc'
// // },
// // {
// //     url: 'turn:relay.backups.cz?transport=tcp',
// //     credential: 'webrtc',
// //     username: 'webrtc'
// // },
  ],
}

// BUTTON LISTENER ============================================================
connectButton.addEventListener('click', () => {
  joinRoom(roomInput.value)
})

createButton.addEventListener('click', () => {
  Math.random()
})

// SOCKET EVENT CALLBACKS =====================================================
socket.on('room_created', async () => {
  console.log('Socket event callback: room_created')

  await setLocalStream(mediaConstraints)
  isRoomCreator = true
})

socket.on('room_joined', async () => {
  console.log('Socket event callback: room_joined')

  await setLocalStream(mediaConstraints)
  socket.emit('start_call', roomId)
})

socket.on('full_room', () => {
  console.log('Socket event callback: full_room')

  alert('The room is full, please try another one')
})

// FUNCTIONS ==================================================================
function joinRoom(room) {
  if (room === '') {
    alert('Please type a room ID')
  } else {
    roomId = room
    socket.emit('join', room)
    showVideoConference()
  }
}

function showVideoConference() {
  roomSelectionContainer.style = 'display: none'
  videoChatContainer.style = 'display: block'
}

async function setLocalStream(mediaConstraints) {
  let stream
  try {
    stream = await navigator.mediaDevices.getUserMedia(mediaConstraints)
    console.log(stream)
  } catch (error) {
    console.error('Could not get user media', error)
  }

  localStream = stream
  localVideoComponent.srcObject = stream
}

// SOCKET EVENT CALLBACKS =====================================================
socket.on('start_call', async () => {
  console.log('Socket event callback: start_call')

  if (isRoomCreator) {
    rtcPeerConnection = new RTCPeerConnection(iceServers)
    addLocalTracks(rtcPeerConnection)
    rtcPeerConnection.ontrack = setRemoteStream
    rtcPeerConnection.onicecandidate = sendIceCandidate
    await createOffer(rtcPeerConnection)
  }
})

socket.on('webrtc_offer', async (event) => {
  console.log('Socket event callback: webrtc_offer')

  if (!isRoomCreator) {
    rtcPeerConnection = new RTCPeerConnection(iceServers)
    addLocalTracks(rtcPeerConnection)
    rtcPeerConnection.ontrack = setRemoteStream
    rtcPeerConnection.onicecandidate = sendIceCandidate
    rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event))
    await createAnswer(rtcPeerConnection)
  }
})

socket.on('webrtc_answer', (event) => {
  console.log('Socket event callback: webrtc_answer')

  rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event))
})

socket.on('webrtc_ice_candidate', (event) => {
  console.log('Socket event callback: webrtc_ice_candidate')

  // ICE candidate configuration.
  var candidate = new RTCIceCandidate({
    sdpMLineIndex: event.label,
    candidate: event.candidate,
  })
  rtcPeerConnection.addIceCandidate(candidate)
})

// FUNCTIONS ==================================================================
function addLocalTracks(rtcPeerConnection) {
  localStream.getTracks().forEach((track) => {
    console.log(track,localStream)
    rtcPeerConnection.addTrack(track, localStream)
  })
}

async function createOffer(rtcPeerConnection) {
  let sessionDescription
  try {
    sessionDescription = await rtcPeerConnection.createOffer()
    rtcPeerConnection.setLocalDescription(sessionDescription)
  } catch (error) {
    console.error(error)
  }

  socket.emit('webrtc_offer', {
    type: 'webrtc_offer',
    sdp: sessionDescription,
    roomId,
  })
}

async function createAnswer(rtcPeerConnection) {
  let sessionDescription
  try {
    sessionDescription = await rtcPeerConnection.createAnswer()
    rtcPeerConnection.setLocalDescription(sessionDescription)
  } catch (error) {
    console.error(error)
  }

  socket.emit('webrtc_answer', {
    type: 'webrtc_answer',
    sdp: sessionDescription,
    roomId,
  })
}

function setRemoteStream(event) {

  console.log('Stream received')
  remoteVideoComponent.srcObject = event.streams[0]
  remoteStream = event.stream
}

function sendIceCandidate(event) {
  if (event.candidate) {
    socket.emit('webrtc_ice_candidate', {
      roomId,
      label: event.candidate.sdpMLineIndex,
      candidate: event.candidate.candidate,
    })
  }
}
