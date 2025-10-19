import { SessionDescriptionHandler, Web } from 'sip.js';

import { audioContext } from './audio-context';
import { isPrivateIP } from './lib/utils';
import { log } from './logger';

export function stripPrivateIps(
  description: RTCSessionDescriptionInit,
): Promise<RTCSessionDescriptionInit> {
  const lines = description.sdp.split(/\r\n/);
  const filtered = lines.filter((line) => {
    const m = /a=candidate:\d+ \d+ (?:udp|tcp) \d+ (\d+\.\d+\.\d+\.\d+)/i.exec(line);
    return !m || !isPrivateIP(m[1]);
  });
  description.sdp = filtered.join('\r\n');
  return Promise.resolve(description);
}

export function sessionDescriptionHandlerFactory(session, options): SessionDescriptionHandler {
  // Create custom media stream factory that uses our audioContext
  const mediaStreamFactory = async (constraints: MediaStreamConstraints) => {
    await session.__media.setInput();
    return session.__streams.localStream.stream;
  };

  // Create the factory with custom media stream factory
  const factory = Web.defaultSessionDescriptionHandlerFactory(mediaStreamFactory);
  const sdh = factory(session, options);

  // Initialize session streams
  session.__streams = {
    localStream: audioContext.createMediaStreamDestination(),
    remoteStream: new MediaStream(),
  };

  // Set up peer connection delegate to handle track events (replaces old .on('addTrack'))
  const originalDelegate = sdh.peerConnectionDelegate;
  sdh.peerConnectionDelegate = {
    ...originalDelegate,
    ontrack: async (event: Event) => {
      const pc = sdh.peerConnection;
      if (!pc) return;

      log.debug('ontrack event', 'sessionDescriptionHandlerFactory');

      let remoteStream = new MediaStream();
      if (pc.getReceivers) {
        pc.getReceivers().forEach((receiver) => {
          const rtrack = receiver.track;
          if (rtrack) {
            remoteStream.addTrack(rtrack);
          }
        });
      } else {
        remoteStream = (pc as any).getRemoteStreams()[0];
      }

      session.__streams.remoteStream = remoteStream;
      try {
        await session.__media.setOutput();
      } catch (e) {
        log.error(e, 'sessionDescriptionHandlerFactory');
        session.__media.emit('mediaFailure');
      }

      // Call original delegate if it exists
      if (originalDelegate?.ontrack) {
        originalDelegate.ontrack(event);
      }
    },
  };

  log.debug('Returning patched SDH for session', 'sessionDescriptionHandlerFactory');
  return sdh;
}
