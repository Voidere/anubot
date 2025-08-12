import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';

/**
 * Shows the user's XP and level using an embed, progress bar, and the Sequelize XP model.
 * @type {import('discord.js').SlashCommandBuilder}
 */
function getLevel(xp) {
  return Math.floor(0.1 * Math.sqrt(xp));
}

export default {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Show your XP and rank'),
  async execute(interaction, XP) {
    await interaction.deferReply();
    const userId = interaction.user.id;
    const username = interaction.user.username;
    try {
      const userXP = await XP.findByPk(userId);
      const xp = userXP ? userXP.xp : 0;
      const level = getLevel(xp);
      const nextLevel = level + 1;
      const xpForCurrentLevel = Math.floor(Math.pow(level / 0.1, 2));
      const xpForNextLevel = Math.floor(Math.pow(nextLevel / 0.1, 2));
      const xpToNextLevel = xpForNextLevel - xp;
      const progress = (xp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel);
      const progressBarLength = 20;
      const filledLength = Math.round(progressBarLength * progress);
      const progressBar = '█'.repeat(filledLength) + '░'.repeat(progressBarLength - filledLength);
      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle(`🏆 ${username}'s Rank`)
        .setThumbnail(interaction.user.displayAvatarURL())
        .addFields(
          { name: 'Level', value: `**${level}**`, inline: true },
          { name: 'Total XP', value: `**${xp}**`, inline: true },
          { name: 'XP to Next Level', value: `**${xpToNextLevel}**`, inline: true },
          { name: 'Progress', value: `${progressBar} ${Math.round(progress * 100)}%`, inline: false }
        )
        .setFooter({ text: 'Keep chatting to earn more XP!' })
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Rank command error:', error);
      await interaction.editReply({ content: '❌ Error: Could not fetch rank data.', flags: MessageFlags.Ephemeral });
    }
  },
};
