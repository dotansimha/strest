declare module '@accounts/common' {
  export type HashAlgorithm = 'sha' | 'sha1' | 'sha224' | 'sha256' | 'sha384' | 'sha512' | 'md5' | 'ripemd160';
  
  export type PasswordType = string | {
    digest: string,
    algorithm: HashAlgorithm
  };

  export interface UserObjectType {
    id: string,
    username: string
    email: string
    emails?: Object[]
    profile?: Object
    services?: Object
  }
  
  export interface TokensType {
    accessToken?: string,
    refreshToken?: string
  }
  
  export interface LoginReturnType {
    sessionId: string,
    user: UserObjectType,
    tokens: TokensType
  }

  export interface LoginUserIdentityType {
    id?: string
    username?: string
    email?: string
  }

  export type PasswordLoginUserType = string | LoginUserIdentityType;
}

declare module '@accounts/client' {
  import { LoginReturnType, PasswordLoginUserType, PasswordType } from '@accounts/common';

  export interface TransportInterface {

    loginWithPassword(user: PasswordLoginUserType, password: PasswordType, customHeaders?: Object): Promise<LoginReturnType>
  }
}