# Data and API

BrawlStats uses several different data sources rather than treating the external Brawl Stars API as the application's only source of information.

This allows live player information, static game metadata, and local visual assets to work together.

## 1. Data Sources

There are four main sources:

```text
┌──────────────────────┐
│ Brawl Stars API      │
│ Live player/brawler  │
│ information          │
└──────────┬───────────┘
           │
           │
┌──────────▼───────────┐
│ Local CSV Data       │
│ Game metadata        │
└──────────┬───────────┘
           │
           │
┌──────────▼───────────┐
│ Local JSON           │
│ Fallback snapshot    │
└──────────┬───────────┘
           │
           │
┌──────────▼───────────┐
│ Local Assets         │
│ Images / fonts        │
└──────────────────────┘
```

## 2. Live Player Data

A player search is exposed through:

```text
GET /api/player/:tag
```

The server normalizes the supplied tag and requests the corresponding player from the official Brawl Stars API.

The API token is read from the server environment:

```text
.env
 │
 ▼
process.env.BRAWL_API_TOKEN
 │
 ▼
server/classes/Api.js
 │
 ▼
Authorization header
```

The token is therefore not embedded in the client-side JavaScript.

## 3. Player Transformation

The raw response is converted into a `Player` object.

The model selects the properties required by the application:

```text
API response
     │
     ▼
Player
 ├── tag
 ├── name
 ├── icon
 ├── nameColor
 ├── trophies
 ├── experience
 ├── victories
 ├── brawlers
 └── club
```

The server also records when the player data was obtained.

## 4. Brawler Data

Brawler information comes from two complementary sources.

The Brawl Stars API provides the current list of brawlers, while local CSV data provides additional application-specific information.

The `/api/brawlers` endpoint combines them by ID.

```text
             API
              │
              │ id
              ▼
        ┌─────────────┐
        │ Brawler     │
        │             │
        │ live data   │
        │ + metadata  │
        └─────────────┘
              ▲
              │
              │ id
              │
        characters.csv
```

The server finds the corresponding CSV record and merges its properties into the API object.

## 5. CSV Data

The project contains a large collection of CSV files under:

```text
public/assets/csv/
```

These include data such as:

- characters
- rarities
- gadgets
- Star Powers
- maps
- locations
- skins
- game modes
- resources
- rankings
- themes
- effects
- sounds
- and other game configuration data

The server exposes CSV files through routes and converts them to JSON using `csvtojson`.

For example:

```text
GET /api/csv/characters
GET /api/csv/rarities
GET /api/csv/gadgets
GET /api/csv/star-powers
```


This provides a simple way for browser code to consume the local data without implementing CSV parsing itself.

## 6. Player Brawler Composition

The player response contains only the brawlers owned by that player.

The application also needs the complete catalogue of brawlers in order to determine which brawlers are:

- unlocked
- remaining
- arriving soon

`PlayerCharacters` therefore performs a join between the complete catalogue and the player's brawler list.

```text
Complete Catalogue
        │
        │
        ├───────────────┐
        │               │
        ▼               ▼
     Unlocked        Remaining
        │
        ▼
 PlayerCharacter
```

The implementation creates a `Map` from player brawler IDs and uses those IDs to match against the catalogue.

This is important because it avoids treating the player's API response as a complete brawler catalogue.

## 7. Item Composition

Gadgets and Star Powers are stored separately from the main character records.

When a `Character` is created, it receives the associated item arrays and converts them into `Item` instances.

Each item receives an image path derived from its ID:

```text
Gadget ID
   │
   ▼
assets/gadgets/<id>.png
```

and:

```text
Star Power ID
   │
   ▼
assets/star-powers/<id>.png
```


This keeps item metadata and item presentation connected through a stable identifier.

## 8. Unlock State

For player-specific brawlers, the application also determines which gadgets and Star Powers have been unlocked.

`PlayerCharacters` compares the complete item list against the player's owned item list and adds an `unlocked` property.

```text
All Items
    │
    ├── owned by player → unlocked: true
    │
    └── not owned       → unlocked: false
```

The same `Item` class can then render either state.

This keeps the concept of an item separate from the question of whether a particular player owns it.

## 9. Brawler Availability

The application recognizes more than simply "owned" and "not owned."

A brawler can also be marked as:

- disabled
- arriving soon
- available

`PlayerCharacters` checks the arrival state and moves appropriate brawlers into the arriving collection.

Arrival timestamps are normalized so both second-based and millisecond-based timestamps can be interpreted.

## 10. Fallback Player Snapshot

The project includes:

```text
public/assets/json/default-player.json
```

as a stored player snapshot.

When the external API fails, the server loads this file and converts it through the same `Player` model used for live data.

The response includes metadata identifying the response as fallback data.

```text
Live request
     │
     ├── success ──► live Player
     │
     └── failure ──► default-player.json
                          │
                          ▼
                       Player
```


The client checks this flag and alerts the user that the snapshot is being displayed.

This means the UI does not need a separate "offline player" implementation.

## 11. Data Freshness

Live data and fallback data have different timestamps.

For live data, the server's `Player` model records the time it was created.

For fallback data, the application preserves the snapshot's existing backup timestamp rather than pretending that the snapshot was just fetched.

This distinction is exposed to the client as `backUpTime` and displayed in the player information section.

## 12. Administrative Updates

The project contains an administrative workflow for updating brawler data.

An administrator can submit:

```text
Brawler
├── ID
├── Name
├── Rarity
├── Disabled state
├── Arrival state
└── Arrival time

Gadgets
├── ID
├── Name
└── Image

Star Powers
├── ID
├── Name
└── Image

Brawler
└── Portrait
```

The form sends the data as `multipart/form-data` to:

```text
POST /api/admin/brawler
```


The server then updates the appropriate CSV files and writes the uploaded images to their ID-based asset paths.

## 13. CSV Upsert

The update system uses an `upsertCSVRow()` helper.

Its behavior is:

```text
Find row with matching ID
        │
   ┌────┴────┐
   │         │
 found     missing
   │         │
   ▼         ▼
replace    append
```

This allows the same update endpoint to handle both adding a new brawler and modifying an existing one.

## 14. Image Storage

Images are stored using their game IDs.

For example:

```text
brawler_portraits/
    <brawlerId>.png

gadgets/
    <gadgetId>.png

star-powers/
    <starPowerId>.png
```

This provides a deterministic relationship between game data and visual assets.

The client can therefore construct an image path from the item's ID without requiring another image lookup service.

## 15. Why This Data Architecture Matters

The application deliberately separates:

**Live player state**

from:

**Static game metadata**

from:

**Visual assets**

from:

**Fallback state**

That separation makes the application resilient to changes in any individual source.

For example, a player can still be represented using a local snapshot if the live API is unavailable, while the local brawler catalogue can continue to provide portraits, rarities, gadgets, and Star Powers.

The application therefore behaves more like a small data-composition system than a simple API viewer.