import { Session as UserAgentSession, SessionState } from 'sip.js';
import * as Features from './features';

export function checkAudioConnected(
  session: UserAgentSession,
  {
    checkInterval,
    noAudioTimeout,
  }: {
    checkInterval: number;
    noAudioTimeout: number;
  },
): Promise<void> {
  let checkTimer: number;

  return new Promise((resolve, reject) => {
    const setupAudioCheck = () => {
      // We patched the sdh with peerConnection.
      const pc = (session.sessionDescriptionHandler as any)?.peerConnection;
      if (!pc) {
        reject(new Error('No peer connection available'));
        return;
      }

      // onconnectionstatechange is only supported on Chromium. For all other
      // browsers we look at the outbound-rtp stats to detect potentially broken
      // audio.
      if (Features.webrtc.connectionstatechange) {
        pc.addEventListener('connectionstatechange', () => {
          switch (pc.connectionState) {
            case 'connected':
              resolve();
              break;

            case 'failed':
              reject();
              break;
          }
        });
      } else {
        let noAudioTimeoutLeft = noAudioTimeout;
        const checkStats = () => {
          pc.getStats().then((stats: RTCStatsReport) => {
            const buckets = Array.from((stats as any).values());
            const outbound: any = buckets.find((obj: any) => obj.type === 'outbound-rtp');
            if (outbound && outbound.packetsSent > 0) {
              resolve();
            } else {
              noAudioTimeoutLeft -= checkInterval;
              if (noAudioTimeoutLeft <= 0) {
                reject();
              } else {
                checkTimer = window.setTimeout(checkStats, checkInterval);
              }
            }
          });
        };

        checkTimer = window.setTimeout(checkStats, checkInterval);

        session.stateChange.addListener(
          (state) => {
            if (state === SessionState.Terminated && checkTimer) {
              window.clearTimeout(checkTimer);
            }
          },
          { once: true },
        );
      }
    };

    // Set up delegate to be notified when SessionDescriptionHandler is created
    const originalDelegate = session.delegate;
    session.delegate = {
      ...originalDelegate,
      onSessionDescriptionHandler: (sdh, provisional) => {
        if (!provisional) {
          setupAudioCheck();
        }
        originalDelegate?.onSessionDescriptionHandler?.(sdh, provisional);
      },
    };

    // If SDH already exists, set up immediately
    if (session.sessionDescriptionHandler) {
      setupAudioCheck();
    }
  });
}
