export const Teardown = (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
  target.$$teardown = target[propertyKey];
};
