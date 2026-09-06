const { EmbedBuilder } = require('discord.js');
const Booster = require('../models/Booster');
const Config = require('../models/Config');

module.exports = {
  name: 'guildMemberUpdate',
  async execute(oldMember, newMember) {
    try {
      const wasBoosting = oldMember.premiumSince;
      const isBoosting = newMember.premiumSince;

      const config = await Config.findOne({ guildId: newMember.guild.id });
      if (!config || !config.logChannelId) return;

      const logChannel = newMember.guild.channels.cache.get(config.logChannelId);

      // Usuário começou a impulsionar agora
      if (!wasBoosting && isBoosting) {
        await Booster.findOneAndUpdate(
          { userId: newMember.id },
          { boostSince: isBoosting, active: true },
          { upsert: true, new: true }
        );

        if (logChannel) {
          const embed = new EmbedBuilder()
            .setTitle('🚀 Novo Impulso Detectado!')
            .setDescription(`O usuário ${newMember} acabou de impulsionar o servidor e já está participando dos sorteios semanais!`)
            .setColor('#FF73FA')
            .setTimestamp();
          await logChannel.send({ embeds: [embed] });
        }
      } 
      // Usuário parou de impulsionar
      else if (wasBoosting && !isBoosting) {
        await Booster.findOneAndUpdate(
          { userId: newMember.id },
          { active: false }
        );

        if (logChannel) {
          const embed = new EmbedBuilder()
            .setTitle('⚠️ Impulso Removido')
            .setDescription(`O usuário ${newMember} retirou ou perdeu o impulso do servidor.`)
            .setColor('#ED4245')
            .setTimestamp();
          await logChannel.send({ embeds: [embed] });
        }
      }
    } catch (error) {
      console.error('[Erro no evento guildMemberUpdate]:', error);
    }
  },
};