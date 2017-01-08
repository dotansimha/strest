/// <reference path="node_modules/meteor-typings/1.3/main.d.ts" />

declare module 'ddp' {
  import * as DDP from 'meteor/ddp';

  export = DDP.DDP.DDPStatic;
}
