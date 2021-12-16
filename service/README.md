# rfxTree service


# Implementing support for other devices
- create your device implementation module under /devices, it should export an asynchronous init function
- init() should return a populated devices array with objects containg:
 - number_of_led
 - device_name
 - buffer - Buffer containing arbitrary device information, followed by RGB values for every LED [0...N] of the device
 - frameBuffer - mock buffer only used to calculate offsets, contains RGB values for every LED [0...N] of the device
 - leds
   - write(r, g, b) - write RGB values into the appropriate device buffer location
 - send - optimistic/real-time I/O that sends the color buffer to the device
 - sendSync - sends the color buffer reliably to the device
