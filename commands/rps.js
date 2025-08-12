import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';

/**
 * Play Rock Paper Scissors against the bot using buttons.
 * See: https://discordjs.guide/interactive-components/buttons.html
 * @type {import('discord.js').SlashCommandBuilder}
 */
const choices = ['rock', 'paper', 'scissors'];
const emojis = { rock: '🪨', paper: '📄', scissors: '✂️' };

function getResult(user, bot) {
  if (user === bot) return "It's a tie!";
  if (
    (user === 'rock' && bot === 'scissors') ||
    (user === 'paper' && bot === 'rock') ||
    (user === 'scissors' && bot === 'paper')
  ) {
    return 'You win!';
  }
  return 'You lose!';
}

export default {
  data: new SlashCommandBuilder()
    .setName('rps')
    .setDescription('Play Rock Paper Scissors against the bot'),
  async execute(interaction) {
    // Build buttons for choices
    const row = new ActionRowBuilder().addComponents(
      choices.map(choice =>
        new ButtonBuilder()
          .setCustomId(`rps_${choice}`)
          .setLabel(choice.charAt(0).toUpperCase() + choice.slice(1))
          .setEmoji(emojis[choice])
          .setStyle(ButtonStyle.Primary)
      )
    );
    await interaction.reply({
      content: 'Choose your move:',
      components: [row],
      ephemeral: false
    });
    const msg = await interaction.fetchReply();
    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 30_000,
      max: 1,
      filter: btnInt => btnInt.user.id === interaction.user.id
    });
    collector.on('collect', async btnInt => {
      const userChoice = btnInt.customId.replace('rps_', '');
      const botChoice = choices[Math.floor(Math.random() * choices.length)];
      const result = getResult(userChoice, botChoice);
      await btnInt.update({
        content: `You chose **${userChoice}** ${emojis[userChoice]}.
I chose **${botChoice}** ${emojis[botChoice]}.
${result}`,
        components: [
          new ActionRowBuilder().addComponents(
            choices.map(choice =>
              new ButtonBuilder()
                .setCustomId(`rps_${choice}`)
                .setLabel(choice.charAt(0).toUpperCase() + choice.slice(1))
                .setEmoji(emojis[choice])
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true)
            )
          )
        ]
      });
    });
    collector.on('end', async collected => {
      if (collected.size === 0) {
        await msg.edit({ content: 'Timed out! No move was made.', components: [row.setComponents(row.components.map(btn => btn.setDisabled(true)))] });
      }
    });
  },
};
