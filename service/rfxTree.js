// eslint-disable-next-line no-unused-vars
import colorSpace from 'color-space';
import express from 'express';
import cors from 'cors';
import dmxlib from 'dmxnet';
import { mount } from './lib/server/rest/connectionsapi.js';
import WebRtcConnectionManager from './lib/server/connections/webrtcconnectionmanager.js';
import { init } from './devices/twinkly.js';

const devices = await init();
const devicesSorted = devices.sort((a, b) => a.device_name.localeCompare(b.device_name));

const pixels = devicesSorted.flatMap(device => device.leds);
console.log(devicesSorted.map(device => device.device_name))
console.log(`${pixels.length} LEDs`)

let dataChannel = null;

function sendRTCFrame() {
  if (!dataChannel || dataChannel.readyState != 'open') return;
  const sendSize = devicesSorted.reduce((acc, device) => device.frameBuffer.length + acc, 0);
  const sendBuffer = Buffer.alloc(sendSize);
  let offset = 0;
  devicesSorted.forEach(device => {
    device.buffer.copy(sendBuffer, offset, device.buffer.length - device.frameBuffer.length, device.frameBuffer.length);
    offset += device.frameBuffer.length;
  });
  dataChannel.send(sendBuffer);
}

pixels.showSync = async function showPixelsSync() {
  await Promise.all[devices.map(device => {
      return device.sendSync();
  })];
  sendRTCFrame();
};

pixels.show = function showPixels() {
  devices.forEach(device => {
      device.send();
  });
  sendRTCFrame();
};

devicesSorted.forEach((device) => {
  device.leds.forEach(led => {
    led.write(0, 0, 0);
  });
});

await pixels.showSync();

// eslint-disable-next-line no-unused-vars
let hue = 0;
let current = 0;

// eslint-disable-next-line no-unused-vars
let chroma = 100;

// eslint-disable-next-line no-unused-vars
let value = 100;

// TCP Render loop
// async function frame() {
//     pixels.forEach((pixel, i) => {
//         pixels[i].write(0, 0, 0);
//         // pixel.write(...colorSpace.hsv.rgb([hue + (360 * (i/pixels.length)) % 360, chroma, value]));
//     });
//     pixels[current++].write(255, 0, 0);
//     hue+=5;
//     await pixels.showSync();
//     if (current >= pixels.length) current = 0;
//     setTimeout(frame, 1000);
// }
// setTimeout(frame, 1000);

// UDP Render loop
setInterval(() => {
  // pixels.forEach((pixel, i) => {
      // pixels[i].write(0, 0, 0);
      // pixels[i].write(0, 0, 0);
      // pixel.write(...colorSpace.hsv.rgb([hue + (360 * (i/pixels.length)) % 360, chroma, value]));
  // });
  hue+=5;
  pixels.show();

  if (current >= pixels.length) current = 0;
}, 40);

pixels.show();

// DMX Setup

const dmxnet = new dmxlib.dmxnet({});
let universe = 0;

devicesSorted.forEach((device, i) => {
    const receiver = dmxnet.newReceiver({
      subnet: 0,
      universe: i,
      net: 0,
    });

    receiver.device = device;
    universe++;

    receiver.on('data', function(data) {
      const buffer = Buffer.from(data);
      buffer.copy(this.device.buffer, this.device.buffer.length - this.device.frameBuffer.length, 0, this.device.frameBuffer.length);
    });
});

console.log(`DMX on universes 0 - ${universe}`);

// HTTP Setup

const app = express();
app.use(cors());
app.use(express.json());

app.get("/pixels", (req, res) => {
    res.json(pixels)
});

app.get("/devices", (req, res) => {
    res.json(devices)
});

app.post("/pixels", async (req, res) => {
    for (let i = 0; i < req.body.length; i++) {
      pixels[i].write(...req.body[i]);
    }
    await pixels.showSync();
    res.status(200).json({status: 'ok'})
});

// RTC Setup
export function rtcServer(peerConnection) {
  dataChannel = peerConnection.createDataChannel('frames');
  function onMessage({ data }) {
      try {
        if (data.startsWith && data.startsWith('frame')) {
          sendRTCFrame();
        } else {
          const buffer = Buffer.from(data);

          let offset = 0;
          devicesSorted.forEach(device => {
            buffer.copy(device.buffer, device.buffer.length - device.frameBuffer.length, offset, offset + device.frameBuffer.length);
            offset += device.frameBuffer.length;
          });

          pixels.show();
        }
      } catch(e) {
        console.log(e);
      }

      return;
  }

  function onConnectionStateChange() {
    switch(peerConnection.connectionState) {
      case "disconnected":
      case "failed":
      case "closed":
        break;
    }
  }

  dataChannel.addEventListener('message', onMessage);
  peerConnection.addEventListener('connectionstatechange', onConnectionStateChange);
}

const connectionManager = WebRtcConnectionManager.create({ beforeOffer: rtcServer });
mount(app, connectionManager, `/webrtc`);
console.log('WebRTC ICE on /webrtc');

const port = process.env.PORT || 3001
app.listen(port, () => {
    console.log(`HTTP on ${port}`);
})
