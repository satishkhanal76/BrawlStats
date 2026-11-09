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
## Catalogue sync

Use **Actions → Sync brawler catalogue → Run workflow** on the default branch. The
default run only reports changes. Select **Open a draft pull request** to prepare CSV
updates. A run with no CSV changes reports missing artwork in the Actions summary.
Finish or close an existing sync PR before opening another.

Configure one source in **Settings → Secrets and variables → Actions**:

- Set the `BRAWL_CATALOGUE_URL` variable to a read-only HTTPS URL returning the full
  catalogue as an object with an `items` array. The existing `/bs/brawlers` route
  can serve as this source if it is deployed and returns the complete catalogue.
- Or set the `BRAWL_API_TOKEN` secret and run from an IP allowed by the API key.
  Standard GitHub-hosted runners use dynamic IPs. The direct API fetch follows
  pagination. A snapshot with an additional page is rejected.

To let the workflow open draft PRs, enable **Allow GitHub Actions to create and
approve pull requests** under **Settings → Actions → General → Workflow permissions**.
GitHub may also ask you to approve workflow runs for a PR opened by Actions.

The sync matches records by ID. It adds brawlers, gadgets and Star Powers, updates
names and item ownership when they change, and retains local rows absent from the
API. It preserves existing rarity and release settings. Gears and Hypercharges
are outside this sync.

Fill in the rarity for each new brawler using a value from `rarities.csv`, upload
the PNGs listed in the draft to the same branch, and review artwork for renamed
items. The PR check verifies that newly added entries have the required image
files and that new brawlers have valid rarities. Mark the PR ready for review once
these checks pass.

To preview from a saved API response or prepare the CSV changes on a local branch:

```sh
npm run sync:brawlers -- --preview /path/to/brawlers.json
npm run sync:brawlers -- --write /path/to/brawlers.json
```

Omit the file to fetch from the configured source or from the official API using
the token in your environment or `.env`.

Before retiring the production update form, verify that merging a catalogue PR
deploys the CSVs and images. The checked-in Azure workflow currently targets
`master`, so confirm which branch and deployment workflow production uses.
