const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const Config = require('../models/Config'); // Ajuste o caminho se necessário para a pasta models

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Configura os canais e o sistema do bot no servidor.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ flags: 6 /* 6 substitui o ephemeral obsoleto */ });

        try {
            const guildId = interaction.guild.id;

            // Cria ou atualiza a configuração no MongoDB Atlas
            let config = await Config.findOne({ guildId });
            if (!config) {
                config = new Config({ guildId });
            }

            // Exemplo: Criando um canal de texto automático para o sistema
            const existingChannel = interaction.guild.channels.cache.find(c => c.name === 'bmrp-sorteios');
            let targetChannel = existingChannel;

            if (!targetChannel) {
                targetChannel = await interaction.guild.channels.create({
                    name: 'bmrp-sorteios',
                    type: 0, // GuildText
                    topic: 'Canal oficial de gerenciamento de sorteios e boosters do BMRP.',
                });
            }

            config.channelId = targetChannel.id;
            await config.save();

            const embed = new EmbedBuilder()
                .setTitle('✅ Configuração Realizada com Sucesso!')
                .setDescription(`O sistema foi configurado com sucesso!\nCanal vinculado: ${targetChannel}`)
                .setColor('#00FF00')
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Erro ao executar o comando setup:', error);
            await interaction.editReply({ 
                content: '❌ Ocorreu um erro ao tentar configurar os canais. Verifique o console.' 
            });
        }
    },
};