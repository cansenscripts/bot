const fs = require('fs');
const crypto = require('crypto');
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

function guardarCodigos(codigos) {
    fs.writeFileSync('../../codigosVIP.json', JSON.stringify(codigos, null, 2));
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
        .setName('generarcodigo')
        .setDescription('Genera un código para un producto VIP')
        .addStringOption(option =>
            option.setName('producto')
                .setDescription('Producto para el código (Mafias, Hud, Radio, Staff, Personalizado)')
                .setRequired(true)
                .addChoices(
                    { name: 'Mafias', value: 'Mafias' },
                    { name: 'Hud', value: 'Hud' },
                    { name: 'Radio', value: 'Radio' },
                    { name: 'Staff', value: 'Staff' },
                    { name: 'Personalizado', value: 'Personalizado' },
                ))
        .addStringOption(option =>
            option.setName('duracion')
                .setDescription('Duración del código (1 día, 7 días, 30 días)')
                .setRequired(true)
                .addChoices(
                    { name: '1 Día', value: '1' },
                    { name: '7 Días', value: '7' },
                    { name: '30 Días', value: '30' },
                )),

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

        const producto = interaction.options.getString('producto');
        const duracion = parseInt(interaction.options.getString('duracion'));
        const codigo = crypto.randomBytes(6).toString('hex').toUpperCase(); // Generar código aleatorio

        const fechaExpiracion = new Date();
        fechaExpiracion.setDate(fechaExpiracion.getDate() + duracion);

        // Cargar los códigos existentes
        const codigos = cargarCodigos();

        // Guardar el nuevo código
        codigos.push({
            codigo,
            producto,
            duracion,
            fechaExpiracion: fechaExpiracion.toISOString(),
            generadoPor: interaction.user.id,
            canjeado: false,
        });

        // Guardar los códigos actualizados en el archivo
        guardarCodigos(codigos);

        // Crear un embed con la información
        const embed = new EmbedBuilder()
            .setColor('#ffcc00')
            .setTitle('🎉 ¡Código Generado con Éxito! 🎉')
            .setDescription(`¡El código VIP **${codigo}** ha sido generado con éxito!`)
            .addFields(
                { name: 'Producto', value: producto, inline: true },
                { name: 'Duración', value: `${duracion} día(s)`, inline: true },
                { name: 'Expira el', value: fechaExpiracion.toLocaleDateString(), inline: true },
                { name: 'Generado por', value: `<@${interaction.user.id}>`, inline: true }
            )
            .setThumbnail('https://i.imgur.com/lY7z1J0.png') // Imagen de código
            .setFooter({ text: '¡Gracias por usar nuestro sistema de códigos!' });

        // Botón para copiar el código
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('copiar_codigo')
                .setLabel('Copiar Código')
                .setStyle('1')
                .setEmoji('📋')
        );

        // Responder al usuario con el embed y el botón
        await interaction.reply({ embeds: [embed], components: [row] });

        // Filtro para la interacción del botón (solo para el usuario que lo generó)
        const filter = (i) => i.customId === 'copiar_codigo' && i.user.id === interaction.user.id;

        // Crear un collector de la interacción para manejar el clic en el botón
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15000 });

        collector.on('collect', async (i) => {
            try {
                // Enviar el código al DM del usuario
                await i.user.send(`📋 Aquí tienes tu código: **${codigo}**`);

                // Responder al usuario en el canal original
                await i.reply({ content: '✅ El código ha sido enviado a tu DM.', ephemeral: true });
            } catch (error) {
                console.error('Error al enviar el código al DM:', error);
                // Si hay un error enviando el DM, notificamos al usuario
                await i.reply({ content: '❌ No pude enviarte un mensaje directo. Asegúrate de tener los DMs habilitados.', ephemeral: true });
            }
        });

        collector.on('end', () => {
            // Puedes agregar algún comportamiento cuando termine el tiempo de interacción
            console.log('Collector de interacción terminado.');
        });
    },
};
