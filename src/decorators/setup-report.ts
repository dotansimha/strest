export const SetupReport = (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
  target.$$setupReport = target[propertyKey];
};
