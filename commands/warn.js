import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';

/**
 * Warn a user. Only users with the MOD_ROLE_ID or higher can use this command.
 * @type {import('discord.js').SlashCommandBuilder}
 */
const MOD_ROLE_ID = process.env.MOD_ROLE_ID;
const ADMIN_ROLE_ID = process.env.ADMIN_ROLE_ID;

// In-memory warning log (for demonstration; use a database for production)
const warnings = new Map();

function hasRoleOrHigher(member, roleId) {
  const targetRole = member.guild.roles.cache.get(roleId);
  if (!targetRole) return false;
  return member.roles.cache.some(role => role.position >= targetRole.position);
}

export default {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a user')
    .addUserOption(option => option.setName('target').setDescription('User to warn').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for warning').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  async execute(interaction) {
    if (!MOD_ROLE_ID && !ADMIN_ROLE_ID) {
      return interaction.reply({ content: 'No moderator or admin role configured.', flags: MessageFlags.Ephemeral });
    }
    const canUse = (MOD_ROLE_ID && hasRoleOrHigher(interaction.member, MOD_ROLE_ID)) ||
                   (ADMIN_ROLE_ID && hasRoleOrHigher(interaction.member, ADMIN_ROLE_ID));
    if (!canUse) {
      return interaction.reply({ content: 'You do not have permission to use this command.', flags: MessageFlags.Ephemeral });
    }
    const target = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    // Log the warning in memory
    if (!warnings.has(target.id)) warnings.set(target.id, []);
    warnings.get(target.id).push({ moderator: interaction.user.id, reason, date: new Date() });
    await interaction.reply({ content: `⚠️ <@${target.id}> has been warned. Reason: ${reason}` });
  },
};
