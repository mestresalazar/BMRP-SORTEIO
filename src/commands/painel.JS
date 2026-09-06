const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Config = require('../models/Config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('painel')
    .setDescription('Envia o painel de gerenciamento de prêmios e sorteios dos boosters.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const config = await Config.findOne({ guildId: interaction.guild.id });
      const prizes = config ? config.prizes : ["15k de cash"];

      const embed = new EmbedBuilder()
        .setTitle('🌟 Painel de Gerenciamento - Boosters BMRP')
        .setDescription('Gerencie os prêmios e acompanhe o sistema de sorteios semanais para quem impulsiona o servidor.')
        .addFields(
          { name: '🎁 Prêmios Atuais', value: prizes.map((p, i) => `${i + 1}. ${p}`).join('\n') },
          { name: '⏱️ Ciclo', value: 'Sorteios automáticos a cada **7 dias** para os boosters ativos.' }
        )
        .setColor('#5865F2')
        .setFooter({ text: 'Guardian - Sistema de Boosters' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('btn_add_prize')
          .setLabel('Adicionar Prêmio')
          .setStyle(ButtonStyle.Success)
          .setEmoji('➕'),
        new ButtonBuilder()
          .setCustomId('btn_list_prizes')
          .setLabel('Ver Prêmios')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('📋'),
        new ButtonBuilder()
          .setCustomId('btn_force_sorteio')
          .setLabel('Sortear Agora')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🎉')
      );

      const targetChannel = config?.sorteioChannelId ? interaction.guild.channels.cache.get(config.sorteioChannelId) : interaction.channel;

      await targetChannel.send({ embeds: [embed], components: [row] });
      await interaction.editReply('✅ Painel enviado com sucesso para o canal de sorteios!');
    } catch (error) {
      console.error(error);
      await interaction.editReply('❌ Ocorreu um erro ao enviar o painel.');
    }
  },
};