const fs = require('fs');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, ButtonBuilder, EmbedBuilder } = require('discord.js');
const path = require('path');

// Función para cargar los códigos desde el archivo JSON
function cargarCodigos() {
    try {
        return JSON.parse(fs.readFileSync('../../codigosVIP.json', 'utf8'));
    } catch (error) {
        return [];
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
        .setName('verificarcodigo')
        .setDescription('Verifica un código para obtener información')
        .addStringOption(option =>
            option.setName('codigo')
                .setDescription('Código a verificar')
                .setRequired(true)),

    async execute(interaction) {

        const staff = cargarStaff();
        const usuarioId = interaction.user.id;

        // Buscar al usuario en el archivo staff.json
        const miembro = staff.find(entry => entry.id === usuarioId);

        // Verificar si el usuario es parte del staff
        if (!miembro) {
            return interaction.reply({ content: '❌ No tienes permisos para ejecutar este comando. Solo los miembros del Staff pueden hacerlo.', ephemeral: true });
        }

        // Verificar si el usuario tiene el rol adecuado (Buy Manager o CEO)
        const tieneRolAdecuado = miembro.rangos && (miembro.rangos.includes('Buy Manager') || miembro.rangos.includes('CEO'));

        if (!tieneRolAdecuado) {
            return interaction.reply({ content: '❌ No tienes el tipo de staff adecuado para ejecutar este comando. Necesitas ser Buy Manager o CEO.', ephemeral: true });
        }

        const codigo = interaction.options.getString('codigo');

        // Cargar los códigos desde el archivo JSON
        const codigos = cargarCodigos();

        // Buscar el código en la base de datos
        const codigoData = codigos.find(c => c.codigo === codigo);

        if (!codigoData) {
            return interaction.reply('❌ Este código no existe o está mal escrito.');
        }

        // Verificar si el código ya ha sido canjeado
        const estado = codigoData.canjeado ? '✅ Ya ha sido canjeado' : '❌ Aún disponible';
        
        // Verificar si el código ha expirado
        const fechaExpiracion = new Date(codigoData.fechaExpiracion);
        const expirado = fechaExpiracion.getTime() < Date.now() ? '🔴 Expirado' : '🟢 Válido';

        // Crear el embed para mostrar la información
        const embed = new EmbedBuilder()
            .setColor('#FF5733')
            .setTitle('🔍 Verificación de Código')
            .setDescription(`Aquí está la información de tu código **${codigo}**:`)
            .addFields(
                { name: 'Producto', value: codigoData.producto, inline: true },
                { name: 'Estado', value: estado, inline: true },
                { name: 'Expiración', value: fechaExpiracion.toLocaleDateString(), inline: true },
                { name: 'Válido hasta', value: expirado, inline: true },
                { name: 'Generado por', value: `<@${codigoData.generadoPor}>`, inline: true }
            )
            .setThumbnail('https://i.imgur.com/1pghgnM.png')  // Thumbnail (puedes poner el logo de tu servidor o algo relacionado)
            .setFooter({ text: '¡Gracias por usar nuestro sistema de códigos!' });

        // Botón para más detalles o realizar alguna acción
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('mas_detalles')  // ID para manejar la interacción
                .setLabel('Ver más detalles')
                .setStyle('1')  // Estilo del botón
                .setEmoji('🔍')  // Emoji del botón
        );

        await interaction.reply({ embeds: [embed], components: [row] });

        // Crear un collector para manejar la interacción del botón
        const filter = (i) => i.customId === 'mas_detalles' && i.user.id === interaction.user.id;

        const collector = interaction.channel.createMessageComponentCollector({
            filter,
            time: 15000, // Tiempo de expiración (15 segundos)
        });

        collector.on('collect', async (i) => {
            // Mostrar más detalles cuando el botón sea presionado
            const detallesEmbed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('🔍 Detalles del Código')
                .setDescription(`Detalles adicionales sobre el código **${codigo}**:`)
                .addFields(
                    { name: 'Código', value: codigoData.codigo, inline: true },
                    { name: 'Producto', value: codigoData.producto, inline: true },
                    { name: 'Duración', value: `${codigoData.duracion} día(s)`, inline: true },
                    { name: 'Fecha de Expiración', value: new Date(codigoData.fechaExpiracion).toLocaleDateString(), inline: true },
                    { name: 'Generado por', value: `<@${codigoData.generadoPor}>`, inline: true },
                    { name: 'Estado', value: codigoData.canjeado ? 'Canjeado' : 'No canjeado', inline: true }
                )
                .setThumbnail('https://i.imgur.com/lY7z1J0.png') // Imagen de detalles
                .setFooter({ text: '¡Gracias por usar nuestro sistema de códigos!' });

            await i.reply({ embeds: [detallesEmbed], ephemeral: true }); // Mostrar detalles en un mensaje privado (ephemeral)

            collector.stop(); // Detener el collector después de la interacción
        });

        collector.on('end', () => {
            console.log('Collector terminado o expirado.');
        });
    },
};
