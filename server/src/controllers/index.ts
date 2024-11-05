import type { App } from '../app';

export default (app: App) => {
    app.get('/', () => 'Hello, friend! 🔭', {
        tags: ['General'],
    });

    return app;
};
