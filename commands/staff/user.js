const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, ButtonBuilder, EmbedBuilder } = require('discord.js');
const { PermissionsBitField } = require('discord.js');
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
        .setName('acciones')
        .setDescription('¡Elige a un usuario y toma acción con botones! Banear, Kickear o Timeout')
        .addUserOption(option => 
            option.setName('usuario')
                .setDescription('Selecciona un usuario para aplicar una acción')
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

        // Obtener al usuario seleccionado
        const usuario = interaction.options.getUser('usuario');
        const member = interaction.guild.members.cache.get(usuario.id);

        // Verificar que el usuario no sea el propio interactuante ni el bot
        if (member.id === interaction.user.id) {
            return interaction.reply({ content: '⚠️ No puedes seleccionar a ti mismo.', ephemeral: true });
        }

        if (member.id === interaction.client.user.id) {
            return interaction.reply({ content: '⚠️ No puedes seleccionar al bot.', ephemeral: true });
        }

        // Crear un embed para mostrar la selección
        const embed = new EmbedBuilder()
            .setColor('#FF4500') // Naranja brillante para el comando
            .setTitle('🌟 Acciones Disponibles')
            .setDescription(`Has seleccionado a **${member.user.tag}**. ¿Qué acción te gustaría realizar?`)
            .setThumbnail(member.user.displayAvatarURL())
            .addFields(
                { name: '✨ Acción', value: 'Selecciona una de las opciones con los botones abajo:', inline: false },
                { name: '⚠️ ¡Recuerda!', value: 'Solo los moderadores pueden ejecutar estas acciones.', inline: false }
            )
            .setFooter({ text: '¡Actúa sabiamente y con respeto!' })
            .setTimestamp();

        // Crear botones para las acciones
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('ban')
                .setLabel('🚫 **Banear**')
                .setStyle('DANGER')
                .setEmoji('🚨')
                .setDisabled(false),
            new ButtonBuilder()
                .setCustomId('kick')
                .setLabel('👢 **Kickear**')
                .setStyle('PRIMARY')
                .setEmoji('⚡')
                .setDisabled(false),
            new ButtonBuilder()
                .setCustomId('timeout')
                .setLabel('⏱️ **Timeout**')
                .setStyle('SECONDARY')
                .setEmoji('🕰️')
                .setDisabled(false)
        );

        // Enviar el mensaje con los botones
        await interaction.reply({ embeds: [embed], components: [row] });

        // Crear el collector para los botones
        const filter = i => i.user.id === interaction.user.id; // Filtrar las interacciones solo del usuario que ejecutó el comando
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 30000 }); // Collector por 30 segundos

        collector.on('collect', async i => {
            try {
                // Responder solo una vez, deshabilitar los botones después de la acción
                if (i.replied) return; // No permitir que se responda dos veces

                if (i.customId === 'ban') {
                    // Verificar si el usuario tiene permisos para banear
                    if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
                        return i.reply({ content: '❌ No tienes permisos para banear a otros usuarios.', ephemeral: true });
                    }

                    await member.ban({ reason: 'Baneado por el comando de acciones.' });
                    await i.reply({ content: `🔥 **${member.user.tag}** ha sido baneado con éxito. ¡Hasta nunca! 🔥` });

                } else if (i.customId === 'kick') {
                    // Verificar si el usuario tiene permisos para kickear
                    if (!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
                        return i.reply({ content: '❌ No tienes permisos para kickear a otros usuarios.', ephemeral: true });
                    }

                    await member.kick('Expulsado por el comando de acciones.');
                    await i.reply({ content: `⚡ **${member.user.tag}** ha sido kickeado con éxito. ¡Adiós! ⚡` });

                } else if (i.customId === 'timeout') {
                    // Verificar si el usuario tiene permisos para hacer timeout
                    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
                        return i.reply({ content: '❌ No tienes permisos para aplicar un timeout a otros usuarios.', ephemeral: true });
                    }

                    // Aplicar timeout (suponemos 1 hora de timeout)
                    await member.timeout(3600000, 'Timeout aplicado por el comando de acciones');
                    await i.reply({ content: `⏱️ **${member.user.tag}** ha sido puesto en timeout por 1 hora. ¡Tómate un descanso! ⏱️` });
                }
            } catch (error) {
                console.error('Error al intentar realizar la acción:', error);
                await i.reply({ content: '❌ Hubo un error al intentar realizar la acción.', ephemeral: true });
            }
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                interaction.followUp({ content: '⏳ El tiempo para elegir una acción ha expirado. ¡Intenta de nuevo!', ephemeral: true });
            }
        });
    }
};
