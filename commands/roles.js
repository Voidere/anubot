import { SlashCommandBuilder, MessageFlags } from 'discord.js';
const ADMIN_ROLE_ID = process.env.ADMIN_ROLE_ID;

const ROLE_CONFIG = [
  { emoji: '<:faceit:1419084458845274232>', react: 'faceit:1419084458845274232', roleId: process.env.FACEIT_ROLE_ID, label: 'Faceit' },
  { emoji: '<:cs2:1419084499798458460>', react: 'cs2:1419084499798458460', roleId: process.env.CS2_ROLE_ID, label: 'CS2' },
  { emoji: '<:gtao:1419085112783405076>', react: 'gtao:1419085112783405076', roleId: process.env.GTA_ROLE_ID, label: 'GTA' },
  { emoji: '<:amongus:1419083428644524093>', react: 'amongus:1419083428644524093', roleId: process.env.AMONGUS_ROLE_ID, label: 'Among Us' },
  { emoji: '<:minecraft:1419084558648742078>', react: 'minecraft:1419084558648742078', roleId: process.env.MINECRAFT_ROLE_ID, label: 'Minecraft' },
  { emoji: '🎬', react: '🎬', roleId: process.env.MOVIENIGHT_ROLE_ID, label: 'Movie night' },
  { emoji: '<:development:1419085209776685067>', react: 'development:1419085209776685067', roleId: process.env.DEVELOPMENT_ROLE_ID, label: 'Development' },
];

function hasRoleOrHigher(member, roleId) {
  const targetRole = member.guild.roles.cache.get(roleId);
  if (!targetRole) return false;
  return member.roles.cache.some(role => role.position >= targetRole.position);
}

export default {
  data: new SlashCommandBuilder()
    .setName('roles')
    .setDescription('Show claimable roles and let users claim them'),
  async execute(interaction) {
    if (!ADMIN_ROLE_ID || !hasRoleOrHigher(interaction.member, ADMIN_ROLE_ID)) {
      return interaction.reply({ content: 'Only admins can use this command.', flags: MessageFlags.Ephemeral });
    }
    await interaction.reply({ content: 'Posting role message...', flags: MessageFlags.Ephemeral });
    let description = '**React below to claim or remove a role!**\n\n';
    for (const { emoji, label } of ROLE_CONFIG) {
      description += `${emoji}   —   **${label}**\n\n`;
    }
    description += '\n if you change ur mind u can remove the role by reacting with the same emoji again';
    description += '\n\n[role-message]';
    const msg = await interaction.channel.send({ content: description });
    for (const { react } of ROLE_CONFIG) {
      try {
        await msg.react(react);
      } catch (e) {
        // Ignore errors for missing emoji
      }
    }
  },
};
