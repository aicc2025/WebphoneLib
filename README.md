# Open VoIP Alliance Webphone Lib

This project is a fork of the original unmaintained project at:
<https://github.com/open-voip-alliance/WebphoneLib.git>

## Introduction

WebphoneLib is a modern JavaScript library that makes VoIP calling easier by providing a clean layer of abstraction around SIP.js. It simplifies the complexity of WebRTC and SIP protocols, allowing developers to build powerful voice communication applications with minimal effort.

### Key Features

- **Easy-to-use API**: Modern JavaScript API with Promise-based design for seamless integration
- **Hot Audio Device Switching**: Switch audio input/output devices mid-call without interruption
- **Automatic Call Recovery**: Intelligently recovers active calls during connectivity loss
- **WebRTC Support**: Full WebRTC implementation with STUN/TURN server support
- **Session Management**: Complete call lifecycle management including hold, transfer, and DTMF
- **Real-time Statistics**: Monitor call quality with built-in MOS calculation and stats tracking
- **Type Safety**: Written in TypeScript with comprehensive type definitions

### Use Cases

- Web-based softphones and communication platforms
- Customer support and call center applications
- Click-to-call integration for websites
- Video conferencing platforms with audio fallback
- IoT and embedded device communication

## Requirements

- Node.js >= 22.0.0
- npm >= 10.0.0

## Getting started

```bash
$ git clone git@github.com:open-voip-alliance/WebphoneLib.git
$ cd WebphoneLib
$ touch demo/config.mjs
```

Add the following to `demo/config.mjs`

```javascript
export const authorizationUserId = <your-voip-account-id>;
export const password = '<your-voip-password>';
export const realm = '<realm>';
export const websocketUrl = '<websocketUrl>';
```

Run the demo-server:

```bash
$ npm i && npm run demo
```

And then play around at http://localhost:1235/demo/.

## Examples

### Connecting and registering

```javascript
import { Client } from 'webphone-lib';

const account = {
  user: 'accountId',
  password: 'password',
  uri: 'sip:accountId@<realm>',
  name: 'test',
};

const transport = {
  wsServers: '<websocket-url>', // or replace with your
  iceServers: [], // depending on if your provider needs STUN/TURN.
};

const media = {
  input: {
    id: undefined, // default audio device
    audioProcessing: true,
    volume: 1.0,
    muted: false,
  },
  output: {
    id: undefined, // default audio device
    volume: 1.0,
    muted: false,
  },
};

const client = new Client({ account, transport, media });

await client.register();
```

### Incoming call

```javascript
// incoming call below
client.on('invite', (session) => {
  try {
    ringer();

    let { accepted, rejectCause } = await session.accepted(); // wait until the call is picked up
    if (!accepted) {
      return;
    }

    showCallScreen();

    await session.terminated();
  } catch (e) {
    showErrorMessage(e)
  } finally {
    closeCallScreen();
  }
});
```

### Outgoing call

```javascript
const session = client.invite('sip:518@<realm>');

try {
  showOutgoingCallInProgress();

  let { accepted, rejectCause } = await session.accepted(); // wait until the call is picked up
  if (!accepted) {
    showRejectedScreen();
    return;
  }

  showCallScreen();

  await session.terminated();
} catch (e) {
} finally {
  closeCallScreen();
}
```

## Attended transfer of a call

```javascript
if (await sessionA.accepted()) {
  await sessionA.hold();

  const sessionB = client.invite('sip:519@<realm>');
  if (await sessionB.accepted()) {
    // immediately transfer after the other party picked up :p
    await client.attendedTransfer(sessionA, sessionB);

    await sessionB.terminated();
  }
}
```

## Audio device selection

#### Set a primary input & output device:

```javascript
const client = new Client({
  account,
  transport,
  media: {
    input: {
      id: undefined, // default input device
      audioProcessing: true,
      volume: 1.0,
      muted: false,
    },
    output: {
      id: undefined, // default output device
      volume: 1.0,
      muted: false,
    },
  },
});
```

#### Change the primary I/O devices:

```javascript
client.defaultMedia.output.id = '230988012091820398213';
```

#### Change the media of a session:

```javascript
const session = await client.invite('123');
session.media.input.volume = 50;
session.media.input.audioProcessing = false;
session.media.input.muted = true;
session.media.output.muted = false;
session.media.setInput({
  id: '120398120398123',
  audioProcessing: true,
  volume: 0.5,
  muted: true,
});
```

## Commands

| Command                   | Help                                                                            |
| ------------------------- | ------------------------------------------------------------------------------- |
| npm run docs              | Generate the docs                                                               |
| npm run test              | Run the tests                                                                   |
| npm run test -- --verbose | Show output of `console.log` during tests                                       |
| npm run test-watch        | Watch the tests as you make changes                                             |
| npm run build             | Build the projects                                                              |
| npm run prepare           | Prepare the project for publish, this is automatically run before `npm publish` |
| npm run lint              | Run `eslint` over the source files                                              |
| npm run typecheck         | Verifies type constraints are met                                               |

### Using docker

Add a .env file with the following:

```
USER_A = <user-a>
USER_B = <user-b>
PASSWORD_A = <password-user-a>
PASSWORD_B = <password-user-b>
NUMBER_A = <number-user-a>
NUMBER_B = <number-user-b>
WEBSOCKET_URL = <your-websocket-url>
REALM = <realm>
```

Then call `docker-compose up` to run the tests.

Note: Don't forget to call `npm ci` in the puppeteer folder. :)

### Without docker

If you don't want to use docker, you will need to run the demo with the `npm run demo` command (and keep it running) and run the tests with `npm run test:e2e`. For this you will need the .env file with your settings.
