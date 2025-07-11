# 🔭 Observatory - Powerful beatmap manager for osu!

<p align="center">
  <img src="./readme.png" alt="We don't own the rights to this image. If you are the owner and want it removed, please contact us." />
</p>

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![GitHub stars](https://img.shields.io/github/stars/SunriseCommunity/Observatory.svg?style=social&label=Star)](https://github.com/SunriseCommunity/Observatory)

## Description

Observatory is a powerful "on demand" beatmap manager which uses osu! API and popular beatmap mirrors to prioritize speed and efficiency. It fetches beatmaps from the API's, and stores them in a local database for faster access.

## Features

-   [x] **Plug and Use**: Just compile the docker image and run it. No need to worry about dependencies.
-   [x] **Don't fret about rate limits**: Rate limits are handled by the application, so peppy or beatmap mirror's owners won't get angry at you.
-   [x] **Fastest wins the race**: The application is designed to prioritize the fastest API's first to provide the best experience.
-   [x] **Long and reliable memory**: The application saves the data in database to avoid unnecessary API calls, also including TTL (time-to-live) for the data to be reliable.
-   [x] **Everyone loves caching**: We also have a caching layer between the requests and our database, which allows processing requests _blazingly_ fast.
-   [x] **Perfomance Points calculation**: If you're frequently calculating pp, you can use the `/calculator` endpoint, which utilizes [rosu-pp-js](https://github.com/MaxOhn/rosu-pp-js) to compute pp, star rating and other related data.

## Installation 📩

### Docker 🐳

1. Fill the `.env` file with the required data

2. Run the following command:

```bash
docker compose -f docker-compose.yml up -d # Creates the container with app and all dependencies
```

3. The application will be available at `http://localhost:3333`

### Manual 🛠

1. Clone the repository
2. Install the required dependencies: `bun install`
3. Fill the `.env` file with the required data
4. Start needed services: `bun run setup`
5. Run the application: `bun run dev`
6. The application will be available at `http://localhost:3333` (or any other port you set up to)

## Contributing 💖

If you want to contribute to the project, feel free to fork the repository and submit a pull request. We are open to any
suggestions and improvements.

## License

This project is licensed under the MIT License. See the [LICENSE](../LICENSE) file for more details.
