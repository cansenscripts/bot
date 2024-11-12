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
        .setName('vercodigos')
        .setDescription('Ver todos los códigos generados y su estado'),

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

        const codigos = cargarCodigos();

        if (codigos.length === 0) {
            return interaction.reply('❌ No hay códigos generados aún.');
        }

        // Crear el embed para mostrar los códigos
        const embed = new EmbedBuilder()
            .setColor('#1E90FF')
            .setTitle('📜 Lista de Códigos Generados')
            .setDescription('Aquí están todos los códigos generados hasta ahora:')
            .setThumbnail('https://i.imgur.com/B5HXrf0.png')  // Icono para ilustrar la lista
            .setFooter({ text: '¡Gracias por usar nuestro sistema de códigos!' });

        codigos.forEach((codigoData, index) => {
            const estado = codigoData.canjeado ? '✅ Canjeado' : '❌ No canjeado';
            const fechaExpiracion = new Date(codigoData.fechaExpiracion).toLocaleDateString();
            embed.addFields(
                { 
                    name: `Código: **${codigoData.codigo}**`, 
                    value: `Producto: ${codigoData.producto}\nEstado: ${estado}\nExpiración: ${fechaExpiracion}\nGenerado por: <@${codigoData.generadoPor}>`,
                    inline: false
                }
            );
        });

        // Botón para ver más detalles de un código específico
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('ver_detalles_codigos')
                .setLabel('Ver detalles de código')
                .setStyle('1') // Estilo de botón
                .setEmoji('🔍')
        );

        await interaction.reply({ embeds: [embed], components: [row] });

        // Crear un collector para manejar la interacción del botón
        const filter = (i) => i.customId === 'ver_detalles_codigos' && i.user.id === interaction.user.id;

        const collector = interaction.channel.createMessageComponentCollector({
            filter,
            time: 15000, // Tiempo límite de 15 segundos
        });

        collector.on('collect', async (i) => {
            // Mostrar más detalles cuando el botón sea presionado
            const codigoData = codigos[0];  // Aquí debes seleccionar el código de alguna forma, como por índice o ID
            
            const detallesEmbed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('🔍 Detalles del Código Canjeado')
                .setDescription(`Detalles sobre el código **${codigoData.codigo}**:`)
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

            await i.reply({ embeds: [detallesEmbed], ephemeral: true }); // Enviar los detalles como respuesta privada

            collector.stop(); // Detener el collector una vez que el usuario ha interactuado
        });

        collector.on('end', () => {
            console.log('Collector terminado o expirado.');
        });
    },
};
