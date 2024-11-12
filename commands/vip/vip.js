const fs = require('fs');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, ButtonBuilder, EmbedBuilder } = require('discord.js');

// Cargar los usuarios VIP desde el archivo JSON
function cargarUsuarios() {
    try {
        return JSON.parse(fs.readFileSync('../../usuariosVIP.json', 'utf8'));
    } catch (error) {
        return [];
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('comandovip')
        .setDescription('Comando exclusivo para usuarios VIP'),

    async execute(interaction) {
        // Cargar los usuarios VIP desde el archivo
        const usuarios = cargarUsuarios();

        // Buscar al usuario en la lista de VIPs
        const usuarioVIP = usuarios.find(u => u.userID === interaction.user.id);

        if (!usuarioVIP) {
            return interaction.reply('❌ No tienes acceso a este comando porque no eres VIP.');
        }

        // Verificar la fecha de expiración del código
        const fechaExpiracion = new Date(usuarioVIP.fechaExpiracion);
        if (fechaExpiracion < Date.now()) {
            return interaction.reply('❌ Tu acceso VIP ha expirado.');
        }

        // Crear un embed con la información del usuario VIP
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🌟 ¡Bienvenido, VIP! 🌟')
            .setDescription('¡Tu acceso VIP es válido! Aquí están los detalles:')
            .addFields(
                { name: 'Código Canjeado', value: usuarioVIP.codigoCanjeado, inline: true },
                { name: 'Fecha de Canjeo', value: new Date(usuarioVIP.fechaCanjeo).toLocaleDateString(), inline: true },
                { name: 'Fecha de Expiración', value: fechaExpiracion.toLocaleDateString(), inline: true }
            )
            .setThumbnail('https://i.imgur.com/kOcdV9j.png') // Imagen VIP
            .setFooter({ text: '¡Gracias por usar nuestro sistema de códigos!' });

        // Botón para descargar el producto o ver más detalles
        await interaction.reply({ embeds: [embed] });
    },
};
