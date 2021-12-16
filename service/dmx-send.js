import dmxlib from 'dmxnet';

const palette = [
  [255, 0, 0],
  [0, 255, 0],
  [0, 0, 255],
  [255, 255, 0],
  [0, 255, 255],
  [255, 0, 255]
];

// const palette = [
//   [0, 0, 0],
//   [0, 0, 0],
//   [0, 0, 0],
//   [0, 0, 0],
//   [0, 0, 0],
//   [0, 0, 0]
// ];

// const palette = [
//   [255, 255, 255],
//   [255, 255, 255],
//   [255, 255, 255],
//   [255, 255, 255],
//   [255, 255, 255],
//   [255, 255, 255],
//   [255, 255, 255],
// ];


const dmxnet = new dmxlib.dmxnet({
  verbose: 1,
});

for (let i = 0; i < 6; i++) {
  const sender = dmxnet.newSender({
    ip: '255.255.255.255',
    subnet: 0,
    universe: i,
    net: 0,
  });
  console.log(i, palette[i][0], palette[i][1], palette[i][2])
  for (let j = 0; j < 509; j+=3) {
    sender.setChannel(j, palette[i][0]);
    sender.setChannel(j, palette[i][1]);
    sender.setChannel(j, palette[i][2]);
  }
}

setTimeout(function() {
  console.log('stop')
}, 50000);
