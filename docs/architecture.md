# Architecture

BrawlStats is organized around a client/server boundary and a data-composition model.

The application receives some information from the live Brawl Stars API while maintaining additional game metadata locally. The client then combines those sources into richer domain objects before rendering them.

This is particularly useful for a game whose live API provides player-specific information while other presentation data—such as portraits, rarities, gadgets, and Star Powers—can be maintained locally.

## 1. High-Level Architecture

```text
                         Browser
                            │
             ┌──────────────┴──────────────┐
             │                             │
             ▼                             ▼
       Page / Scripts                 Client Classes
             │                             │
             └──────────────┬──────────────┘
                            │
                            ▼
                         Api
                            │
                            ▼
                    Express Server
                     /     |      \
                    /      |       \
                   ▼       ▼        ▼
             Brawl API   CSV Data   Fallback
                           │
                           ▼
                         Assets
```

The browser never needs to know how the Brawl Stars API is authenticated. Requests go through the Express server, which owns the API token and communicates with the external service.

## 2. Server Layer

The server is centered around `server/app.js`.

Express serves the static frontend and exposes API routes.

### Static Files

The server exposes the `public/` directory directly:

```text
public/
├── HTML
├── CSS
├── JavaScript
└── assets
```

This allows the same Express application to serve both the frontend and backend API.

### Brawl Stars API Proxy

Player requests follow this path:

```text
Browser
   │
   │ GET /api/player/:tag
   ▼
Express
   │
   │ normalize tag
   ▼
API class
   │
   │ Authorization: Bearer <server token>
   ▼
Brawl Stars API
   │
   ▼
Player data
   │
   ▼
Player model
   │
   ▼
Browser
```

The player tag is normalized on the server before being inserted into the external API URL. The API token is read from the environment rather than being sent to the browser.

## 3. Server API Abstraction

`server/classes/Api.js` encapsulates communication with the Brawl Stars API.

It stores:

- the API URL
- the API token

and provides a single method for performing the request.

This keeps authentication and external-request configuration out of the individual Express routes.

## 4. Server Player Model

`server/classes/Player.js` transforms the raw Brawl Stars player response into the representation used by the application.

Instead of forwarding the entire API response unchanged, the model explicitly selects the properties the application needs:

```text
Raw API Player
       │
       ▼
    Player
       │
       ├── tag
       ├── name
       ├── trophies
       ├── victories
       ├── brawlers
       └── club
```

The model also records an update timestamp.

This creates a boundary between the external API's schema and the application's internal representation.

## 5. Local Data API

BrawlStats also treats local CSV files as data sources.

For example:

```text
/api/csv/characters
/api/csv/rarities
/api/csv/gadgets
/api/csv/star-powers
```

The server reads the corresponding CSV file, converts it to JSON using `csvtojson`, and returns the result to the browser.

This is useful because the browser can consume both external and local data through the same conceptual interface.

## 6. Combining Data Sources

The `/api/brawlers` endpoint demonstrates the application's data-composition approach.

The server obtains the current brawler list from the Brawl Stars API and then reads local `characters.csv`.

It matches the two datasets by brawler ID:

```text
Brawl Stars API
      │
      │ brawler ID
      ▼
┌───────────────┐
│ Match records │
└───────┬───────┘
        │
        ▼
API Brawler + Local Metadata
        │
        ▼
Combined Brawler
```

The local record is merged into the API object before the result is returned.

This allows the application to augment live API information with locally maintained metadata.

## 7. Client API Abstraction

The browser has its own `Api` class.

Its responsibility is different from the server's API class.

The browser-side class:

- stores a request URL
- performs `fetch()`
- checks the response status
- parses the response
- stores the resulting response
- exposes the request Promise

This provides a common mechanism for client-side requests.

The result is a simple boundary:

```text
Page / Class
     │
     ▼
  Client Api
     │
     ▼
Express Route
     │
     ▼
Data Source
```

## 8. Character Hierarchy

One of the more significant design decisions is the use of inheritance for the brawler data model.

The base class is `Character`.

It represents information common to a brawler regardless of whether the brawler belongs to a specific player.

```text
Character
├── identity
├── availability
├── portrait
├── rarity
├── gadgets
└── Star Powers
```

`PlayerCharacter` extends `Character` with player-specific information:

```text
PlayerCharacter
├── Character
├── power
├── trophies
├── highest trophies
├── current win streak
├── maximum win streak
└── prestige level
```

The subclass calls the base implementation and then adds its own fields and DOM representation.

This means the application does not need two completely independent implementations for general brawlers and player-owned brawlers.

## 9. Collection Hierarchy

The same idea is used one level above the individual brawler.

`Characters` manages the complete brawler catalogue.

`PlayerCharacters` extends it for player-specific organization.

