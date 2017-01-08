import * as DDPClient from 'ddp';
import {parse} from 'url';

export class MeteorStressTest {
  private ddpClient: DDPClient;

  urlToDDPOptions(url) {
    let parsedUrl = parse(url);
    let pathname = parsedUrl.pathname.substr(1);

    let isSsl = /^https/.test(parsedUrl.protocol);
    let port = Number(parsedUrl.port);

    if (!port) {
      port = (isSsl) ? 443 : 80;
    }

    return {
      path: pathname,
      host: parsedUrl.hostname,
      port: port,
      use_ssl: isSsl
    };
  }

  connect(ddpUrl?: string): Promise<DDPClient> {
    return new Promise((resolve, reject) => {
      this.ddpClient = new DDPClient(this.urlToDDPOptions(ddpUrl));
      this.ddpClient.connect((error) => {
        if (error) {
          reject(error);

          return;
        }

        resolve(this.ddpClient);
      });
    });
  }

  get ddp() {
    return this.ddpClient;
  }
}
