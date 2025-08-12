module.exports = {
  name: "rank",
  description: "Shows your XP and level",
  async execute(interaction, args, db) {
    // Handle both slash commands and prefix commands
    const isSlashCommand =
      interaction.isChatInputCommand && interaction.isChatInputCommand();
    const userId = isSlashCommand ? interaction.user.id : interaction.author.id;
    const username = isSlashCommand
      ? interaction.user.username
      : interaction.author.username;

    try {
      // Get or create user
      await db.createOrUpdateUser(userId, username);
      const user = await db.getUser(userId);

      if (!user) {
        const errorMessage = "❌ Error: Could not find user data.";
        if (isSlashCommand) {
          return interaction.reply({ content: errorMessage, ephemeral: true });
        } else {
          return interaction.reply(errorMessage);
        }
      }

      // Calculate XP needed for next level
      const xpForNextLevel = user.level * 100;
      const progress = Math.min((user.xp % 100) / 100, 1);

      // Create progress bar
      const progressBarLength = 20;
      const filledLength = Math.round(progressBarLength * progress);
      const progressBar =
        "█".repeat(filledLength) + "░".repeat(progressBarLength - filledLength);

      const embed = {
        color: 0x00ff00,
        title: `🏆 ${username}'s Rank`,
        thumbnail: {
          url: isSlashCommand
            ? interaction.user.displayAvatarURL()
            : interaction.author.displayAvatarURL(),
        },
        fields: [
          {
            name: "Level",
            value: `**${user.level}**`,
            inline: true,
          },
          {
            name: "Total XP",
            value: `**${user.xp}**`,
            inline: true,
          },
          {
            name: "XP to Next Level",
            value: `**${xpForNextLevel - (user.xp % 100)}**`,
            inline: true,
          },
          {
            name: "Progress",
            value: `${progressBar} ${Math.round(progress * 100)}%`,
            inline: false,
          },
        ],
        footer: {
          text: "Keep chatting to earn more XP!",
        },
        timestamp: new Date(),
      };

      // Handle both slash commands and prefix commands
      if (isSlashCommand) {
        interaction.reply({ embeds: [embed] });
      } else {
        interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error("Error in rank command:", error);
      const errorMessage = "❌ Error: Could not fetch rank data.";
      if (isSlashCommand) {
        interaction.reply({ content: errorMessage, ephemeral: true });
      } else {
        interaction.reply(errorMessage);
      }
    }
  },
};
