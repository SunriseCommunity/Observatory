import { App } from '../../app';
import { axiosInstance } from '../../plugins/axios';
import { CoffeeService } from '../../services/coffee.service';

export default (app: App) => {
    app.use(axiosInstance)
        .decorate(({ applicationAxiosInstance }) => ({
            coffeeService: new CoffeeService(applicationAxiosInstance),
        }))
        .get('/', ({ coffeeService }) => coffeeService.get());

    return app;
};
