import { SlashCommandBuilder, MessageFlags } from 'discord.js';
const ADMIN_ROLE_ID = process.env.ADMIN_ROLE_ID;

function hasRoleOrHigher(member, roleId) {
  const targetRole = member.guild.roles.cache.get(roleId);
  if (!targetRole) return false;
  return member.roles.cache.some(role => role.position >= targetRole.position);
}

export default {
  data: new SlashCommandBuilder()
    .setName('say')
    .setDescription('Make the bot say something')
    .addStringOption(option => option.setName('text').setDescription('Text to say').setRequired(true)),
  async execute(interaction) {
    if (!ADMIN_ROLE_ID || !hasRoleOrHigher(interaction.member, ADMIN_ROLE_ID)) {
      return interaction.reply({ content: 'Only admins can use this command.', flags: MessageFlags.Ephemeral });
    }
    const text = interaction.options.getString('text');
    await interaction.reply({ content: '✅', ephemeral: true });
    await interaction.channel.send(text.replace(/\\n/g, '\n'));
  },
};
