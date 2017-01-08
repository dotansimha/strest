export const ScenarioReport = (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
  target.$$scenarioReport = target[propertyKey];
};
