import '../polyfills/fetch';

import {TransportInterface} from '@accounts/client';
import {LoginReturnType} from '@accounts/common';
import {MeteorStressTest, LoginToken} from './meteor'; 

export class MeteorJSAccountsStressTest extends MeteorStressTest {

  private accountsTransport: TransportInterface;
  private clientOrigin: string | null;

  configureAccountsClient(accountsTransport: TransportInterface, origin?: string) {
    this.accountsTransport = accountsTransport;
    this.clientOrigin = origin;
  }

  connect(ddpUrl?: string): Promise<any> {
    return super.connect(ddpUrl);
  }

  disconnect() {
    return super.disconnect();
  }
  
  login(username: string, email: string, password: string): Promise<LoginToken> {
    const user = super.getValidUser(email, username);
    const headers = { origin: this.clientOrigin };
  
    return this.accountsTransport.loginWithPassword(user, password, headers)
      .then(this.transformToLoginToken)
      .then(res => Promise.all([
        // We resolve with the result so we can keep the original function signature
        // and still wait for the meteor call to return.
        Promise.resolve(res),
        super.call('jsaccounts/validateLogin', res.token),
      ]))
      // Making sure just the result object is returned
      .then(([res]) => res);
  }

  private transformToLoginToken(loginResult: LoginReturnType): LoginToken {
    return {
      id: loginResult.user.id,
      token: loginResult.tokens.accessToken,
      tokenExpires: new Date(),
    };
  }
}
