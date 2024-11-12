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
        .setName('liststaff')
        .setDescription('Muestra la lista de miembros del Staff y sus respectivos rangos'),

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
        const tieneRolAdecuado = miembro.rangos && (miembro.rangos.includes('Mid Staff') ||  miembro.rangos.includes('Low Staff') || miembro.rangos.includes('High Staff') || miembro.rangos.includes('Head Staff') || miembro.rangos.includes('Developer') || miembro.rangos.includes('CO') || miembro.rangos.includes('CEO'));
        
        if (!tieneRolAdecuado) {
            return interaction.reply({ content: '❌ No tienes el tipo de staff adecuado para ejecutar este comando. Necesitas ser minimo Low Staff.', ephemeral: true });
        }

        // Si no hay miembros en el staff
        if (staff.length === 0) {
            return interaction.reply({ content: '❌ No hay usuarios en el Staff aún.', ephemeral: true });
        }

        // Crear el embed para mostrar la lista de staff
        const embed = new EmbedBuilder()
            .setColor('#4CAF50')
            .setTitle('📋 Lista de Miembros del Staff')
            .setDescription('A continuación se muestra la lista de todos los miembros del Staff y sus respectivos rangos:')
            .setThumbnail('https://i.imgur.com/B5HXrf0.png')  // Logo o imagen representativa del staff
            .setFooter({ text: '¡Gracias por tu dedicación al servidor!' });

        // Añadir cada miembro del staff al embed
        staff.forEach((miembro, index) => {
            const user = interaction.guild.members.cache.get(miembro.id);
            const username = user ? user.user.tag : 'Usuario no encontrado';

            // Mostrar los rangos del miembro
            const rangos = miembro.rangos.join(', ') || 'Sin rango asignado';

            embed.addFields(
                { name: `🧑‍💼 **${username}**`, value: `Rango(s): **${rangos}**`, inline: false }
            );
        });

        // Enviar el embed con la lista de staff
        await interaction.reply({ embeds: [embed] });
    }
};
