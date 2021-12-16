import React, { useState, useEffect } from 'react';
import { RTCPeerConnection } from 'wrtc';
import * as THREE from 'three';
import ConnectionClient from './services/webrtc';
import './App.css';


const OrbitControls = require('three-orbit-controls')(THREE);
window.THREE = THREE;

let lastFrameBuffer = null;

let dataChannel = null;
let pixelCount = 0;
let pixelMap = {};
let pixelMaterials = {};
const savedPixelMap = localStorage.getItem('lastUploadedPixelMap');
if (savedPixelMap) {
  pixelMap = JSON.parse(savedPixelMap);
  let minX = 10000;
  let minY = 10000;
  let maxX = -1;
  let maxY = -1;

  Object.keys(pixelMap).forEach(pixelMapKey => {
    const {x, y} = pixelMap[pixelMapKey];
    if (x > maxX) {
      maxX = x;
    }
    if (x < minX) {
      minX = x;
    }

    if (y > maxY) {
      maxY = y;
    }

    if (y < minY) {
      minY = y;
    }
  });


  let width = maxX - minX;
  let height = maxY - minY;
  console.log(minX, minY, maxX, maxY, width, height);

  Object.keys(pixelMap).forEach(pixelMapKey => {
    pixelMap[pixelMapKey].x -= minX;
    pixelMap[pixelMapKey].y -= minY;
  })

  minX = 10000;
  minY = 10000;
  maxX = -1;
  maxY = -1;

  Object.keys(pixelMap).forEach(pixelMapKey => {
    const {x, y} = pixelMap[pixelMapKey];
    if (x > maxX) {
      maxX = x;
    }
    if (x < minX) {
      minX = x;
    }

    if (y > maxY) {
      maxY = y;
    }

    if (y < minY) {
      minY = y;
    }
  });


  width = maxX - minX;
  height = maxY - minY;
  console.log(minX, minY, maxX, maxY, width, height);

  Object.keys(pixelMap).forEach(pixelMapKey => {
    pixelMap[pixelMapKey].x /= width;
    pixelMap[pixelMapKey].y /= height;
    pixelMap[pixelMapKey].y = 1.0  - pixelMap[pixelMapKey].y;
  })
}

function copyImageDataToFrameBuffer(imageData) {
  Object.keys(pixelMap).forEach(pixelMapKey => {
    const pm = pixelMap[pixelMapKey];
    const x = parseInt(pm.x * imageData.width);
    const y = parseInt((1.0 - pm.y) * imageData.height);
    const index = (x + y * imageData.width) * 4;
    const r = imageData.data[index];
    const g = imageData.data[index + 1];
    const b = imageData.data[index + 2];
    // const a = imageData.data[index + 3];
    const pixelIndex = pixelMapKey * 3;

    if (lastFrameBuffer) {
      lastFrameBuffer[pixelIndex] = r;
      lastFrameBuffer[pixelIndex+1] =  g;
      lastFrameBuffer[pixelIndex+2] =  b;
    }
  });
}

function sendLastFrameBuffer() {
  if (dataChannel && dataChannel.readyState === 'open' && lastFrameBuffer) {
    dataChannel.send(lastFrameBuffer);
  }
}

let analyser = null;
let track = null;
let dataArray = null;
let bufferLength = 0;
let uX = 0.5;
let uY = 0.5;
let uU = 0.5;
let uV = 0.5;
let uZ = 0.5;
let stepRafID = null;
let videoRafID = null;
let pipelineStage = -1;


