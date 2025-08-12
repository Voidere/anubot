import { SlashCommandBuilder } from 'discord.js';

/**
 * Replies with Pong!
 * @type {import('discord.js').SlashCommandBuilder}
 */
export default {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!'),
  async execute(interaction) {
    try {
      await interaction.reply('Pong!');
    } catch (error) {
      console.error('Ping command error:', error);
      if (!interaction.replied) {
        await interaction.reply({ content: 'Failed to reply to ping.', ephemeral: true });
      }
    }
  },
};
