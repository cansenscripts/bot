const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
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
    .setName('listapuntos')
    .setDescription('Muestra la lista de puntos de todos los usuarios en las categorías Duda, Bug y Reporte.'),
  async execute(interaction) {
    const puntos = cargarPuntos();

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

    // Si no hay puntos registrados, informar al usuario
    if (Object.keys(puntos).length === 0) {
      const embedNoPuntos = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('🚫 No hay puntos registrados.')
        .setDescription('No hay usuarios que hayan ganado puntos aún. ¡Anima a los usuarios a usar el comando `/boton`!')
        .setFooter({ text: '¡Comienza a ganar puntos ahora!' })
        .setTimestamp();

      return interaction.reply({
        embeds: [embedNoPuntos],
        ephemeral: true,
      });
    }

    // Crear un embed con la lista de puntos de todos los usuarios
    const embedLista = new EmbedBuilder()
      .setColor('#FFD700')  // Color dorado para la lista
      .setTitle('🏆 Lista de Puntos de Todos los Usuarios')
      .setDescription('Aquí están los puntos de todos los usuarios por categoría.')
      .setFooter({ text: '¡Sigue participando para ganar más puntos!' })
      .setTimestamp();

    // Crear una lista de puntos para todos los usuarios
    let listaDePuntos = '';
    for (const [userId, puntosUsuario] of Object.entries(puntos)) {
      // Obtener el usuario de Discord
      const user = await interaction.client.users.fetch(userId).catch(() => null);
      const username = user ? user.username : 'Usuario Desconocido';  // Nombre del usuario

      // Crear el texto con los puntos del usuario
      listaDePuntos += `**${username}**: \n`;
      listaDePuntos += `  ❓ Duda: **${puntosUsuario.duda}** puntos\n`;
      listaDePuntos += `  🐞 Bug: **${puntosUsuario.bug}** puntos\n`;
      listaDePuntos += `  📢 Reporte: **${puntosUsuario.reporte}** puntos\n\n`;
    }

    // Añadir la lista de puntos al embed
    embedLista.addFields({ name: 'Puntos por Usuario', value: listaDePuntos, inline: false });

    // Enviar el embed con la lista completa de puntos
    await interaction.reply({
      embeds: [embedLista],
      ephemeral: true,
    });
  },
};
