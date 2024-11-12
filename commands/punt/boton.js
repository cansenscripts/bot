const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const path = require('path');
const fs = require('fs');

// Ruta para el archivo de puntos
const puntosFile = path.join(__dirname, '../../', 'puntos.json');

// Cargar los puntos desde el archivo JSON
function cargarPuntos() {
  if (fs.existsSync(puntosFile)) {
    const data = fs.readFileSync(puntosFile);
    return JSON.parse(data);
  } else {
    return {};
  }
}

// Guardar puntos en el archivo JSON
function guardarPuntos(puntos) {
  fs.writeFileSync(puntosFile, JSON.stringify(puntos, null, 2));
}

// Ruta al nuevo archivo JSON
const staffFilePath = path.join(__dirname, '..', '..', 'miembros_staff.json');

// Función para cargar el archivo miembros_staff.json
function cargarStaff() {
    try {
        const data = fs.readFileSync(staffFilePath, 'utf8');
        console.log('Datos cargados desde miembros_staff.json:', data); // Verificar el contenido cargado
        return JSON.parse(data);
    } catch (error) {
        console.error('Error al cargar el archivo miembros_staff.json:', error);
        return []; // Devuelve un array vacío si no se puede leer el archivo
    }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('boton')
    .setDescription('Elige una categoría y gana puntos!'),
  async execute(interaction) {

    const staff = cargarStaff();
    const usuarioId = interaction.user.id;

    // Buscar al usuario en el archivo staff.json
    const miembro = staff.find(entry => entry.id === usuarioId);

    // Verificar si el usuario es parte del staff
    if (!miembro) {
        return interaction.reply({ content: '❌ No tienes permisos para ejecutar este comando. Solo los miembros del Staff pueden hacerlo.', ephemeral: true });
    }
    
    // Verificar si el usuario tiene el rol adecuado
    const tieneRolAdecuado = miembro.rangos && (miembro.rangos.includes('High Staff') || miembro.rangos.includes('Head Staff') || miembro.rangos.includes('Developer') || miembro.rangos.includes('CO') || miembro.rangos.includes('CEO'));
    
    if (!tieneRolAdecuado) {
        return interaction.reply({ content: '❌ No tienes el tipo de staff adecuado para ejecutar este comando. Necesitas ser minimo High Staff.', ephemeral: true });
    }

    // Crear los botones de diferentes categorías
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('duda')
        .setLabel('❓ Duda')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('bug')
        .setLabel('🐞 Bug')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('reporte')
        .setLabel('📢 Reporte')
        .setStyle(ButtonStyle.Success)
    );

    // Crear un embed inicial para mostrar la opción de elegir una categoría
    const embed = new EmbedBuilder()
      .setColor('#0099FF')
      .setTitle('¡Gana puntos eligiendo una categoría!')
      .setDescription('Haz clic en un botón para ganar un punto en una de las categorías.')
      .setFooter({ text: '¡Tienes 15 segundos para elegir!' });

    // Enviar el mensaje con el embed y los botones
    await interaction.reply({
      embeds: [embed],
      components: [row],
    });

    // Crear un collector para manejar la interacción del botón
    const filter = i => i.user.id === interaction.user.id; // Filtra solo al usuario que hace clic
    const collector = interaction.channel.createMessageComponentCollector({
      filter,
      time: 15000, // El collector estará activo durante 15 segundos
    });

    collector.on('collect', async i => {
      const puntos = cargarPuntos();
      const usuario = i.user.id;

      // Inicializar el objeto del usuario si no existe
      if (!puntos[usuario]) {
        puntos[usuario] = { duda: 0, bug: 0, reporte: 0 };
      }

      // Incrementar los puntos dependiendo del botón presionado
      if (i.customId === 'duda') {
        puntos[usuario].duda += 1;
      } else if (i.customId === 'bug') {
        puntos[usuario].bug += 1;
      } else if (i.customId === 'reporte') {
        puntos[usuario].reporte += 1;
      }

      // Guardar los puntos actualizados
      guardarPuntos(puntos);

      // Crear un embed de confirmación con los puntos actualizados
      const confirmationEmbed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('¡Punto ganado! 🎉')
        .setDescription(`¡Has ganado un punto en la categoría **${i.customId.charAt(0).toUpperCase() + i.customId.slice(1)}**!`)
        .addFields(
          { name: 'Duda', value: `**${puntos[usuario].duda}** puntos`, inline: true },
          { name: 'Bug', value: `**${puntos[usuario].bug}** puntos`, inline: true },
          { name: 'Reporte', value: `**${puntos[usuario].reporte}** puntos`, inline: true }
        )
        .setFooter({ text: '¡Gracias por participar!' })
        .setTimestamp();

      // Deshabilitar todos los botones después de que el usuario haga clic en uno
      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('duda')
          .setLabel('❓ Duda')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId('bug')
          .setLabel('🐞 Bug')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId('reporte')
          .setLabel('📢 Reporte')
          .setStyle(ButtonStyle.Success)
          .setDisabled(true)
      );

      // Editar el mensaje para deshabilitar los botones y mostrar el embed de confirmación
      await i.update({
        embeds: [confirmationEmbed],
        components: [disabledRow],
      });
    });

    collector.on('end', collected => {
      // Después de 15 segundos, el collector termina y los botones se desactivan
      if (collected.size === 0) {
        interaction.editReply({
          content: '⏳ El tiempo para ganar puntos ha expirado. Vuelve a usar el comando para intentarlo nuevamente.',
          components: [],
        });
      }
    });
  },
};
