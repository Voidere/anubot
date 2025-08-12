import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';

/**
 * Mutes a user in voice channels. Only users with the MOD_ROLE_ID or higher can use this command.
 * Uses ephemeral replies for errors and defers reply for long operations.
 * See: https://discordjs.guide/slash-commands/response-methods.html
 * @type {import('discord.js').SlashCommandBuilder}
 */
const MOD_ROLE_ID = process.env.MOD_ROLE_ID;
const ADMIN_ROLE_ID = process.env.ADMIN_ROLE_ID;

function hasRoleOrHigher(member, roleId) {
  const targetRole = member.guild.roles.cache.get(roleId);
  if (!targetRole) return false;
  return member.roles.cache.some(role => role.position >= targetRole.position);
}

export default {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Mute a user')
    .addUserOption(option => option.setName('target').setDescription('User to mute').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.MuteMembers),
  async execute(interaction) {
    if (!MOD_ROLE_ID && !ADMIN_ROLE_ID) {
      return interaction.reply({ content: 'No moderator or admin role configured.', flags: MessageFlags.Ephemeral });
    }
    const canUse = (MOD_ROLE_ID && hasRoleOrHigher(interaction.member, MOD_ROLE_ID)) ||
                   (ADMIN_ROLE_ID && hasRoleOrHigher(interaction.member, ADMIN_ROLE_ID));
    if (!canUse) {
      return interaction.reply({ content: 'You do not have permission to use this command.', flags: MessageFlags.Ephemeral });
    }
    await interaction.deferReply(); // Defer for long operation
    const target = interaction.options.getUser('target');
    try {
      const member = await interaction.guild.members.fetch(target.id);
      if (!member) return interaction.editReply({ content: 'User not found.' });
      await member.voice.setMute(true, 'Muted by command');
      await interaction.editReply({ content: `${target.tag} has been muted.` });
    } catch (error) {
      console.error('Mute command error:', error);
      await interaction.editReply({ content: 'Failed to mute user.' });
    }
  },
};
