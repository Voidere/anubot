import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';

/**
 * Play Tic Tac Toe against another user using Discord buttons.
 * See: https://discordjs.guide/interactions/buttons.html
 * @type {import('discord.js').SlashCommandBuilder}
 */

function createBoard(board) {
  // Returns an array of ActionRowBuilder for Discord buttons
  return [0, 1, 2].map(row =>
    new ActionRowBuilder().addComponents(
      [0, 1, 2].map(col => {
        const idx = row * 3 + col;
        return new ButtonBuilder()
          .setCustomId(`ttt_${idx}`)
          .setLabel(board[idx] || ' ')
          .setStyle(
            board[idx] === 'X' ? ButtonStyle.Danger :
            board[idx] === 'O' ? ButtonStyle.Primary :
            ButtonStyle.Secondary
          )
          .setDisabled(!!board[idx]);
      })
    )
  );
}

function checkWinner(board) {
  const lines = [
    [0,1,2],[3,4,5],[6,7,8], // rows
    [0,3,6],[1,4,7],[2,5,8], // cols
    [0,4,8],[2,4,6]          // diags
  ];
  for (const [a,b,c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  if (board.every(cell => cell)) return 'tie';
  return null;
}

export default {
  data: new SlashCommandBuilder()
    .setName('tictactoe')
    .setDescription('Play Tic Tac Toe against another user')
    .addUserOption(option => option.setName('opponent').setDescription('User to challenge').setRequired(true)),
  async execute(interaction) {
    const challenger = interaction.user;
    const opponent = interaction.options.getUser('opponent');
    if (opponent.bot || opponent.id === challenger.id) {
      return interaction.reply({ content: 'You must challenge another human user!', ephemeral: true });
    }
    let board = Array(9).fill(null);
    let turn = 0; // 0: challenger (X), 1: opponent (O)
    const players = [challenger, opponent];
    const symbols = ['X', 'O'];

    await interaction.reply({
      content: `Tic Tac Toe: <@${players[turn].id}> (X) vs <@${players[1-turn].id}> (O)\nIt's <@${players[turn].id}>'s turn!`,
      components: createBoard(board)
    });
    const msg = await interaction.fetchReply();

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 5 * 60 * 1000 // 5 minutes
    });

    collector.on('collect', async btnInt => {
      if (btnInt.user.id !== players[turn].id) {
        await btnInt.reply({ content: `It's not your turn!`, ephemeral: true });
        return;
      }
      const idx = parseInt(btnInt.customId.split('_')[1]);
      if (board[idx]) {
        await btnInt.reply({ content: 'That spot is already taken!', ephemeral: true });
        return;
      }
      board[idx] = symbols[turn];
      const winner = checkWinner(board);
      turn = 1 - turn;
      if (winner) {
        collector.stop();
        await btnInt.update({
          content: winner === 'tie'
            ? `It's a tie!`
            : `Game over! <@${players[winner === 'X' ? 0 : 1].id}> (${winner}) wins!`,
          components: createBoard(board).map(row => row.setComponents(row.components.map(btn => btn.setDisabled(true))))
        });
      } else {
        await btnInt.update({
          content: `Tic Tac Toe: <@${players[turn].id}> (X) vs <@${players[1-turn].id}> (O)\nIt's <@${players[turn].id}>'s turn!`,
          components: createBoard(board)
        });
      }
    });

    collector.on('end', async () => {
      try {
        await msg.edit({ components: createBoard(board).map(row => row.setComponents(row.components.map(btn => btn.setDisabled(true)))) });
      } catch {}
    });
  },
};
