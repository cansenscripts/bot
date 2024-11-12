const fs = require('fs');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, ButtonBuilder, EmbedBuilder } = require('discord.js');

// Cargar los códigos y usuarios desde los archivos JSON
function cargarCodigos() {
    try {
        return JSON.parse(fs.readFileSync('../../codigosVIP.json', 'utf8'));
    } catch (error) {
        return [];
    }
}

function cargarUsuarios() {
    try {
        return JSON.parse(fs.readFileSync('../../usuariosVIP.json', 'utf8'));
    } catch (error) {
        return [];
    }
}

function guardarCodigos(codigos) {
    fs.writeFileSync('./codigosVIP.json', JSON.stringify(codigos, null, 2));
}

function guardarUsuarios(usuarios) {
    fs.writeFileSync('./usuariosVIP.json', JSON.stringify(usuarios, null, 2));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('canjearcodigo')
        .setDescription('Canjea un código para obtener acceso VIP')
        .addStringOption(option =>
            option.setName('codigo')
                .setDescription('Código a canjear')
                .setRequired(true)),

    async execute(interaction) {
        const codigo = interaction.options.getString('codigo');

        // Cargar los códigos y usuarios desde los archivos JSON
        const codigos = cargarCodigos();
        const usuarios = cargarUsuarios();

        // Verificar si el usuario ya tiene un código canjeado (si ya es VIP)
        const usuarioVIP = usuarios.find(u => u.userID === interaction.user.id);

        if (usuarioVIP) {
            return interaction.reply('❌ Ya eres un usuario VIP y no puedes canjear otro código.');
        }

        // Buscar el código en la base de datos
        const codigoData = codigos.find(c => c.codigo === codigo);

        if (!codigoData) {
            return interaction.reply('❌ Este código no existe o está mal escrito.');
        }

        // Verificar si el código ya ha sido canjeado
        if (codigoData.canjeado) {
            return interaction.reply('❌ Este código ya ha sido canjeado.');
        }

        // Verificar si el código ha expirado
        const fechaExpiracion = new Date(codigoData.fechaExpiracion);
        if (fechaExpiracion < Date.now()) {
            return interaction.reply('❌ Este código ha expirado.');
        }

        // Marcar el código como canjeado
        codigoData.canjeado = true;
        guardarCodigos(codigos);

        // Guardar al usuario como VIP
        usuarios.push({
            userID: interaction.user.id,
            codigoCanjeado: codigo,
            fechaCanjeo: new Date().toISOString(),
            fechaExpiracion: codigoData.fechaExpiracion,
        });
        guardarUsuarios(usuarios);

        // Crear un embed de respuesta
        const embed = new EmbedBuilder()
            .setColor('#4CAF50')
            .setTitle('🎉 ¡Código Canjeado Exitosamente! 🎉')
            .setDescription(`El código **${codigo}** ha sido canjeado con éxito. ¡Ahora eres un usuario VIP!`)
            .addFields(
                { name: 'Producto', value: codigoData.producto, inline: true },
                { name: 'Duración', value: `${codigoData.duracion} día(s)`, inline: true },
                { name: 'Expira el', value: fechaExpiracion.toLocaleDateString(), inline: true },
                { name: 'Generado por', value: `<@${codigoData.generadoPor}>`, inline: true }
            )
            .setThumbnail('https://i.imgur.com/lY7z1J0.png') // Imagen de éxito
            .setFooter({ text: '¡Gracias por usar nuestro sistema de códigos!' });

        // Botón para acceder a más detalles sobre el código
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('detalles_codigo')
                .setLabel('Ver detalles')
                .setStyle('2')
                .setEmoji('🔍')
        );

        await interaction.reply({ embeds: [embed], components: [row] });
    },
};
