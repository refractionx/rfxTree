const TIME_TO_HOST_CANDIDATES = 3000;

export default class ConnectionClient {
  constructor(options = {}) {
    options = {
      clearTimeout,
      host: 'http://localhost:3001',
      prefix: '/webrtc',
      setTimeout,
      timeToHostCandidates: TIME_TO_HOST_CANDIDATES,
      ...options
    };

    const {
      prefix,
      host
    } = options;

    this.createConnection = async (options = {}) => {
      options = {
        beforeAnswer() {},
        stereo: false,
        ...options
      };

      const {
        beforeAnswer,
        stereo
      } = options;

      const response1 = await fetch(`${host}${prefix}/connections`, {
        method: 'POST'
      });

      const remotePeerConnection = await response1.json();
      const { id } = remotePeerConnection;

      const localPeerConnection = new RTCPeerConnection({
        sdpSemantics: 'unified-plan'
      });

      localPeerConnection.close = function() {
        fetch(`${host}${prefix}/connections/${id}`, { method: 'delete' }).catch(() => {});
        return RTCPeerConnection.prototype.close.apply(this, arguments);
      };

      try {
        await localPeerConnection.setRemoteDescription(remotePeerConnection.localDescription);

        await beforeAnswer(localPeerConnection);

        const originalAnswer = await localPeerConnection.createAnswer();
        const updatedAnswer = new RTCSessionDescription({
          type: 'answer',
          sdp: stereo ? originalAnswer.sdp.replace(/a=fmtp:111/, 'a=fmtp:111 stereo=1\r\na=fmtp:111') : originalAnswer.sdp
        });
        await localPeerConnection.setLocalDescription(updatedAnswer);

        await fetch(`${host}${prefix}/connections/${id}/remote-description`, {
          method: 'POST',
          body: JSON.stringify(localPeerConnection.localDescription),
          headers: {
            'Content-Type': 'application/json'
          }
        });
        return localPeerConnection;
      } catch (error) {
        localPeerConnection.close();
        throw error;
      }
    };
  }
}
