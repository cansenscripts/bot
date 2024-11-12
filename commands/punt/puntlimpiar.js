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

// Guardar los puntos actualizados en el archivo JSON
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
    .setName('limpiarpuntos')
    .setDescription('Limpia los puntos de un usuario.')
    .addUserOption(option =>
      option.setName('usuario')
        .setDescription('Selecciona el usuario cuyos puntos deseas limpiar.')
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
    const tieneRolAdecuado = miembro.rangos && (miembro.rangos.includes('High Staff') || miembro.rangos.includes('Head Staff') || miembro.rangos.includes('Developer') || miembro.rangos.includes('CO') || miembro.rangos.includes('CEO'));
    
    if (!tieneRolAdecuado) {
        return interaction.reply({ content: '❌ No tienes el tipo de staff adecuado para ejecutar este comando. Necesitas ser minimo High Staff.', ephemeral: true });
    }

    const puntos = cargarPuntos();
    const usuarioSeleccionado = interaction.options.getUser('usuario');

    // Verificar si el usuario seleccionado tiene puntos registrados
    if (!puntos[usuarioSeleccionado.id]) {
      const embedNoPuntos = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('🚫 No se encontraron puntos para este usuario.')
        .setDescription(`${usuarioSeleccionado.username} no tiene puntos registrados. ¡No es necesario limpiar sus puntos!`)
        .setFooter({ text: '¡Usa el comando \`/boton\` para ganar puntos!' })
        .setTimestamp();

      return interaction.reply({
        embeds: [embedNoPuntos],
        ephemeral: true,
      });
    }

    // Limpiar los puntos del usuario seleccionado
    delete puntos[usuarioSeleccionado.id];

    // Guardar los puntos actualizados
    guardarPuntos(puntos);

    // Crear un embed de confirmación
    const embedConfirmacion = new EmbedBuilder()
      .setColor('#FF4500')  // Naranja (para indicar eliminación)
      .setTitle('✅ Puntos Limpiados')
      .setDescription(`Los puntos de **${usuarioSeleccionado.username}** han sido limpiados con éxito.`)
      .setFooter({ text: 'Los puntos han sido restablecidos a cero.' })
      .setTimestamp();

    // Enviar confirmación al usuario que ejecutó el comando
    await interaction.reply({
      embeds: [embedConfirmacion],
      ephemeral: true,
    });
  },
};
