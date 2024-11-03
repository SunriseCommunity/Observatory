import type { App } from '../app';

export default (app: App) => {
    app.get('/', () => 'Hello, world!')

    return app;
};
