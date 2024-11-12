const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Ruta del archivo JSON donde se guardarán las sugerencias
const sugerenciasFile = path.join(__dirname, '../../', 'sugerencias.json');

// Función para cargar las sugerencias desde el archivo
function cargarSugerencias() {
  if (fs.existsSync(sugerenciasFile)) {
    const data = fs.readFileSync(sugerenciasFile);
    return JSON.parse(data);
  } else {
    return [];
  }
}

// Función para guardar las sugerencias en el archivo
function guardarSugerencias(sugerencias) {
  fs.writeFileSync(sugerenciasFile, JSON.stringify(sugerencias, null, 2));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sugerir')
    .setDescription('Envía una sugerencia a los administradores.')
    .addStringOption(option =>
      option.setName('sugerencia')
        .setDescription('Escribe tu sugerencia')
        .setRequired(true)
    ),
    
  async execute(interaction) {
    const sugerencia = interaction.options.getString('sugerencia');
    const usuario = interaction.user;

    // Cargar las sugerencias existentes
    const sugerencias = cargarSugerencias();

    // Crear un nuevo objeto de sugerencia
    const nuevaSugerencia = {
      id: sugerencias.length + 1,
      usuario: usuario.username,
      sugerencia,
      votos: {
        aceptar: 0,
        rechazar: 0,
        importante: 0
      },
      votantes: {
        aceptar: [],
        rechazar: [],
        importante: [],
      }
    };

    // Guardar la nueva sugerencia
    sugerencias.push(nuevaSugerencia);
    guardarSugerencias(sugerencias);

    // Crear botones para votar con emojis
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`aceptar_${nuevaSugerencia.id}`)
          .setLabel('Aceptar 👍')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`rechazar_${nuevaSugerencia.id}`)
          .setLabel('Rechazar 👎')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`importante_${nuevaSugerencia.id}`)
          .setLabel('Importante ⭐')
          .setStyle(ButtonStyle.Primary)
      );

    // Crear el embed para la sugerencia con más estilo y detalles
    const embed = new EmbedBuilder()
      .setColor('#4B9CD3') // Color personalizado
      .setTitle('🌟 Nueva Sugerencia de la Comunidad 🌟')
      .setDescription(`**Sugerencia de ${usuario.username}:**\n\n${sugerencia}`)
      .setThumbnail('https://example.com/your-banner-image.png')  // Imagen opcional de banner o avatar
      .addFields(
        { name: 'Votos Aceptar', value: '0 👍', inline: true },
        { name: 'Votos Rechazar', value: '0 👎', inline: true },
        { name: 'Votos Importante', value: '0 ⭐', inline: true }
      )
      .setFooter({ text: `ID de sugerencia: ${nuevaSugerencia.id}` })
      .setTimestamp()
      .setImage('https://example.com/your-image.png');  // Imagen opcional

    // Obtener el canal de sugerencias por su nombre o ID
    const canalSugerencias = interaction.guild.channels.cache.get('1305338832756936765'); // Cambia 'ID_DEL_CANAL' por el ID real del canal

    if (!canalSugerencias) {
      return interaction.reply({ content: 'No pude encontrar el canal de sugerencias.', ephemeral: true });
    }

    // Enviar el mensaje con la sugerencia y los botones al canal de sugerencias
    const message = await canalSugerencias.send({
      embeds: [embed],
      components: [row],
    });

    // Responder al usuario que la sugerencia fue enviada
    await interaction.reply({
      content: '¡Tu sugerencia ha sido enviada a los administradores! ¡Gracias por contribuir! 🙏',
      ephemeral: true,
    });

    // Crear un collector para manejar las interacciones con los botones
    const filter = (i) => !i.user.bot; // Permitir que cualquier usuario pueda votar (no bots)

    const collector = message.createMessageComponentCollector({
      filter,
      time: 432000000, // El collector durará hasta que la sugerencia expire (5 días)
    });

    collector.on('collect', async (i) => {
      const [accion, idSugerencia] = i.customId.split('_');
      const sugerencia = sugerencias.find(s => s.id === parseInt(idSugerencia));

      if (!sugerencia) {
        return i.reply({ content: 'Sugerencia no encontrada.', ephemeral: true });
      }

      // Verificar si el usuario ya ha votado en alguna categoría
      if (
        sugerencia.votantes.aceptar.includes(i.user.id) ||
        sugerencia.votantes.rechazar.includes(i.user.id) ||
        sugerencia.votantes.importante.includes(i.user.id)
      ) {
        // Si el usuario ya votó, informarles que no pueden votar de nuevo
        return i.reply({ content: 'Ya has votado en esta sugerencia, no puedes votar de nuevo. 🙅‍♂️', ephemeral: true });
      }

      // Si el usuario ya ha votado en alguna categoría, eliminar su voto anterior
      let votoEliminado = false;
      if (sugerencia.votantes.aceptar.includes(i.user.id)) {
        sugerencia.votantes.aceptar = sugerencia.votantes.aceptar.filter(userId => userId !== i.user.id);
        sugerencia.votos.aceptar--;
        votoEliminado = true;
      }

      if (sugerencia.votantes.rechazar.includes(i.user.id)) {
        sugerencia.votantes.rechazar = sugerencia.votantes.rechazar.filter(userId => userId !== i.user.id);
        sugerencia.votos.rechazar--;
        votoEliminado = true;
      }

      if (sugerencia.votantes.importante.includes(i.user.id)) {
        sugerencia.votantes.importante = sugerencia.votantes.importante.filter(userId => userId !== i.user.id);
        sugerencia.votos.importante--;
        votoEliminado = true;
      }

      // Si el usuario no había votado en la categoría seleccionada, agregar su voto
      if (!votoEliminado) {
        sugerencia.votantes[accion].push(i.user.id);
        sugerencia.votos[accion]++;
      }

      // Guardar los cambios en el archivo
      guardarSugerencias(sugerencias);

      // Crear un nuevo embed con la sugerencia actualizada
      const updatedEmbed = new EmbedBuilder()
        .setColor('#4B9CD3') // Color personalizado
        .setTitle('🌟 Sugerencia Actualizada 🌟')
        .setDescription(`**Sugerencia de ${sugerencia.usuario}:**\n\n${sugerencia.sugerencia}`)
        .addFields(
          { name: 'Votos Aceptar', value: `${sugerencia.votos.aceptar} 👍`, inline: true },
          { name: 'Votos Rechazar', value: `${sugerencia.votos.rechazar} 👎`, inline: true },
          { name: 'Votos Importante', value: `${sugerencia.votos.importante} ⭐`, inline: true }
        )
        .setFooter({ text: `ID de sugerencia: ${sugerencia.id}` })
        .setTimestamp()
        .setImage('https://example.com/your-image.png');  // Imagen opcional

      // Actualizar el mensaje original con la nueva información de los votos
      await i.update({
        embeds: [updatedEmbed],
        components: [i.message.components[0]], // Mantener los botones
      });
    });
  },
};
