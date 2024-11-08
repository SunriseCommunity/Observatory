import type { App } from '../app';

export default (app: App) => {
    app.get('/', ({ redirect }) => {
        return redirect('/docs');
    });

    return app;
};
