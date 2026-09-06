const express = require('express');
const { Client, GatewayIntentBits, Collection, REST, Routes, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
require('dotenv').config();

// Servidor Express para manter o Web Service do Render ativo 24h
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Guardian Bot está online e operando perfeitamente!');
});

app.listen(PORT, () => {
  console.log(`[Servidor Web] Porta HTTP rodando na porta ${PORT}`);
});

const Booster = require('./src/models/Booster');
const Config = require('./src/models/Config');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences
  ]
});

client.commands = new Collection();

// 1. Carregar Comandos (Com verificação de segurança)
const commands = [];
const commandsPath = path.join(__dirname, 'src/commands');
if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
      commands.push(command.data.toJSON());
    }
  }
}

// 2. Carregar Eventos (Com verificação para evitar erro do Git)
const eventsPath = path.join(__dirname, 'src/events');
if (fs.existsSync(eventsPath)) {
  const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
  }
} else {
  console.log('[Aviso] Pasta src/events inexistente ou vazia. Pulando eventos externos.');
}

client.once('ready', async () => {
  console.log(`[Bot Online] Conectado como ${client.user.tag} (Guardian)`);

  // Registrar Comandos Globalmente
  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  try {
    console.log('[Comandos] Atualizando comandos de barra (slash commands)...');
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands },
    );
    console.log('[Comandos] Comandos registrados com sucesso!');
  } catch (error) {
    console.error(error);
  }

  // Rotina Automática: Sorteio a cada 7 dias (Segunda-feira às 20:00)
  cron.schedule('0 20 * * 1', async () => {
    try {
      for (const [guildId, guild] of client.guilds.cache) {
        const config = await Config.findOne({ guildId });
        if (!config || !config.sorteioChannelId) continue;

        const channel = guild.channels.cache.get(config.sorteioChannelId);
        if (!channel) continue;

        // Busca boosters ativos
        const boosters = await Booster.find({ active: true });
        if (boosters.length === 0) {
          await channel.send('🎉 **Sorteio Semanal de Boosters:** Nenhum booster ativo encontrado nesta semana.');
          continue;
        }

        // Sorteia aleatoriamente
        const winnerDoc = boosters[Math.floor(Math.random() * boosters.length)];
        const winnerMember = await guild.members.fetch(winnerDoc.userId).catch(() => null);

        if (winnerMember) {
          const prizesList = config.prizes.join(', ');
          await channel.send(`🎉 **PARABÉNS ${winnerMember}!** Você venceu o sorteio semanal de impulsionadores do BMRP e faturou: **${prizesList}**! 🚀`);
        }
      }
    } catch (err) {
      console.error('[Erro na rotina de sorteio automático]:', err);
    }
  });
});

// 3. Manipulador de Interações (Comandos, Botões do Painel e Modais)
client.on('interactionCreate', async interaction => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: 'Houve um erro ao executar este comando!', ephemeral: true });
      } else {
        await interaction.reply({ content: 'Houve um erro ao executar este comando!', ephemeral: true });
      }
    }
  } else if (interaction.isButton()) {
    if (!interaction.member.permissions.has('Administrator')) {
      return interaction.reply({ content: '❌ Apenas administradores podem usar os botões do painel.', ephemeral: true });
    }

    const config = await Config.findOne({ guildId: interaction.guild.id });

    if (interaction.customId === 'btn_add_prize') {
      const modal = new ModalBuilder()
        .setCustomId('modal_add_prize')
        .setTitle('Adicionar Novo Prêmio');

      const prizeInput = new TextInputBuilder()
        .setCustomId('input_prize_name')
        .setLabel('Nome do Prêmio')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Ex: 20k de cash ou 1 Veículo VIP')
        .setRequired(true);

      const rowModal = new ActionRowBuilder().addComponents(prizeInput);
      modal.addComponents(rowModal);

      await interaction.showModal(modal);
    } else if (interaction.customId === 'btn_list_prizes') {
      const prizes = config && config.prizes && config.prizes.length > 0 ? config.prizes.map((p, i) => `${i + 1}. ${p}`).join('\n') : 'Nenhum prêmio cadastrado.';
      await interaction.reply({ content: `🎁 **Prêmios cadastrados atualmente:**\n${prizes}`, ephemeral: true });
    } else if (interaction.customId === 'btn_force_sorteio') {
      await interaction.reply({ content: '🎲 Forçando sorteio de teste...', ephemeral: true });
      // Lógica rápida de teste de sorteio
      const boosters = await Booster.find({ active: true });
      if (boosters.length === 0) {
        return interaction.followUp({ content: '❌ Nenhum booster ativo no momento para testar o sorteio.', ephemeral: true });
      }
      const winnerDoc = boosters[Math.floor(Math.random() * boosters.length)];
      const winnerMember = await interaction.guild.members.fetch(winnerDoc.userId).catch(() => null);
      if (winnerMember) {
        await interaction.channel.send(`🎉 **[TESTE DE SORTEIO]** O usuário ${winnerMember} foi sorteado com sucesso!`);
      }
    }
  } else if (interaction.isModalSubmit()) {
    if (interaction.customId === 'modal_add_prize') {
      const newPrize = interaction.fields.getTextInputValue('input_prize_name');
      
      let config = await Config.findOne({ guildId: interaction.guild.id });
      if (!config) {
        config = await Config.create({ guildId: interaction.guild.id, prizes: [] });
      }

      config.prizes.push(newPrize);
      await config.save();

      await interaction.reply({ content: `✅ Prêmio **"${newPrize}"** adicionado com sucesso à lista de sorteios!`, ephemeral: true });
    }
  }
});

mongoose.connect(process.env.MONGO_URI).then(() => {
  console.log('[Banco de Dados] Conectado ao MongoDB com sucesso!');
}).catch(err => console.error('[Erro MongoDB]:', err));

client.login(process.env.TOKEN);