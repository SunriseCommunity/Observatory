# 🔭 Observatory - Powerful beatmap manager for osu!

<p align="center">
  <img src="./readme.png" alt="We don't own the rights to this image. If you are the owner and want it removed, please contact us." />
</p>

## Description

Observatory is a powerful beatmap manager which uses osu! API and popular beatmap mirrors to prioritize speed and efficiency. It provides data "on demand" and saves it locally to avoid unnecessary API calls, thus saving time and resources.

## Features

-   [ ] **Plug and Play**: Just compile the docker image and run it. No need to worry about dependencies.
-   [x] **Don't fret about rate limits**: Rate limits are handled by the application, so peppy or beatmap mirror's owners won't get angry at you.
-   [x] **Fast**: The application is designed to prioritize the fastest API's first to provide the best experience.
-   [ ] **Database**: The application saves the data locally to avoid unnecessary API calls.
-   [ ] **Cache**: Will be implemented maybe? Need to think about it. -r

## Installation 📩

### Docker 🐳

1. Fill the `.env` file with the required data

2. Run the following command:

```bash
docker compose -f docker-compose.yml up -d # Creates the container with app and all dependencies
```

3. The application will be available at `http://localhost:3000`

### Manual 🛠

```bash
docker compose -f docker-compose.dev.yml up -d # Creates the container with needed dependencies (db, grafana, etc.)
```

1. Clone the repository
2. Install the required dependencies: `bun install`
3. Fill the `.env` file with the required data
4. Run the application: `bun run dev` or `bun run start`
5. The application will be available at `http://localhost:3000`

## Contributing 💖

If you want to contribute to the project, feel free to fork the repository and submit a pull request. We are open to any
suggestions and improvements.

## License

This project is licensed under the MIT License. See the [LICENSE](../LICENSE) file for more details.
