import 'dotenv/config';
import { Client, Collection, GatewayIntentBits, Events } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sequelize, XP } from './models/xp.js';

/**
 * Validate required environment variables
 */
const requiredEnv = ['DISCORD_TOKEN', 'CLIENT_ID', 'GUILD_ID'];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const XP_PER_MESSAGE = parseInt(process.env.XP_PER_MESSAGE) || 10;

// __dirname workaround for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Initialize Sequelize database
 */
(async () => {
  try {
    await sequelize.sync();
    console.log('Database synced.');
  } catch (err) {
    console.error('Failed to sync database:', err);
    process.exit(1);
  }
})();

/**
 * Initialize Discord client with only necessary intents
 */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});
client.commands = new Collection();

// Dynamically load commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = await import(filePath);
  if ('data' in command.default && 'execute' in command.default) {
    client.commands.set(command.default.data.name, command.default);
  }
}

client.once(Events.ClientReady, () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  try {
    await command.execute(interaction, XP);
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'There was an error executing this command!', ephemeral: true });
    } else {
      await interaction.reply({ content: 'There was an error executing this command!', ephemeral: true });
    }
  }
});

client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return;
  try {
    const [userXP] = await XP.findOrCreate({ where: { user_id: message.author.id } });
    const oldXP = userXP.xp;
    const oldLevel = Math.floor(0.1 * Math.sqrt(oldXP));
    await XP.increment('xp', {
      by: XP_PER_MESSAGE,
      where: { user_id: message.author.id },
    });
    await userXP.reload();
    const newXP = userXP.xp;
    const newLevel = Math.floor(0.1 * Math.sqrt(newXP));
    if (newLevel > oldLevel) {
      await message.channel.send(`🎉 Congratulations <@${message.author.id}>, you leveled up to level ${newLevel}!`);
    }
  } catch (err) {
    console.error('XP DB error:', err);
  }
});

client.login(process.env.DISCORD_TOKEN);
