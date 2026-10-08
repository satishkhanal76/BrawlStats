# BrawlStats

A web application for viewing Brawl Stars player statistics and brawler information.

The project combines the official Brawl Stars API with locally maintained game data and assets to create a richer player-statistics experience than simply displaying the API response.

## Features

- Search for a Brawl Stars player by player tag
- Display player statistics
- Display the player's brawlers and their progression
- Separate unlocked, remaining, and arriving brawlers
- Display brawler rarities, gadgets, and Star Powers
- Sort brawlers by trophies, rarity, or ID
- Display locally stored brawler artwork and item artwork
- Combine live API information with locally stored game data
- Fall back to a stored player snapshot when the live API is unavailable
- Convert local CSV game data into JSON through server endpoints
- Administrative interface for updating brawler data and associated assets

## Architecture

BrawlStats uses a small client/server architecture.

```text
                    ┌────────────────────┐
                    │      Browser       │
                    │                    │
                    │ HTML / CSS / JS    │
                    └─────────┬──────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │   Express Server   │
                    │                    │
                    │ API routes         │
                    │ CSV conversion     │
                    │ fallback handling  │
                    └───────┬─────┬──────┘
                            │     │
                 ┌──────────┘     └───────────┐
                 ▼                            ▼
        ┌─────────────────┐          ┌─────────────────┐
        │ Brawl Stars API │          │ Local Game Data │
        │                 │          │                 │
        │ Player data     │          │ CSV files       │
        │ Brawler data    │          │ Images          │
        └─────────────────┘          └─────────────────┘
```

The server acts as the boundary between the browser and the external Brawl Stars API. The API token remains server-side rather than being exposed to client JavaScript.

## Data Model

The application does not treat a Brawl Stars API response as the complete source of truth as some of the data are missing.

Instead, it combines different types of information.

### Live Data

The server requests player and brawler information from the Brawl Stars API.

### Local Data

Game metadata such as:

- brawler names
- rarities
- gadgets
- Star Powers
- IDs
- availability information

is maintained in local CSV files.

The server can expose those CSV files as JSON endpoints, allowing the browser to consume them using the same `Api` abstraction used for other requests.

### Local Assets

Brawler portraits, gadget images, and Star Power images are stored locally and referenced by their IDs.

This makes the presentation independent from the availability of external image URLs.

## Client Architecture

The browser uses a class-based model for organizing the data.

```text
Character
   │
   └── PlayerCharacter

Characters
   │
   └── PlayerCharacters

Item
   │
   ├── Gadget
   └── Star Power
```

`PlayerCharacters` extends `Characters`, reusing the logic for loading and constructing the complete brawler catalogue before adding player-specific information such as trophies, power, and progression.

A small `Element` abstraction is also used throughout the newer client-side classes to simplify DOM creation and composition.

## Fallback Data

Player requests have a fallback mechanism.

If the live Brawl Stars API request fails, the server loads `default-player.json` and returns it in the same general `Player` representation.

The response identifies that it is fallback data and includes the reason for the failure, allowing the client to notify the user rather than simply failing to render the page.

This allows the application to remain demonstrable even when the external API is temporarily unavailable.

## Updating Game Data

The project includes an administrative update page for adding or modifying brawlers.

The update system can modify:

- brawler metadata
- rarity
- availability
- gadgets
- Star Powers
- portraits
- gadget images
- Star Power images

The server updates the corresponding CSV records and stores the uploaded images using their IDs. Administrative requests are password-protected and rate-limited.

## Running Locally

Install the dependencies:

```bash
npm install
```

Create a `.env` file containing the required environment variables, including the Brawl Stars API token and server configuration.

Start the development server:

```bash
npm run dev
```

Or start the production server:

```bash
npm start
```

The default port is `3000` unless `PORT` is configured otherwise.

## Project Structure

```text
BrawlStats/
├── public/
│   ├── assets/
│   │   ├── brawler_portraits/
│   │   ├── gadgets/
│   │   ├── star-powers/
│   │   ├── csv/
│   │   └── json/
│   ├── css/
│   ├── js/
│   │   ├── class/
│   │   └── classes/
│   ├── index.html
│   ├── player.html
│   ├── brawlers.html
│   └── update.html
├── server/
│   ├── classes/
│   │   ├── Api.js
│   │   └── Player.js
│   └── app.js
└── package.json
```

## Technologies

- JavaScript
- HTML5
- CSS
- Node.js
- Express
- Brawl Stars API
- CSV data
- `node-fetch`
- `csvtojson`
- `multer`
- `dotenv`