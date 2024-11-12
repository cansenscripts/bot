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
    .setName('verpuntosusuario')
    .setDescription('Muestra los puntos de otro usuario en las categorías Duda, Bug y Reporte.')
    .addUserOption(option =>
      option.setName('usuario')
        .setDescription('Selecciona el usuario para ver sus puntos.')
        .setRequired(true)
    ),
  
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
    const tieneRolAdecuado = miembro.rangos && (miembro.rangos.includes('Head Staff') || miembro.rangos.includes('Developer') || miembro.rangos.includes('CO') || miembro.rangos.includes('CEO'));
    
    if (!tieneRolAdecuado) {
        return interaction.reply({ content: '❌ No tienes el tipo de staff adecuado para ejecutar este comando. Necesitas ser minimo Head Staff.', ephemeral: true });
    }

    const puntos = cargarPuntos();
    const usuario = interaction.user.id;
    const usuarioSeleccionado = interaction.options.getUser('usuario');

    // Verificar si el usuario seleccionado tiene puntos registrados
    if (!puntos[usuarioSeleccionado.id]) {
      const embedNoPuntos = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('🚫 No hay puntos registrados para este usuario.')
        .setDescription(`${usuarioSeleccionado.username} no tiene puntos aún. ¡Anima a ese usuario a usar el comando \`/boton\` para ganar puntos!`)
        .setFooter({ text: '¡Haz clic en los botones para ganar puntos!' })
        .setTimestamp();

      return interaction.reply({
        embeds: [embedNoPuntos],
        ephemeral: true,
      });
    }

    // Obtener los puntos del usuario seleccionado
    const usuarioPuntos = puntos[usuarioSeleccionado.id];

    // Crear un embed con los puntos del usuario seleccionado
    const embedPuntos = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle(`🏆 Puntos de ${usuarioSeleccionado.username}`)
      .setDescription('Aquí están los puntos de este usuario en las categorías:')
      .addFields(
        { name: '❓ Duda', value: `${usuarioPuntos.duda} puntos`, inline: true },
        { name: '🐞 Bug', value: `${usuarioPuntos.bug} puntos`, inline: true },
        { name: '📢 Reporte', value: `${usuarioPuntos.reporte} puntos`, inline: true }
      )
      .setFooter({ text: '¡Sigue participando para ganar más puntos!' })
      .setTimestamp();

    await interaction.reply({
      embeds: [embedPuntos],
      ephemeral: true,
    });
  },
};
