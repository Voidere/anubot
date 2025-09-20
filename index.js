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
  // Restrict commands to COMMANDS_CHANNEL_ID unless admin
  if (
    interaction.channel.id !== COMMANDS_CHANNEL_ID &&
    !(ADMIN_ROLE_ID && interaction.member && interaction.member.roles.cache.has(ADMIN_ROLE_ID))
  ) {
    return interaction.reply({ content: `You can only use commands in the designated channel.`, ephemeral: true });
  }
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

const LEVELUP_CHANNEL_ID = process.env.LEVELUP_CHANNEL_ID;
const COMMANDS_CHANNEL_ID = process.env.COMMANDS_CHANNEL_ID;
const RULES_CHANNEL_ID = process.env.RULES_CHANNEL_ID;
const ADMIN_ROLE_ID = process.env.ADMIN_ROLE_ID;

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
      // Send level-up message to the configured channel
      const levelupChannel = message.guild.channels.cache.get(LEVELUP_CHANNEL_ID);
      if (levelupChannel) {
        await levelupChannel.send(`🎉 Congratulations <@${message.author.id}>, you leveled up to level ${newLevel}!`);
      } else {
        await message.channel.send(`🎉 Congratulations <@${message.author.id}>, you leveled up to level ${newLevel}!`);
      }
    }
  } catch (err) {
    console.error('XP DB error:', err);
  }
});

// Welcome messages
const welcomeMessages = [
  `yo <@USERID>, welcome 😎\nrules are somewhere 👉 <#rules-channel-id>\njust hang out and have fun lol`,
  `oh look, <@USERID> showed up 🎉\nidk, check the rules maybe 👉 <#rules-channel-id>\nor don’t, whatever`,
  `hey <@USERID>! 👋\nwelcome / willkommen / üdv 😎\nrules → <#rules-channel-id>\nhave fun or don’t lol`,
  `🚪 door creaks open\noh hey <@USERID>, you’re here now\nread the rules 👉 <#rules-channel-id>\nthen go be chaotic (but like, nicely) 😇`,
  `welcome <@USERID> 🎉\nrules → <#rules-channel-id>\ndone. ez.`,
  `hey <@USERID> 😎\nwillkommen / üdv itt\nrules sind hier 👉 <#rules-channel-id>\ndon’t be sus pls`,
  `<@USERID> has entered the chat 🚀\nrules 👉 <#rules-channel-id>\ngood luck soldier 🫡`
];

client.on(Events.GuildMemberAdd, async member => {
  // Find a general or system channel to send the welcome, or fallback to the first text channel
  let channel = member.guild.systemChannel || member.guild.channels.cache.find(c => c.type === 0 && c.permissionsFor(member.guild.members.me).has('SendMessages'));
  if (!channel) return;
  // Pick a random welcome message
  const msgTemplate = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
  const msg = msgTemplate
    .replace(/<@USERID>/g, `<@${member.id}>`)
    .replace(/<#rules-channel-id>/g, `<#${RULES_CHANNEL_ID}>`);
  channel.send({ content: msg });
});

client.login(process.env.DISCORD_TOKEN);
