import test from 'ava';
import * as sinon from 'sinon';

import * as Features from '../src/features';
import {
  createClient,
  createClientImpl,
  defaultTransportFactory,
  defaultUAFactory,
} from './_helpers';

test.serial('cannot create client with unsupported browser', (t) => {
  const originalRTC = (global as any).RTCPeerConnection;
  delete (global as any).RTCPeerConnection;
  delete (window as any).RTCPeerConnection;

  try {
    const error = t.throws<Error>(() =>
      createClientImpl(defaultUAFactory(), defaultTransportFactory()),
    );
    t.is(error?.message, 'unsupported_browser');
  } finally {
    (global as any).RTCPeerConnection = originalRTC;
    (window as any).RTCPeerConnection = originalRTC;
  }
});

test.serial('client is frozen', (t) => {
  // No need to stub checkRequired - test environment has complete browser API mocks
  const client = createClient();

  // Extending client is not allowed.
  const sym = Symbol();
  t.throws<TypeError>(() => (client[sym] = 123));
  t.false(sym in client);

  // Changing properties is not allowed.
  t.throws<TypeError>(() => (client.connect = null));
  t.true(client.connect !== null);
});
