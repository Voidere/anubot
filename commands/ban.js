import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';

/**
 * Bans a user from the server. Only users with the ADMIN_ROLE_ID or higher can use this command.
 * Uses ephemeral replies for errors and defers reply for long operations.
 * See: https://discordjs.guide/slash-commands/response-methods.html
 * @type {import('discord.js').SlashCommandBuilder}
 */
const ADMIN_ROLE_ID = process.env.ADMIN_ROLE_ID;

function hasRoleOrHigher(member, roleId) {
  const targetRole = member.guild.roles.cache.get(roleId);
  if (!targetRole) return false;
  return member.roles.cache.some(role => role.position >= targetRole.position);
}

export default {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user from the server')
    .addUserOption(option => option.setName('target').setDescription('User to ban').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for ban').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  async execute(interaction) {
    if (!ADMIN_ROLE_ID || !hasRoleOrHigher(interaction.member, ADMIN_ROLE_ID)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', flags: MessageFlags.Ephemeral });
    }
    await interaction.deferReply(); // Defer for long operation
    const target = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    try {
      const member = await interaction.guild.members.fetch(target.id).catch(() => null);
      if (!member) return interaction.editReply({ content: 'User not found.' });
      await member.ban({ reason });
      await interaction.editReply({ content: `${target.tag} has been banned. Reason: ${reason}` });
    } catch (error) {
      console.error('Ban command error:', error);
      await interaction.editReply({ content: 'Failed to ban user.' });
    }
  },
};
