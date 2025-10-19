import pTimeout from 'p-timeout';
import { Core, UserAgent } from 'sip.js';

export class HealthChecker {
  private optionsTimeout: ReturnType<typeof setTimeout>;
  private logger: Core.Logger;

  constructor(private userAgent: UserAgent) {
    this.logger = userAgent.userAgentCore.loggerFactory.getLogger('socket-health-checker');
  }

  public stop(): void {
    clearTimeout(this.optionsTimeout);
  }

  /**
   * Start a periodic OPTIONS message to be sent to the sip server, if it
   * does not respond, our connection is probably broken.
   */
  public start(): any {
    return pTimeout(
      new Promise<void>((resolve) => {
        clearTimeout(this.optionsTimeout);
        this.userAgent.userAgentCore.request(this.createOptionsMessage(), {
          onAccept: () => {
            resolve();
            this.optionsTimeout = setTimeout(() => {
              this.start();
            }, 22000);
          },
        });
      }),
      {
        milliseconds: 2000, // if there is no response after 2 seconds, trigger disconnect.
        fallback: () => {
          this.logger.error('No response after OPTIONS message to sip server.');
          clearTimeout(this.optionsTimeout);
          // In sip.js 0.21.2, trigger disconnect which will update transport state
          this.userAgent.transport.disconnect().catch((err) => {
            this.logger.error(`Failed to disconnect transport: ${err}`);
          });
        },
      },
    );
  }

  private createOptionsMessage() {
    const settings = {
      params: {
        toUri: this.userAgent.configuration.uri,
        cseq: 1,
        fromUri: this.userAgent.userAgentCore.configuration.aor,
      },
      registrar: undefined,
    };

    /* If no 'registrarServer' is set use the 'uri' value without user portion. */
    if (!settings.registrar) {
      let registrarServer: any = {};
      if (typeof this.userAgent.configuration.uri === 'object') {
        registrarServer = this.userAgent.configuration.uri.clone();
        registrarServer.user = undefined;
      } else {
        registrarServer = this.userAgent.configuration.uri;
      }
      settings.registrar = registrarServer;
    }

    return this.userAgent.userAgentCore.makeOutgoingRequestMessage(
      'OPTIONS',
      settings.registrar,
      settings.params.fromUri,
      settings.params.toUri ? settings.params.toUri : settings.registrar,
      settings.params,
    );
  }
}
