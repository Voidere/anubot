import 'dotenv/config';
import { REST, Routes } from 'discord.js';

const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;
const token = process.env.DISCORD_TOKEN;

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    // Delete all guild-based commands
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] });
    console.log('Successfully deleted all guild commands.');
    // Delete all global commands
    await rest.put(Routes.applicationCommands(clientId), { body: [] });
    console.log('Successfully deleted all application (global) commands.');
  } catch (error) {
    console.error(error);
  }
})();
