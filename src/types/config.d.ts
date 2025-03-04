declare module 'config' {
  interface IConfig {
    viewport: {
      width: number;
      height: number;
    };
  }

  const config: Config;
  interface Config {
    get<T>(setting: string): T;
    has(setting: string): boolean;
  }
  
  export = config;
} 