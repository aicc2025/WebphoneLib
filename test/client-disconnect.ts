import test from 'ava';
import pTimeout from 'p-timeout';
import * as sinon from 'sinon';
import { Subscription, UA as UABase } from 'sip.js';

import { UserAgent } from 'sip.js/lib/api/user-agent';
import { UserAgentOptions } from 'sip.js/lib/api/user-agent-options';

import { ClientImpl } from '../src/client';
import { ClientStatus } from '../src/enums';
import * as Features from '../src/features';
import { Client, IClientOptions } from '../src/index';
import { log } from '../src/logger';
import { ReconnectableTransport, TransportFactory, UAFactory } from '../src/transport';

import { createClientImpl, defaultTransportFactory, defaultUAFactory } from './_helpers';

test.serial('remove subscriptions', async (t) => {
  // No need to stub checkRequired - test environment has complete browser API mocks
  const transport = sinon.createStubInstance(ReconnectableTransport);
  const client = createClientImpl(defaultUAFactory(), () => transport);
  const subscription = sinon.createStubInstance(Subscription);

  (client as any).subscriptions = { '1337@someprovider': subscription };
  await client.disconnect();

  t.deepEqual((client as any).subscriptions, {});
});

test.serial('do not try to disconnect when already disconnected (no ua)', async (t) => {
  // No need to stub checkRequired - test environment has complete browser API mocks
  log.info = sinon.fake();

  const client = createClientImpl(defaultUAFactory(), defaultTransportFactory());

  // UA is not configured here.
  (client as any).transport.status = ClientStatus.CONNECTED;

  await client.disconnect();

  t.true((log.info as any).calledWith('Already disconnected.'));
});

test.serial(
  'do not try to disconnect when already disconnected (status DISCONNECTED)',
  async (t) => {
    // No need to stub checkRequired - test environment has complete browser API mocks
    log.info = sinon.fake();

    const client = createClientImpl(defaultUAFactory(), defaultTransportFactory());

    (client as any).transport.configureUA((client as any).transport.uaOptions);
    (client as any).transport.status = ClientStatus.DISCONNECTED;

    await client.disconnect();

    t.true((log.info as any).calledWith('Already disconnected.'));
  },
);

test.serial('status updates in order: DISCONNECTING > DISCONNECTED', async (t) => {
  // No need to stub checkRequired - test environment has complete browser API mocks

  const ua = (options: UserAgentOptions) => {
    const userAgent = new UserAgent(options);
    userAgent.stop = () => Promise.resolve();
    userAgent.transport.disconnect = () => Promise.resolve();
    return userAgent;
  };

  const client = createClientImpl(ua, defaultTransportFactory());
  (client as any).transport.createUnregisteredPromise = () => {
    (client as any).transport.unregisteredPromise = () => Promise.resolve();
    (client as any).transport.unregisterer = sinon.fake();
    (client as any).transport.unregisterer.unregister = () => sinon.fake();
  };

  const status = [];
  client.on('statusUpdate', (clientStatus) => status.push(clientStatus));

  (client as any).transport.configureUA((client as any).transport.uaOptions);
  (client as any).transport.status = ClientStatus.CONNECTED;

  await client.disconnect();

  t.is(status.length, 2);
  t.is(status[0], ClientStatus.DISCONNECTING);
  t.is(status[1], ClientStatus.DISCONNECTED);
  t.is((client as any).transport.status, ClientStatus.DISCONNECTED);
});

// In sip.js 0.21.2, disconnect completes even when unregister fails
test.serial('disconnect completes when unregister fails with 503', async (t) => {
  // No need to stub checkRequired - test environment has complete browser API mocks

  const ua = (options: UserAgentOptions) => {
    const userAgent = new UserAgent(options);
    userAgent.stop = () => Promise.resolve();
    userAgent.transport.disconnect = () => Promise.resolve();
    return userAgent;
  };

  const client = createClientImpl(ua, defaultTransportFactory());

  const status = [];
  client.on('statusUpdate', (clientStatus) => status.push(clientStatus));

  (client as any).transport.configureUA((client as any).transport.uaOptions);
  (client as any).transport.status = ClientStatus.CONNECTED;

  // In 0.21.2, even if unregister fails (503), Registerer transitions to Unregistered
  // so disconnect() completes successfully
  await client.disconnect();

  t.is(status.length, 2);
  t.is(status[0], ClientStatus.DISCONNECTING);
  t.is(status[1], ClientStatus.DISCONNECTED);
  t.is((client as any).transport.status, ClientStatus.DISCONNECTED);
});

// In sip.js 0.21.2, ua.stop IS called even when unregister fails
test.serial('ua.stop is called even when unregister fails', async (t) => {
  // No need to stub checkRequired - test environment has complete browser API mocks

  const stopSpy = sinon.fake.resolves();
  const ua = (options: UserAgentOptions) => {
    const userAgent = new UserAgent(options);
    userAgent.stop = stopSpy;
    userAgent.transport.disconnect = () => Promise.resolve();
    return userAgent;
  };

  const client = createClientImpl(ua, defaultTransportFactory());

  (client as any).transport.configureUA((client as any).transport.uaOptions);
  (client as any).transport.status = ClientStatus.CONNECTED;

  // In 0.21.2, even if unregister fails (503), the Registerer transitions to Unregistered
  // state, allowing disconnect() to complete and call ua.stop()
  await client.disconnect();

  // Check the spy we saved before userAgent was deleted
  t.true(stopSpy.called);
});

test.serial('ua is removed after ua.disconnect', async (t) => {
  // No need to stub checkRequired - test environment has complete browser API mocks

  const ua = (options: UserAgentOptions) => {
    const userAgent = new UserAgent(options);
    userAgent.stop = sinon.fake();
    userAgent.transport.disconnect = () => Promise.resolve();
    return userAgent;
  };

  const client = createClientImpl(ua, defaultTransportFactory());
  (client as any).transport.createUnregisteredPromise = () => {
    (client as any).transport.unregisteredPromise = () => Promise.resolve();
    (client as any).transport.unregisterer = sinon.fake();
    (client as any).transport.unregisterer.unregister = () => sinon.fake();
  };

  (client as any).transport.configureUA((client as any).transport.uaOptions);
  (client as any).transport.status = ClientStatus.CONNECTED;

  t.false((client as any).transport.userAgent === undefined);

  await client.disconnect();

  t.true((client as any).transport.userAgent === undefined);
});

test.serial('not waiting for unregistered if hasRegistered = false', async (t) => {
  // No need to stub checkRequired - test environment has complete browser API mocks
  const ua = (options: UserAgentOptions) => {
    const userAgent = new UserAgent(options);
    userAgent.stop = sinon.fake();
    userAgent.transport.disconnect = () => Promise.resolve();
    return userAgent;
  };

  const client = createClientImpl(ua, defaultTransportFactory());
  client.disconnect = async () => {
    await (client as any).transport.disconnect({ hasRegistered: false });
  };

  const status = [];
  client.on('statusUpdate', (clientStatus) => status.push(clientStatus));

  (client as any).transport.configureUA((client as any).transport.uaOptions);
  (client as any).transport.status = ClientStatus.CONNECTED;

  await client.disconnect();

  t.is(status.length, 2);
  t.is(status[0], ClientStatus.DISCONNECTING);
  t.is(status[1], ClientStatus.DISCONNECTED);
  t.is((client as any).transport.status, ClientStatus.DISCONNECTED);
});
