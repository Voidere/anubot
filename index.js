import express from "express";
import "dotenv/config";
import { Client, Collection, GatewayIntentBits, Events, ActivityType } from "discord.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { sequelize, XP } from "./models/xp.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Bot is alive!");
});

app.listen(PORT, () => {
  console.log(`Web server running on port ${PORT}`);
});

/**
 * Validate required environment variables
 */
const requiredEnv = ["DISCORD_TOKEN", "CLIENT_ID", "GUILD_ID"];
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
    console.log("Database synced.");
  } catch (err) {
    console.error("Failed to sync database:", err);
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
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMembers,
  ],
});
client.commands = new Collection();

// Dynamically load commands
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));
for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = await import(filePath);
  if ("data" in command.default && "execute" in command.default) {
    client.commands.set(command.default.data.name, command.default);
  }
}

client.once(Events.ClientReady, async () => {
  console.log(`Logged in as ${client.user.tag}`);
  client.user.setPresence({
    activities: [{ name: 'Nekonia', type: ActivityType.Playing }],
    status: 'online',
  });
  console.log('Set presence: Playing Nekonia');

  // Fetch and cache old /roles messages in the roles selector channel
  const rolesChannelId = '1418739105751236628';
  try {
    const channel = await client.channels.fetch(rolesChannelId);
    if (channel && channel.isTextBased()) {
      const messages = await channel.messages.fetch({ limit: 100 });
      messages.forEach(msg => {
        if (msg.content.includes('[role-message]')) {
          channel.messages.fetch(msg.id).catch(() => {});
        }
      });
      console.log('Fetched and cached old /roles messages for reaction roles.');
    }
  } catch (e) {
    console.error('Error fetching messages for reaction role caching:', e);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  // Restrict commands to COMMANDS_CHANNEL_ID unless admin
  if (
    interaction.channel.id !== COMMANDS_CHANNEL_ID &&
    !(
      ADMIN_ROLE_ID &&
      interaction.member &&
      interaction.member.roles.cache.has(ADMIN_ROLE_ID)
    )
  ) {
    return interaction.reply({
      content: `You can only use commands in the designated channel.`,
      ephemeral: true,
    });
  }
  try {
    await command.execute(interaction, XP);
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: "There was an error executing this command!",
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: "There was an error executing this command!",
        ephemeral: true,
      });
    }
  }
});

const LEVELUP_CHANNEL_ID = process.env.LEVELUP_CHANNEL_ID;
const COMMANDS_CHANNEL_ID = process.env.COMMANDS_CHANNEL_ID;
const RULES_CHANNEL_ID = process.env.RULES_CHANNEL_ID;
const ADMIN_ROLE_ID = process.env.ADMIN_ROLE_ID;
const COUNTING_CHANNEL_ID = process.env.COUNTING_CHANNEL_ID;
const COUNTING_FAIL_ROLE_ID = process.env.COUNTING_FAIL_ROLE_ID;

let lastCount = 0;
let lastCounter = null;

