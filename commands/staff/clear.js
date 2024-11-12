const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

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
    .setName('clear')
    .setDescription('Elimina una cantidad específica de mensajes del canal.')
    .addIntegerOption(option => 
      option.setName('cantidad')
        .setDescription('Número de mensajes a eliminar')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    ),
  
  async execute(interaction) {
    // Obtener el número de mensajes a eliminar
    const cantidad = interaction.options.getInteger('cantidad');

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

    try {
      // Obtener los mensajes más recientes en el canal
      const messages = await interaction.channel.messages.fetch({ limit: cantidad });

      // Eliminar los mensajes obtenidos
      await interaction.channel.bulkDelete(messages, true); // El segundo parámetro es para eliminar mensajes de más de 14 días

      // Crear un Embed de éxito
      const successEmbed = new EmbedBuilder()
        .setColor('#00FF00')  // Verde para éxito
        .setTitle('¡Mensajes eliminados correctamente! ✅')
        .setDescription(`He eliminado **${messages.size}** mensajes en este canal.`)

      // Enviar el Embed de éxito
      return interaction.reply({ embeds: [successEmbed], ephemeral: true });
    } catch (error) {
      console.error(error);
      
      // Crear un Embed de error
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')  // Rojo para error
        .setTitle('Hubo un error ❌')
        .setDescription('No pude eliminar los mensajes debido a un error.')
        .addField('Detalles:', error.message)
        .setFooter('Intenta de nuevo más tarde.');

      return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
    
  },
};
