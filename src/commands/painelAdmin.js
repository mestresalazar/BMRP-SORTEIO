const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Config = require('../models/Config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('painel')
    .setDescription('Exibe o painel administrativo de gerenciamento de sorteios do BMRP.'),

  async execute(interaction) {
    if (!interaction.member.permissions.has('Administrator')) {
      return interaction.reply({ content: '❌ Apenas administradores podem usar este comando.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      let config = await Config.findOne({ guildId: interaction.guild.id });
      if (!config) {
        config = await Config.create({ guildId: interaction.guild.id, prizes: ['15k de cash'] });
      }

      const prizesList = (config.prizes || []).map((p, index) => `${index + 1}. ${p}`).join('\n') || 'Nenhum prêmio cadastrado.';

      const embed = new EmbedBuilder()
        .setTitle('⚙️ Painel Administrativo - Sorteios BMRP')
        .setDescription('Gerencie os sorteios semanais de impulsionadores por aqui.\n\n**Prêmios Atuais:**\n' + prizesList)
        .setColor(0x00AE86)
        .setFooter({ text: 'Guardian - Sistema de Sorteios 24h' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('btn_add_prize')
          .setLabel('Adicionar Prêmio')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('btn_list_prizes')
          .setLabel('Ver Prêmios')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('btn_force_sorteio')
          .setLabel('Forçar Sorteio (Teste)')
          .setStyle(ButtonStyle.Danger)
      );

      const targetChannel = interaction.guild.channels.cache.get(config.sorteioChannelId) || interaction.channel;
      await targetChannel.send({ embeds: [embed], components: [row] });
      await interaction.editReply('✅ Painel enviado com sucesso para o canal de sorteios!');
    } catch (error) {
      console.error(error);
      await interaction.editReply('❌ Ocorreu um erro ao enviar o painel.');
    }
  },
};