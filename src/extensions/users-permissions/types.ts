export interface StrapiPlugin {
  config: any;
  policies: any;
  controllers: {
    auth: {
      forgotPassword: (ctx: any) => Promise<any>;
      resetPassword: (ctx: any) => Promise<any>;
    };
  };
  routes: {
    'content-api': {
      routes: StrapiRoute[];
    };
  };
}

export interface StrapiRoute {
  handler: string;
  config: {
    auth: boolean;
    policies: string[];
    middlewares: string[];
  };
}

export interface PolicyContext {
  action: string;
  state: {
    user?: any;
  };
}











