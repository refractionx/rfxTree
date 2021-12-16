import dgram from 'dgram';
import http from 'http';
import crypto from 'crypto';
import assert from 'assert';

const UDP_PORT_RT = 7777;
const PING_PORT = 5555;
const BROADCAST_ADDR = "255.255.255.255";
const DISCOVER_MESSAGE = "\x01discover";

const discover = async () => {
  const server = dgram.createSocket("udp4");
  server.bind(PING_PORT, () => {
    server.setBroadcast(true);
  });

  const broadcast = new Promise(resolve => {
    const devices = {};
    server.on('message', (msg) => {
      if (msg.length < 7 || msg.slice(4,6).toString() != "OK") {
        return;
      }

      const addressBytes = msg.slice(0, 4).reverse()
      const addressString = `${0xFF & addressBytes[0]}.${0xFF & addressBytes[1]}.${0xFF & addressBytes[2]}.${0xFF & addressBytes[3]}`;

      const deviceName = msg.slice(6, msg.length - 1).toString()
      devices[deviceName] = {
        ip4: addressString
      };
    });

    const message = Buffer.from(DISCOVER_MESSAGE);
    server.send(message, 0, message.length, PING_PORT, BROADCAST_ADDR);
    setTimeout(() => {
      server.close();
      resolve(devices);
    }, 500);
  });

  return broadcast;
}

const agent = new http.Agent({ keepAlive: true });

const get = (hostname, path) => {
  return new Promise((resolve, reject) => {
    const req = http.request({
      agent,
      hostname,
      path,
      method: 'GET',
      headers: {},
      port: 80,
    }, (res) => {
      let response = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        response += chunk
      });
      res.on('end', () => {
        resolve(JSON.parse(response))
      });
    });

    req.on('error', (e) => {
      reject(e);
    });
    req.end();
  });
};

const post = (hostname, path, data, headers = {}) => {
  return new Promise((resolve, reject) => {
    const postData = headers['Content-Type'] ? data : JSON.stringify(data);
    const req = http.request({
      agent,
      hostname,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        ...headers,
      },
      port: 80,
    }, (res) => {
      let response = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        response += chunk
      });
      res.on('end', () => {
        resolve(JSON.parse(response))
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.write(postData);
    req.end();
  });
};

export async function init() {
  const probes = await discover();
  return Promise.all(Object.values(probes).map(async ({ip4}) => {
    const deviceInfo = await get(ip4, '/xled/v1/gestalt');
    const challenge = crypto.randomBytes(32).toString('base64');
    const challengeRequest = { challenge };
    const loginInfo = await post(ip4, '/xled/v1/login', challengeRequest);
    const verify = await post(ip4, '/xled/v1/verify', { ['challenge-response']: loginInfo['challenge-response'] }, { ['X-Auth-Token']: loginInfo.authentication_token });
    assert.equal(verify.code, 1000);

    const rt = await post(ip4, '/xled/v1/led/mode', { mode: 'rt'}, { ['X-Auth-Token']: loginInfo.authentication_token });
    assert.equal(rt.code, 1000);

    const frameHeaderBuffer = Buffer.from([0x01]);
    const udpTokenBuffer = Buffer.from(loginInfo.authentication_token, 'base64');

    const ledNumberBuffer = Buffer.alloc(1);
    ledNumberBuffer.writeUInt8(deviceInfo.number_of_led);

    const frameBuffer = Buffer.alloc(3 * deviceInfo.number_of_led);
    frameBuffer.set(Array.from({ length: deviceInfo.number_of_led }, () => [0, 0, 0]).flat());

    const deviceBuffer = new Buffer.concat([frameHeaderBuffer, udpTokenBuffer, ledNumberBuffer, frameBuffer])

    const client = {
      udp: dgram.createSocket('udp4'),
      tcp: {
        send: async function(frame) {
          const sendBuffer = Buffer.alloc(frameBuffer.length);
          frame.copy(sendBuffer, 0, deviceBuffer.length - frameBuffer.length, frameBuffer.length);

          return post(ip4, '/xled/v1/led/rt/frame', sendBuffer, {
            ['X-Auth-Token']: loginInfo.authentication_token,
            ['Content-Type']: 'application/octet-stream'
          })
        }
      }
    };

    const leds = Array.from({length: deviceInfo.number_of_led}, (v, i) => {
      const led = {};
      led.id = `${deviceInfo.device_name}-${i}`;
      led.deviceInfo = deviceInfo;
      led.loginInfo = loginInfo;
      led.client = client;
      led.deviceBuffer = deviceBuffer;
      led.ip4 = ip4;
      led.idx = i;
      led.write = function writeLedColor(r, g, b) {
        const indexInFrame = (this.deviceBuffer.length - frameBuffer.length) + (this.idx * 3);
        this.deviceBuffer[indexInFrame] = r;
        this.deviceBuffer[indexInFrame + 1] = g;
        this.deviceBuffer[indexInFrame + 2] = b;
      };
      led.write.bind(led);
      return led;
    });

    return {
      ...deviceInfo,
      ...loginInfo,
      buffer: deviceBuffer,
      frameBuffer: frameBuffer,
      ip4,
      client,
      leds,
      send: function deviceSend() {
        client.udp.send(deviceBuffer, UDP_PORT_RT, ip4);
      },
      sendSync: function deviceSendSync() {
        client.tcp.send(deviceBuffer, ip4);
      }
    };
  }));
}