function App() {
  const [devices, setDevices] = useState([]);
  const [pixels, setPixels] = useState([]);
  const [, setPeerConnection] = useState(null);
  const [, setChannel] = useState(null);
  const [channelOpen, setChannelOpen] = useState(false);
  const [sliderU, setSliderU] = useState(uU * 100);
  const [videoFileUrl, setVideoFileUrl] = useState(null);
  const [audioFileUrl, setAudioFileUrl] = useState(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioContext, setAudioContext] = useState(null);
  const [mode, setMode] = useState(0);

  useEffect(() => {

    async function createClient(name, options) {
      const connectionClient = new ConnectionClient();

      let peerConnection = null;

      peerConnection = await connectionClient.createConnection(options);
      window.peerConnection = peerConnection;
      setPeerConnection(peerConnection)
    }

    function rtcClient(peerConnection) {

      function closeDatachannel() {
        if (dataChannel) {
          dataChannel.removeEventListener('message', onMessage);
          dataChannel.close();
          dataChannel = null;
        }
      }

      async function onMessage({ data }) {
        if (data.startsWidth && data.startsWith('frame')) {

        } else {
          const buffer = (data instanceof ArrayBuffer) ? Buffer.from(data) : Buffer.from(await data.arrayBuffer());
          lastFrameBuffer = buffer;

          const rxCanvas = document.getElementById('rx');
          if (rxCanvas === null) {
            return;
          }
          const ctx = rxCanvas.getContext('2d');
          const width = rxCanvas.getBoundingClientRect().width;
          const height = rxCanvas.getBoundingClientRect().height;
          const pixels = buffer.length / 3;
          const pixelWidth = width  / pixels;

          for (let i = 0; i < pixels; i++) {
            const colorIndex = i * 3;
            ctx.fillStyle = `rgb(${buffer[colorIndex]}, ${buffer[colorIndex+1]}, ${buffer[colorIndex+2]})`;
            ctx.fillRect(pixelWidth * i, 0, pixelWidth, height);
            if (pixelMaterials[i]) {
              pixelMaterials[i].emissive = new THREE.Color(`rgb(${buffer[colorIndex]}, ${buffer[colorIndex+1]}, ${buffer[colorIndex+2]})`);
            }
          }
        }
        return;
      }

      function onDataChannel({ channel }) {
        if (channel.label !== 'frames') {
          return;
        }
        setChannel(channel);
        setChannelOpen(true);
        setTimeout(() => {
          dataChannel = channel;
          dataChannel.addEventListener('message', onMessage);
          try {
            dataChannel.send(`frame`);
          } catch(e) {
            console.log('Failed to send data over dataChannel :', e);
            peerConnection.close();
            closeDatachannel();
            alert(e);
          }
        }, 40);
      }

      function onConnectionStateChange(event) {
        switch(peerConnection.connectionState) {
          case "disconnected":
          case "failed":
          case "closed":
            console.log('Received close event');
            closeDatachannel();
            break;
          default:
            break;
        }
      }
      peerConnection.addEventListener('connectionstatechange', onConnectionStateChange);
      peerConnection.addEventListener('datachannel', onDataChannel);
    }

    function draw() {
      const canvas = document.getElementById("analyser");
      if (canvas === null) {
        setTimeout(draw, 100);
        return;
      }
      const context = canvas.getContext('2d');
      const width = canvas.getBoundingClientRect().width;
      const height = canvas.getBoundingClientRect().height;

      context.clearRect(0, 0, width, height);

      if (analyser != null && dataArray != null && bufferLength > 0) {
        // analyser.getByteTimeDomainData(dataArray);
        // context.fillStyle = 'rgb(200, 200, 200)';
        // context.fillRect(0, 0, width, height);
        //
        // context.lineWidth = 2;
        // context.strokeStyle = 'rgb(0, 0, 0)';
        // context.beginPath();
        //
        // const sliceWidth = width * 1.0 / bufferLength;
        // let x = 0;
        //
        // for(let i = 0; i < bufferLength; i++) {
        //   const v = dataArray[i] / 128.0;
        //   const y = v * height/2;
        //
        //   if(i === 0) {
        //     context.moveTo(x, y);
        //   } else {
        //     context.lineTo(x, y);
        //   }
        //
        //   x += sliceWidth;
        // }
        //
        // context.lineTo(width, height/2);
        // context.stroke();

        analyser.getByteFrequencyData(dataArray);

        context.fillStyle = 'rgb(0, 0, 0)';
        context.fillRect(0, 0, width, height);

        const barWidth = (width / bufferLength) * 2.5;
        let barHeight;
        let x = 0;

        for(let i = 0; i < bufferLength; i++) {
          barHeight = (dataArray[i]/255) * height;

          context.fillStyle = 'rgb(' + barHeight + ',50,50)';
          context.fillRect(x, height-barHeight,barWidth,barHeight);

          if (i === bufferLength /2 && lastFrameBuffer != null) {
            const progress = dataArray[i] / 255;
            const pixels = lastFrameBuffer.length / 3;
            const pixelIndex = parseInt(progress * pixels)  * 3;

            for(let j = 0; j < lastFrameBuffer.length; j += 3) {
              if (j < pixelIndex) {
                lastFrameBuffer[j] =  255;
                lastFrameBuffer[j+1] =  0;
                lastFrameBuffer[j+2] =  0;
              } else {
                lastFrameBuffer[j] =    0;
                lastFrameBuffer[j+1] =  0;
                lastFrameBuffer[j+2] =255;
              }
            }
            sendLastFrameBuffer();
          }
          x += barWidth + 1;
        }
      }
      setTimeout(draw, 100);
    }

    fetch("http://localhost:3001/devices")
      .then(res => res.json())
      .then(devices => {
        setDevices(devices);
      });

    fetch("http://localhost:3001/pixels")
      .then(res => res.json())
      .then(pixels => {
        pixelCount = pixels.length;
        setPixels(pixels);
      });

    createClient('webrtc', { beforeAnswer: rtcClient, RTCPeerConnection });

    let txCanvas = document.getElementById("tx");
    txCanvas.addEventListener("mousedown", function(e)
    {
      const rect = txCanvas.getBoundingClientRect();
      const width = rect.width;
      const x = e.clientX - rect.left;
      // const y = e.clientY - rect.top;
      const progress = x / width;
      const pixels = lastFrameBuffer.length / 3;
      const pixelIndex = parseInt(progress * pixels)  * 3;

      lastFrameBuffer[pixelIndex] =  255;
      lastFrameBuffer[pixelIndex+1] =  255;
      lastFrameBuffer[pixelIndex+2] =  255;
      sendLastFrameBuffer();
    });



    if (audioContext === null) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const newAudioContext = new AudioContext();
      analyser = newAudioContext.createAnalyser();
      const audioElement = document.getElementById("audioSource1");
      track = newAudioContext.createMediaElementSource(audioElement);
      track.connect(analyser);
      analyser.connect(newAudioContext.destination);
      analyser.fftSize = 128;
      bufferLength = analyser.frequencyBinCount;
      dataArray = new Uint8Array(bufferLength);

      setAudioContext(newAudioContext);
    }
    if (audioPlaying) {
      requestAnimationFrame(draw);
    }

    const video = document.createElement('video');
    video.autoplay = true;
    video.preload = "auto";
    let height;
    let width;
    let canvas = document.getElementById('input');

    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(640, 300);
    renderer.domElement.style.display = 'inline-block';
    document.getElementById('main').appendChild( renderer.domElement );
    const camera = new THREE.PerspectiveCamera( 45, 640 / 300, 1, 500 );
    camera.position.set(1, 1.5, 1.2);
    camera.lookAt( 0, 0, 0 );
    const controls = new OrbitControls( camera, renderer.domElement );
    const scene = new THREE.Scene();
    Object.keys(pixelMap).forEach(pixelKey => {
      const geometry = new THREE.SphereGeometry(0.01, 32, 16 );
      const material = new THREE.MeshPhysicalMaterial( { color: 0xffff00 } );
      pixelMaterials[pixelKey] = material;
      const sphere = new THREE.Mesh( geometry, material );

      sphere.position.set(pixelMap[pixelKey].x, pixelMap[pixelKey].y, 0);
      scene.add( sphere );
    });

    const geometry = new THREE.PlaneGeometry( 2, 2 );
    const material = new THREE.MeshPhysicalMaterial( {
      color: 0xefefef,
      side: THREE.DoubleSide,
      metalness: 0.9,
      roughness:0.5,
      reflectivity: 1.0,
    } );
    const plane = new THREE.Mesh( geometry, material );
    plane.position.set(0.5, 0.5, -0.2);
    scene.add( plane );

    function animate() {
    	requestAnimationFrame( animate );
    	controls.update();
    	renderer.render( scene, camera );
    }
    animate();

    let inputContext = canvas.getContext('2d');
    let outputCanvas = document.getElementById('output');
    let outputContext = outputCanvas.getContext('2d');
    const memory = new WebAssembly.Memory({ initial: 65536 });
    const arrayBuffer = memory.buffer;
    let inputArray;
    let outputArray;
    let maskArray;
    let background = 0;
    let rect = null;
    let outputImageData;
    let compiled;
    let tStart = performance.now();

    function loop() {
      return function(context) {
        context.render = () => {
          compiled.instance.exports.process(inputArray.byteOffset, width, height, maskArray.byteOffset, outputArray.byteOffset, background, 0, -1, 0, uX, uY, uU, uV, uZ);
        }
      }
    }

    function motion() {
      return function(context) {
        if (context.detected) {
          return true;
        }
        // compiled.instance.exports.process(inputArray.byteOffset, width, height, maskArray.byteOffset, outputArray.byteOffset, 0, 0, -1, 1, uX, uY, uU, uV, uZ);
        context.render = () => {
          compiled.instance.exports.process(inputArray.byteOffset, width, height, maskArray.byteOffset, outputArray.byteOffset, 0, 0, 3, 0, uX, uY, uU, uV, uZ);
          let movedPixels = 0;
          for (let i = 0; i < outputArray.length; i+=4) {
            if (outputArray[i] + outputArray[i+1] + outputArray[i+2] > 120) {
              movedPixels++;
            }
          }
          if (movedPixels > 50 && movedPixels < 100000) {
            context.detected = true;
          }
        }
      }
    }

    function threshold(from, to, speed, mask) {
      return function(context) {
        if (!this.value) {
          this.value = from;
          this.from = from;
          this.to = to;
          this.speed = speed;
        }

        if (this.value < this.to) {
          this.value += speed;
          uU = this.value;
          setSliderU(this.value * 100);
        } else {
          return true;
        }

        context.threshold = new Uint8ClampedArray(outputArray.length)
        context.render = () => {
          compiled.instance.exports.process(inputArray.byteOffset, width, height, maskArray.byteOffset, outputArray.byteOffset, background, mask, 6, 0, uX, uY, uU, uV, uZ);
          context.threshold.set(outputArray);
        }
      }
    }

    function accumulate(threshold, speed, mask) {
      return function(context) {
        context.intermediate = Uint8ClampedArray.from(inputArray);
        context.accumulated = Uint8ClampedArray.from(outputArray);

        context.render = () => {
          compiled.instance.exports.process(inputArray.byteOffset, width, height, maskArray.byteOffset, context.intermediate.byteOffset, background, mask, 6, 0, uX, uY, threshold, uV, uZ);
          compiled.instance.exports.process(context.intermediate.byteOffset, width, height, maskArray.byteOffset, context.accumulated.byteOffset, 1, mask, 4, 0, uX, uY, speed, uV, uZ);
          compiled.instance.exports.process(context.accumulated.byteOffset, width, height, maskArray.byteOffset, outputArray.byteOffset, background, mask, 12, 0, uX, uY, speed, uV, uZ);
        }
        return true;
      }
    }

    function accumulateMasked(threshold, speed, mask) {
      return function(context) {
        context.accumulate2 = new Uint8ClampedArray(outputArray.length);
        compiled.instance.exports.process(inputArray.byteOffset, width, height, maskArray.byteOffset, outputArray.byteOffset, background, 0, 6, 1, uX, uY, threshold, uV, uZ);
        context.render = () => {
          compiled.instance.exports.process(inputArray.byteOffset, width, height, maskArray.byteOffset, outputArray.byteOffset, background, 0, 6, 0, uX, uY, threshold, uV, uZ);
          inputArray.set(new Uint8ClampedArray(outputArray));
          compiled.instance.exports.process(inputArray.byteOffset, width, height, maskArray.byteOffset, outputArray.byteOffset, 2, 1, 4, 0, uX, uY, speed, uV, uZ);
          context.accumulate2.set(new Uint8ClampedArray(outputArray));
        }

        return true;
      }
    }

    function maxRegion() {
      return function(context) {
        context.maxRegionShot = new Uint8ClampedArray(outputArray.length);
        context.maxRegionShot.set(outputArray);

        context.render = () => {
          inputArray.set(context.maxRegionShot);
          compiled.instance.exports.process(inputArray.byteOffset, width, height, maskArray.byteOffset, outputArray.byteOffset, background, 0, 23, 0, uX, uY, threshold, uV, uZ);
        }

        return true;
      }
    }

    function invert() {
      return function(context) {
        context.render = () => {
          inputArray.set(context.accumulated);
          compiled.instance.exports.process(inputArray.byteOffset, width, height, maskArray.byteOffset, outputArray.byteOffset, background, 0, 7, 0, uX, uY, uU, uV, uZ);
        }

        return true;
      }
    }

    function wait(time) {
      return function(context) {
        if (!this.startTime) {
          this.startTime = performance.now();
        }

        if (performance.now() - this.startTime > time) {
          return true;
        }
      }
    }

    function color(color) {
      return async function(context) {
        await fetch('http://localhost:3001/pixels', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(Array(pixelCount).fill(color))
        });
        return true;
      }
    }

    const mappingPipeline = [
       color([10, 10, 10]),
       wait(500),
       threshold(0.0, 0.20, 0.005, 0),
       wait(500),
       color([0, 0, 0]),
       wait(500),
       threshold(0.05, 0.15, 0.01, 0),
       wait(500),
       accumulate(0.40, 0.01, 0),
       wait(500),
       invert(),
       wait(500),
       function copyNoiseMask(context) {
         const copy = new Uint8ClampedArray(outputArray);
         copy.set(outputArray);
         maskArray.set(copy);
         context.noiseMask = copy;
         context.render = () => { }
         return true;
       },
       color([10, 10, 10]),
       wait(500),
       threshold(0.0, 0.25, 0.005, 1),
       wait(500),
       accumulateMasked(0.25, 0.01, 1),
       wait(5000),
       function sampleAccOutput(context) {
          maskArray.set(context.accumulate2);
          const accumulate2ImageData = new ImageData(maskArray, width, height);
          context.accumulate2ImageData = accumulate2ImageData;
          outputContext.putImageData(accumulate2ImageData, 0, 0)
          var link = document.createElement('a');
          link.download = 'accumulatedSample.png';
          link.href = outputCanvas.toDataURL();
          link.click();

          context.render = () => {
          };
          return true;
       },
       maxRegion(),
       wait(500),
       function sampleMaxOutput(context) {
          const minX = compiled.instance.exports.getMinX() * width;
          const minY = compiled.instance.exports.getMinY() * height;
          const maxX = compiled.instance.exports.getMaxX() * width;
          const maxY = compiled.instance.exports.getMaxY() * height;
          rect = [minX, minY, maxX - minX, maxY - minY];
          context.maxRegion = rect;
          context.render = () => { };
          return true;
       },
       async function sampleLights(context) {
          if (context.currentLight === undefined) {
            context.currentLight = 0;
            rect = null;
            context.t0 = performance.now();
            context.lastUpdate = context.t0;
            context.pixelMap = {};
            pixelMap = context.pixelMap;
            window.pixelMap = context.pixelMap;
            maskArray.set(context.accumulate2);
          }

          if (context.currentLight === pixelCount) {
            const a = document.createElement('a');
            const fileToSave = new Blob([JSON.stringify(context.pixelMap)], {
                type: 'application/json'
            });
            a.href = URL.createObjectURL(fileToSave);
            a.download = 'pixelMap.json';
            a.click()
            return true;
          }

          const pixels = Array(pixelCount).fill([0, 0, 0]);
          pixels[context.currentLight] = [250, 250, 250];
          const pixelPayload = JSON.stringify(pixels);

          context.render = () => { };
          const now = performance.now();
          if (now - context.lastUpdate > 1000) {
            await fetch('http://localhost:3001/pixels', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: pixelPayload
            });

            compiled.instance.exports.process(inputArray.byteOffset, width, height, maskArray.byteOffset, outputArray.byteOffset, background, 1, 6, 1, uX, uY, 0.5, uV, uZ);
            inputArray.set(new Uint8ClampedArray(outputArray));
            compiled.instance.exports.process(inputArray.byteOffset, width, height, maskArray.byteOffset, outputArray.byteOffset, background, 0, 23, 0, uX, uY, uU, uV, uZ);
            context.lastUpdate = now;

            const minX = compiled.instance.exports.getMinX() * width;
            const minY = compiled.instance.exports.getMinY() * height;
            const maxX = compiled.instance.exports.getMaxX() * width;
            const maxY = compiled.instance.exports.getMaxY() * height;
            const pw = maxX - minX;
            const ph = maxY - minY;
            if (maxX > minX && maxY > minY && pw < 100 && ph < 100) {
              const px = (minX + maxX) / 2;
              const py = (minY + maxY) / 2;

              context.pixelMap[context.currentLight] = {
                x: px, y: py
              }
            }
            rect = [minX, minY, pw, ph];
            context.currentLight++;
          }
       },
       function reset(context) {
         context.render = () => { }
         pipelineStageState = pipeline.map(stage => {
           return {};
         });

         pipelineContext = {};

         pipeline = pipeline.map((stage, i) => {
           return stage.bind(pipelineStageState[i]);
         });
         pipelineStage = -1;
       },
    ];

    const killPipeline = [
      motion(),
      function putCircle() {
        const ctx = txCanvas.getContext('2d');
        var X = txCanvas.width / 2;
        var Y = txCanvas.height / 2;
        var R = 45;
        ctx.beginPath();
        ctx.arc(X, Y, R, 0, 2 * Math.PI, false);
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#FFFFFF';
        ctx.stroke();
        const imageData = ctx.getImageData(0, 0, txCanvas.width, txCanvas.height);
        copyImageDataToFrameBuffer(imageData);
        sendLastFrameBuffer();

        document.getElementById('audioEffect1').play();
        return true;
      },
      wait(5000),
      async function killStage() {
        const ctx = txCanvas.getContext('2d');
        var X = txCanvas.width / 2;
        var Y = txCanvas.height / 2;
        var R = 45;

        ctx.fillStyle = "red";
        ctx.fillRect(0, 0, txCanvas.width, txCanvas.height);

        ctx.beginPath();
        ctx.arc(X, Y, R, 0, 2 * Math.PI, false);
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#FFFFFF';
        ctx.stroke();
        const imageData = ctx.getImageData(0, 0, txCanvas.width, txCanvas.height);
        copyImageDataToFrameBuffer(imageData);
        sendLastFrameBuffer();
        return true;
      },
      wait(3000),
      async function cleanStage() {
        const ctx = txCanvas.getContext('2d');

        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, txCanvas.width, txCanvas.height);

        const imageData = ctx.getImageData(0, 0, txCanvas.width, txCanvas.height);
        copyImageDataToFrameBuffer(imageData);
        sendLastFrameBuffer();
        return true;
      },
    ];
    console.log(mode);
    let pipeline = mode === 0 ? mappingPipeline : killPipeline;

    let pipelineStageState = pipeline.map(stage => {
      return {};
    });

    let pipelineContext = {};

    pipeline = pipeline.map((stage, i) => {
      return stage.bind(pipelineStageState[i]);
    });

    async function drawVideo() {
      uV = performance.now();
      let tEnd = performance.now();
      let total = tEnd - tStart;
      tStart = tEnd;
      inputContext.drawImage(video, 0, 0, width * 2, height * 2, 0, 0, width, height);
      const inputData = inputContext.getImageData(0, 0, width, height);

      inputArray.set(inputData.data, 0);
      let tStartNative = performance.now();

      if (pipelineStage > -1) {
        const stage = pipeline[pipelineStage];
        let next = false;
        if (stage) {
          if (stage.resolve || stage.constructor.name === "AsyncFunction") {
            next = await stage(pipelineContext);
          } else {
            next = stage(pipelineContext);
          }
        } else {
            loop()(pipelineContext);
        }

        if (next) {
          pipelineStage++;
        }
      } else {
        loop()(pipelineContext);
      }

      if (pipelineContext.render) {
        pipelineContext.render();
      }

      let tEndNative = performance.now();

      outputContext.putImageData(outputImageData, 0, 0)

      // fps
      outputContext.fillStyle = 'white';
      outputContext.strokeStyle = 'black';

      outputContext.font = "30px Arial";
      outputContext.fillText(`Native time: ${(tEndNative - tStartNative).toFixed(2)} ms`, 10, 50);
      outputContext.fillText(`Total time: ${total.toFixed(2)} ms`, 10, 100);
      outputContext.fillText(`FPS: ${(1000/total).toFixed(0)}`, 10, 150);
      outputContext.strokeText(`Native time: ${(tEndNative - tStartNative).toFixed(2)} ms`, 10, 50);
      outputContext.strokeText(`Total time: ${total.toFixed(2)} ms`, 10, 100);
      outputContext.strokeText(`FPS: ${(1000/total).toFixed(0)}`, 10, 150);

      if (rect) {
        outputContext.beginPath();
        outputContext.strokeStyle = "green";
        outputContext.rect(...rect);
        outputContext.stroke();
      }

      videoRafID = requestAnimationFrame(drawVideo);
    };

    const videoSource = document.createElement('video');
    videoSource.autoplay = true;
    videoSource.preload = "auto";

    const videoCanvas = document.getElementById("videoSource1");
    const videoCanvasContext = videoCanvas.getContext("2d");

    videoSource.addEventListener('canplaythrough', function(ev) {
      function step() {
        videoCanvasContext.drawImage(videoSource, 0, 0, videoCanvas.width, videoCanvas.height);
        const videoData = videoCanvasContext.getImageData(0, 0, videoCanvas.width, videoCanvas.height);
        copyImageDataToFrameBuffer(videoData);
        sendLastFrameBuffer();
        stepRafID = requestAnimationFrame(step)
      }

      if (stepRafID) {
        cancelAnimationFrame(stepRafID);
      }
      stepRafID = requestAnimationFrame(step);

   }, false);

   if(videoFileUrl) {
     videoSource.src = videoFileUrl;
   }

    fetch('/imagine.bin')
      .then(response => response.arrayBuffer())
      .then(bytes => WebAssembly.instantiate(bytes, {
          env: {
            memory,
          }
        })
      )
      .then(instance => {
        compiled = instance;
        navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { width: { min: 640 }, height: { min: 480 } }
        }).then(function success(stream) {
          video.srcObject = stream;
          video.addEventListener('canplaythrough', function(ev) {
            height = video.videoHeight / 2;
            width = video.videoWidth / 2;
            inputArray = new Uint8ClampedArray(arrayBuffer, instance.instance.exports.__data_end.value, width * height * 4);
            outputArray = new Uint8ClampedArray(arrayBuffer, inputArray.byteOffset + inputArray.length, width * height * 4);
            maskArray = new Uint8ClampedArray(arrayBuffer, outputArray.byteOffset + outputArray.length, width * height * 4);
            canvas.width = width;
            canvas.height = height;
            outputCanvas.width = width;
            outputCanvas.height = height;
            outputImageData = new ImageData(outputArray, width, height);

            videoRafID = requestAnimationFrame(drawVideo);
         }, false);
        }).catch(function(err) {
            console.log("An error occurred: " + err);
        });
      });

    return async function cleanup() {
      if (audioContext !== null) {
        await audioContext.close();
      }
      renderer.domElement.remove();
    };

  }, [videoFileUrl, audioPlaying, audioContext, mode]);

  useEffect(() => {
     if (mode === 1) {
       if (videoRafID) {
         cancelAnimationFrame(videoRafID);
       }
       pipelineStage = 0;
     }
  }, [mode]);

  return (
    <div className="App" id="main">
      <div style={{ textAlign: 'left', marginBottom: 10, marginLeft: 10, marginTop: 10 }}>
        <span>{devices.length} devices, {pixels.length} pixels, <span style={{
          color: channelOpen ? 'green' : 'red'
        }}>↑↓</span></span>
      </div>

      <div id="display" style={{ textAlign: 'center'}}>
        <div style={{display: 'block'}}>
          <canvas id="input" width="320" height="240"></canvas>
          <canvas id="output" width="320" height="240"></canvas>
        </div>
        <input id="uU" type="range" min="0" max="100" value={sliderU} onChange={((e) => {
          const value = e.target.value / 100;
          uU = value;
          setSliderU(e.target.value);
        })} style={{ display: 'inline-block', width: '1024px' }} />
      </div>

      <audio id="audioSource1"></audio>
      <audio id="audioEffect1" src="squid.mp3"></audio>
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'stretch',
        width: '100%',

      }}>
        <canvas id="tx"></canvas>
        <canvas id="rx"></canvas>
        <canvas id="analyser"></canvas>
        <div style={{
          position: 'absolute',
          top: 10,
          right: 10,
        }}>
          <button role="switch" aria-checked="false" onClick={() => {
            if (audioPlaying === false) {
                document.getElementById('audioSource1').src = audioFileUrl;
                document.getElementById('audioSource1').play();
                setAudioPlaying(true);
            } else if (audioPlaying === true) {
                document.getElementById('audioSource1').pause();
                setAudioPlaying(false);
            }
          }}>
            <span>{audioPlaying ? 'Pause' : 'Play'}</span>
          </button>
          <button onClick={async () => {
            console.log('map 2d')
            pipelineStage = 0;
          }}>
            <span>Map 2D</span>
          </button>
          <button onClick={async () => {
            setMode(1);
          }}>
            <span>O</span>
          </button>
          <label htmlFor="pixelMapFileInput">Pixel map</label>
          <input id="pixelMapFileInput" type="file" name="file" accept="application/json" onChange={function (event) {
            const reader = new FileReader()
            reader.onload = function fileLoad(event) {
              pixelMap = JSON.parse(event.target.result);
              localStorage.setItem('lastUploadedPixelMap', event.target.result);
            };
            console.log(event.target.files[0])
            reader.readAsText(event.target.files[0])
          }} />
          <label htmlFor="audioFileInput">Audio</label>
          <input id="audioFileInput" type="file" name="file" accept="audio/*" onChange={function (event) {
            if (event.target.files && event.target.files[0]) {
              const audioFileUrl = window.URL.createObjectURL(event.target.files[0]);
              setAudioFileUrl(audioFileUrl);
            } else {
              setAudioFileUrl(null);
            }

          }} />
          <label htmlFor="videoFileInput">Video</label>
          <input id="videoFileInput" type="file" name="file" accept="video/*" onChange={function (event) {
            if (event.target.files && event.target.files[0]) {
              const videoFileUrl = window.URL.createObjectURL(event.target.files[0]);
              setVideoFileUrl(videoFileUrl);
            } else {
              setVideoFileUrl(null);
            }

          }} />
        </div>
      </div>
      <canvas id="videoSource1" width="640" height="300"></canvas>
    </div>


  );
}

export default App;