client.on(Events.MessageCreate, async (message) => {
  // Counting game logic
  if (
    message.channel.id === COUNTING_CHANNEL_ID &&
    !message.author.bot
  ) {
    const num = parseInt(message.content.trim());
    if (
      isNaN(num) ||
      num !== lastCount + 1 ||
      message.author.id === lastCounter
    ) {
      // Fail: reset, react ❌, assign fail role
      await message.react('❌');
      lastCount = 0;
      lastCounter = null;
      // Assign fail role for 24h
      if (COUNTING_FAIL_ROLE_ID) {
        try {
          await message.member.roles.add(COUNTING_FAIL_ROLE_ID);
          setTimeout(async () => {
            try {
              await message.member.roles.remove(COUNTING_FAIL_ROLE_ID);
            } catch {}
          }, 24 * 60 * 60 * 1000);
        } catch {}
      }
      await message.channel.send('❌ Wrong number or double post! Start again from 1.');
      return;
    } else {
      // Success: react ✅, update state
      await message.react('✅');
      lastCount = num;
      lastCounter = message.author.id;
      return;
    }
  }
  if (message.author.bot) return;
  try {
    const [userXP] = await XP.findOrCreate({
      where: { user_id: message.author.id },
    });
    const oldXP = userXP.xp;
    const oldLevel = Math.floor(0.1 * Math.sqrt(oldXP));
    await XP.increment("xp", {
      by: XP_PER_MESSAGE,
      where: { user_id: message.author.id },
    });
    await userXP.reload();
    const newXP = userXP.xp;
    const newLevel = Math.floor(0.1 * Math.sqrt(newXP));
    if (newLevel > oldLevel) {
      await message.channel.send(
        `🎉 Congratulations <@${message.author.id}>, you leveled up to level ${newLevel}!`
      );
    }
  } catch (err) {
    console.error("XP DB error:", err);
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
  `<@USERID> has entered the chat 🚀\nrules 👉 <#rules-channel-id>\ngood luck soldier 🫡`,
];

client.on(Events.GuildMemberAdd, async (member) => {
  // Find a general or system channel to send the welcome, or fallback to the first text channel
  let channel =
    member.guild.systemChannel ||
    member.guild.channels.cache.find(
      (c) =>
        c.type === 0 &&
        c.permissionsFor(member.guild.members.me).has("SendMessages")
    );
  if (!channel) return;
  // Pick a random welcome message
  const msgTemplate =
    welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
  const msg = msgTemplate
    .replace(/<@USERID>/g, `<@${member.id}>`)
    .replace(/<#rules-channel-id>/g, `<#${RULES_CHANNEL_ID}>`);
  channel.send({ content: msg });
});

// Role claim emoji/role mapping
const ROLE_EMOJI_MAP = {
  "faceit:1419084458845274232": process.env.FACEIT_ROLE_ID,
  "cs2:1419084499798458460": process.env.CS2_ROLE_ID,
  "gtao:1419085112783405076": process.env.GTA_ROLE_ID,
  "amongus:1419083428644524093": process.env.AMONGUS_ROLE_ID,
  "minecraft:1419084558648742078": process.env.MINECRAFT_ROLE_ID,
  "🎬": process.env.MOVIENIGHT_ROLE_ID,
  "development:1419085209776685067": process.env.DEVELOPMENT_ROLE_ID,
};

client.on("messageReactionAdd", async (reaction, user) => {
  if (user.bot) return;
  if (reaction.partial)
    try {
      await reaction.fetch();
    } catch {
      return;
    }
  if (reaction.message.partial)
    try {
      await reaction.message.fetch();
    } catch {
      return;
    }
  // Only process reactions for /roles messages with marker
  if (!reaction.message.content.includes('[role-message]')) return;
  const emojiKey = reaction.emoji.id
    ? `${reaction.emoji.name}:${reaction.emoji.id}`
    : reaction.emoji.name;
  const roleId = ROLE_EMOJI_MAP[emojiKey];
  if (!roleId) return;
  const member = await reaction.message.guild.members.fetch(user.id);
  if (!member.roles.cache.has(roleId)) {
    await member.roles.add(roleId).catch(() => {});
  }
});

client.on("messageReactionRemove", async (reaction, user) => {
  if (user.bot) return;
  if (reaction.partial)
    try {
      await reaction.fetch();
    } catch {
      return;
    }
  if (reaction.message.partial)
    try {
      await reaction.message.fetch();
    } catch {
      return;
    }
  if (!reaction.message.content.includes('[role-message]')) return;
  const emojiKey = reaction.emoji.id
    ? `${reaction.emoji.name}:${reaction.emoji.id}`
    : reaction.emoji.name;
  const roleId = ROLE_EMOJI_MAP[emojiKey];
  if (!roleId) return;
  const member = await reaction.message.guild.members.fetch(user.id);
  if (member.roles.cache.has(roleId)) {
    await member.roles.remove(roleId).catch(() => {});
  }
});

client.login(process.env.DISCORD_TOKEN);