```text
Characters
│
├── load game metadata
├── create Character objects
├── remove disabled characters
└── render characters
        │
        ▼
PlayerCharacters
│
├── inherit catalogue loading
├── match player brawlers
├── mark unlocked items
├── separate unlocked/remaining
└── identify arriving brawlers
```

`PlayerCharacters` constructs a `Map` keyed by brawler ID to efficiently match the player's brawler records against the complete catalogue.

This is a particularly useful separation because the application can maintain one canonical catalogue while layering player-specific state on top of it.

## 10. Items

Gadgets and Star Powers are represented through the reusable `Item` class.

Rather than creating separate rendering implementations for each type, `Character` creates `Item` objects and supplies the appropriate asset path.

```text
Character
   │
   ├── Item → Gadget
   └── Item → Star Power
```

`Item` handles common properties such as ID, name, image, and unlocked state.

This makes the item system easy to extend with another brawler-associated item type.

## 11. DOM Abstraction

The newer client architecture includes an `Element` class.

Instead of repeatedly writing:

```text
document.createElement(...)
element.append(...)
element.setAttribute(...)
```

the application wraps DOM elements in an `Element` object.

The abstraction handles:

- element creation
- attributes
- text nodes
- parent relationships
- child elements
- append/prepend operations


The result is that higher-level classes such as `Character`, `PlayerCharacter`, `PlayerInfo`, and `Item` can describe their UI as a hierarchy of `Element` objects.

## 12. Player Data Flow

A player search begins on `index.html`.

```text
Player enters tag
       │
       ▼
player.html?tag=...
       │
       ▼
player.js
       │
       ▼
Api.get()
       │
       ▼
/api/player/:tag
       │
       ▼
Brawl Stars API
       │
       ▼
Player model
       │
       ▼
playerData
       │
       ├───────────────┐
       ▼               ▼
 PlayerInfo      PlayerCharacters
                       │
                       ▼
                Local game metadata
                       │
                       ▼
                 Brawler catalogue
                       │
                       ▼
                 Player-specific
                    state
```

`player.js` coordinates the process but delegates actual representation to `PlayerInfo` and `PlayerCharacters`.

## 13. Fallback Architecture

The player API has an explicit failure path.

```text
              Live API
                 │
           ┌─────┴─────┐
           │           │
        success       failure
           │           │
           ▼           ▼
       Player       default-player.json
           │           │
           └─────┬─────┘
                 ▼
             Response
                 │
                 ▼
              Browser
```

The fallback snapshot is converted through the same `Player` model.

The response also includes:

- `isFallbackData`
- `fallbackReason`
- `backUpTime`

The client checks `isFallbackData` and informs the user that a stored snapshot is being displayed.

This is preferable to creating a completely separate rendering path for offline/error data.

## 14. Administrative Data Pipeline

The project also contains a small content-management workflow.

```text
Admin Form
    │
    │ multipart/form-data
    ▼
/api/admin/brawler
    │
    ├── password check
    ├── rate limit
    ├── CSV update
    └── image update
          │
          ▼
       Local Data
```

The update page allows a brawler and its associated gadgets, Star Powers, and images to be updated together.

The server uses `multer`'s memory storage to receive the uploaded files and writes the image buffers to the corresponding asset directories.

CSV records are updated through an `upsertCSVRow()` helper: an existing row with the same ID is replaced, otherwise a new row is appended.

## 15. Extensibility

The architecture has several natural extension points.

### New Player Information

Additional player statistics can be added to `PlayerInfo` without changing the request mechanism.

The `PlayerInfoStat` class already provides a reusable representation for individual statistics.

### New Brawler Properties

Common brawler properties belong in `Character`.

Player-specific properties belong in `PlayerCharacter`.

This avoids mixing global catalogue information with player state.

### New Brawler-Associated Items

The existing `Item` abstraction can represent additional item types without requiring a completely new rendering system.

### New Data Sources

The `Api` abstraction allows another endpoint to be consumed using the same request pattern.

### New Pages

The application already separates pages such as player statistics, brawler information, and administrative updates. New pages can reuse the existing client classes rather than duplicating data-fetching logic.

### New Local Metadata

Additional CSV datasets can be exposed through server routes and consumed by the client in the same way as the existing rarity, gadget, and Star Power data.

## 16. Overall Design

The application can be viewed as four cooperating layers:

```text
┌─────────────────────────────────────────┐
│                Presentation              │
│          HTML / CSS / Element            │
├─────────────────────────────────────────┤
│              Domain Models               │
│ Character / PlayerCharacter / Item       │
├─────────────────────────────────────────┤
│             Data Composition             │
│ PlayerCharacters / Characters / Api      │
├─────────────────────────────────────────┤
│              Data Sources                │
│ Brawl API / CSV / JSON / Assets         │
└─────────────────────────────────────────┘
```

The most important architectural characteristic is that the application does not rely on a single data source.

Instead, it builds a useful representation of the game by combining live player information with locally maintained game metadata and assets.