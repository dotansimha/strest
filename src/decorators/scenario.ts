export const Scenario = (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
  target.$$scenario = target[propertyKey];
};
