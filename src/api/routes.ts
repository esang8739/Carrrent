import { FastifyInstance, RouteShorthandOptions } from 'fastify';
import { logger } from '../utils/logger.js';

const apiLogger = logger.child('api');

export interface ApiRoute {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  handler: (request: unknown, reply: unknown) => Promise<unknown>;
  options?: RouteShorthandOptions;
}

export class ApiRouter {
  private routes: ApiRoute[] = [];

  register(route: ApiRoute): void {
    this.routes.push(route);
    apiLogger.info('Route registered', { method: route.method, path: route.path });
  }

  async mount(app: FastifyInstance): Promise<void> {
    for (const route of this.routes) {
      await app.route({
        method: route.method,
        url: route.path,
        handler: route.handler as never,
        ...route.options,
      });
    }
    apiLogger.info('All routes mounted', { count: this.routes.length });
  }

  getRoutes(): ApiRoute[] {
    return [...this.routes];
  }
}

export const router = new ApiRouter();
export default router;
