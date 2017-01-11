const DDPClient = require('ddp');
import {parse} from 'url';
import {createHash} from 'crypto';

export interface LoginToken {
  id: string;
  token: string;
  tokenExpires: Date;
}

export class MeteorStressTest {
  private ddpClient;
  private subscriptions = {};
  private hash = createHash('sha256');

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

  connect(ddpUrl?: string): Promise<any> {
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

  disconnect() {
    return this.ddpClient.close();
  }

  unsubscribe(subscriptionName: string) {
    return this.ddpClient.unsubscribe(this.subscriptions[subscriptionName]);
  }

  subscribe(subscriptionName: string, ...args): Promise<any> {
    return new Promise((resolve, reject) => {
      let isDone = false;

      const result = this.ddpClient.subscribe(subscriptionName, args, (err) => {
        if (err) {
          reject(err);
        }
        else {
          isDone = true;
          resolve(result);
        }
      });

      this.subscriptions[subscriptionName] = result;
    });
  }
  
  call(methodName: string, ...args): Promise<any> {
    return new Promise((resolve, reject) => {
      this.ddpClient.call(methodName, args, (err, result) => {
        if (err) {
          reject(err);
        }
        else {
          resolve(result);
        }
      });
    });
  }
  
  login(username: string, email: string, password: string): Promise<LoginToken> {
    const user = this.getValidUser(email, username);
    return this.call('login', {
      user,
      password: this.hashPassword(password)
    });
  }
  
  getValidUser(email: string, username: string): {username?: string, email?: string} {
    if (username && typeof username === 'string' && username !== '') {
      return {username};
    }
    else if (email && typeof email === 'string' && email !== '') {
      return {email};
    } else {
      throw `You must provide either email or username`;
    }
  }
  
  hashPassword(password: string): {digest: string, algorithm: 'sha-256'} {
    this.hash.update(password);
    return {
      digest: this.hash.digest('hex'),
      algorithm: 'sha-256',
    };
  }

  get ddp() {
    return this.ddpClient;
  }
}
