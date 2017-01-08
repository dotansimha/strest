export const TeardownReport = (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
  target.$$teardownReport = target[propertyKey];

};
