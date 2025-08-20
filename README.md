# Anubot

My own private discord bot built with discord.js, featuring slash commands, XP/rank system, and moderation utilities.

## Features
- Slash commands: `/ping`, `/mute`, `/rank`, `/ban`, `/dice`
- XP system with SQLite database
- Easy command registration

## Setup
1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file in the root directory with the following variables:
   ```env
   DISCORD_TOKEN=your-bot-token-here
   CLIENT_ID=your-client-id-here
   GUILD_ID=your-guild-id-here
   XP_PER_MESSAGE=10
   ```
3. Register slash commands with Discord:
   ```bash
   npm run register
   ```
4. Start the bot:
   ```bash
   npm start
   ```

## Commands
- `/ping` - Replies with Pong!
- `/mute <user>` - Mutes a user in voice channels.
- `/ban <user> [reason]` - Bans a user from the server.
- `/rank` - Shows your XP and rank.
- `/dice` - Rolls a dice (1-6).

## XP System
- Users gain XP for each message sent (configurable via `.env`).
- XP is stored in an SQLite database (`xp.sqlite`).

## License
MIT
