import { SlashCommandBuilder } from 'discord.js';

/**
 * Rolls a dice (1-6).
 * @type {import('discord.js').SlashCommandBuilder}
 */
export default {
  data: new SlashCommandBuilder()
    .setName('dice')
    .setDescription('Roll a dice (1-6)'),
  async execute(interaction) {
    try {
      const roll = Math.floor(Math.random() * 6) + 1;
      await interaction.reply(`🎲 You rolled a **${roll}**!`);
    } catch (error) {
      console.error('Dice command error:', error);
      await interaction.reply({ content: 'Failed to roll the dice.', ephemeral: true });
    }
  },
};
