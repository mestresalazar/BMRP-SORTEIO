const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Booster = require('../models/Booster');
const Config = require('../models/Config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('meuboost')
    .setDescription('Verifica o status do seu impulso, tempo restante e prêmios da semana.'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const member = interaction.member;
      
      // Verifica se o membro tem o cargo de Booster do Discord nativo
      if (!member.premiumSince) {
        return interaction.editReply('❌ Você não está impulsionando o servidor no momento ou seu impulso não foi detectado.');
      }

      const config = await Config.findOne({ guildId: interaction.guild.id });
      const prizes = config ? config.prizes : ["15k de cash"];

      // Busca ou registra o booster no banco de dados
      let boosterData = await Booster.findOne({ userId: member.id });
      if (!boosterData) {
        boosterData = await Booster.create({
          userId: member.id,
          boostSince: member.premiumSince,
          active: true
        });
      }

      const boostDate = new Date(member.premiumSince);
      const formattedDate = boostDate.toLocaleDateString('pt-BR');

      const embed = new EmbedBuilder()
        .setTitle('🌟 Status do seu Impulso - BMRP')
        .setDescription('Obrigado por apoiar o nosso servidor! Aqui estão as informações da sua participação nos sorteios semanais:')
        .addFields(
          { name: '📅 Impulsionando desde', value: formattedDate, inline: true },
          { name: '🎟️ Tickets Ativos', value: `${boosterData.tickets}`, inline: true },
          { name: '🎁 Prêmios em Disputa', value: prizes.map((p, i) => `${i + 1}. ${p}`).join('\n') }
        )
        .setColor('#FF73FA')
        .setFooter({ text: 'Guardian - Sistema de Boosters' });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.editReply('❌ Ocorreu um erro ao verificar os dados do seu boost.');
    }
  },
};