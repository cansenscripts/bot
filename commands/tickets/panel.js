const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionsBitField } = require('discord.js');
const fs = require('fs');

// Cargar el archivo de tickets si existe
let ticketsData = {};
if (fs.existsSync('./tickets.json')) {
    ticketsData = JSON.parse(fs.readFileSync('./tickets.json', 'utf8'));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Crea un ticket de soporte'),

    async execute(interaction) {
        // Crear los botones para diferentes tipos de ticket
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('duda_ticket')
                .setLabel('Duda')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('bugs_ticket')
                .setLabel('Bugs')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('reporte_ticket')
                .setLabel('Reporte')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('otro_ticket')
                .setLabel('Otro')
                .setStyle(ButtonStyle.Success)
        );

        // Enviar mensaje con los botones para crear un ticket
        await interaction.reply({
            content: 'Haz clic en uno de los botones para crear un tipo de ticket.',
            components: [row],
        });

        // Crear un collector para los botones
        const filter = i => i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter });

        collector.on('collect', async (i) => {
            const ticketType = i.customId.split('_')[0]; // Obtener tipo de ticket (duda, bugs, reporte, otro)

            // Mapeo de los tipos de tickets a las categorías correspondientes
            const categoryIds = {
                duda: '1305615006380851210',  // Categoría Dudas
                bugs: '1305615313861345382',  // Categoría Bugs
                reporte: '1305615326955966494',  // Categoría Reporte
                otro: '1305615344731295887'   // Categoría Otro
            };

            // Verificar si el usuario ya tiene un ticket abierto
            if (ticketsData[interaction.user.id]) {
                const existingTicket = ticketsData[interaction.user.id];
                const existingChannel = `<#${existingTicket.channelId}>`; // Obtener el canal usando su ID
                return i.reply({ 
                    content: `Ya tienes un ticket abierto en la categoría: ${existingTicket.category}. Puedes verlo aquí: ${existingChannel} (ID: ${existingTicket.channelId}). No puedes crear otro ticket.`, 
                    ephemeral: true 
                });
            }

            // Generar un ID único para el ticket
            const ticketId = Object.keys(ticketsData).length + 1; // Incrementamos el ID basado en el tamaño actual de ticketsData

            // Crear el canal privado para el ticket con la categoría correspondiente
            const ticketChannel = await interaction.guild.channels.create({
                name: `ticket-${ticketId}-${interaction.user.username}`, // Nombre del canal con ID y nombre de usuario
                type: 0, // Canal de texto
                parent: categoryIds[ticketType], // Asignamos la categoría en función del tipo de ticket
                permissionOverwrites: [
                    {
                        id: interaction.guild.id, // Denegar acceso a todos los miembros del servidor
                        deny: [PermissionsBitField.Flags.ViewChannel],
                    },
                    {
                        id: interaction.user.id, // Permitir acceso solo al usuario que crea el ticket
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                    },
                ],
            });

            // Guardar el ticket en el archivo .json
            ticketsData[interaction.user.id] = {
                id: ticketId,
                category: ticketType,
                openedAt: new Date().toISOString(),
                createdBy: interaction.user.username,
                claimedBy: null, // Inicialmente nadie ha reclamado el ticket
                channelId: ticketChannel.id, // Guardamos el ID del canal
            };
            fs.writeFileSync('./tickets.json', JSON.stringify(ticketsData, null, 2));

            // Crear botones para claim y borrar el ticket
            const claimRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('claim_ticket')
                    .setLabel('💼 Claim')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('delete_ticket')
                    .setLabel('🗑️ Borrar Ticket')
                    .setStyle(ButtonStyle.Danger)
            );

            // Crear un embed de bienvenida con más detalles
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('🎫 ¡Ticket creado con éxito! 🎉')
                .setDescription(`¡Hola <@${interaction.user.id}>! Este es tu ticket de tipo **${ticketType}**. ¿En qué podemos ayudarte?`)
                .addFields(
                    { name: '📅 Fecha de Creación', value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: true },
                    { name: '🧑‍💻 Creado por', value: interaction.user.username, inline: true },
                    { name: '📂 Categoría', value: ticketType, inline: true },
                    { name: '🔑 ID del Ticket', value: ticketId.toString(), inline: true }
                )
                .setFooter({ text: 'Recuerda usar los botones para interactuar con el ticket.' });

            // Enviar mensaje en el canal de ticket con el embed y los botones
            await ticketChannel.send({
                embeds: [embed],
                components: [claimRow],
            });

            // Evitar enviar respuesta duplicada a la interacción
            if (!i.replied) {
                await i.reply({
                    content: `Tu ticket ha sido creado en el canal: ${ticketChannel}`,
                    ephemeral: true,
                });
            }

            // Crear un collector para manejar las interacciones dentro del canal del ticket
            const ticketCollector = ticketChannel.createMessageComponentCollector({
                filter: (i) => ['claim_ticket', 'delete_ticket'].includes(i.customId),
            });

            ticketCollector.on('collect', async (i) => {
                // Verificar si el usuario es el autorizado para reclamar el ticket
                const claimableUserId = '806747477793177661';

                if (i.customId === 'claim_ticket') {
                    if (ticketsData[interaction.user.id].claimedBy) {
                        return i.reply({ content: 'Este ticket ya ha sido reclamado.', ephemeral: true });
                    }

                    if (i.user.id !== claimableUserId) {
                        return i.reply({ content: 'No tienes permisos para reclamar este ticket.', ephemeral: true });
                    }

                    // Marcar el ticket como reclamado
                    ticketsData[interaction.user.id].claimedBy = i.user.id;

                    // Editar el embed para mostrar quién lo reclamó
                    const updatedEmbed = new EmbedBuilder(embed)
                        .addFields(
                            { name: '👤 Reclamo realizado por', value: `<@${i.user.id}>`, inline: true }
                        );

                    // Deshabilitar el botón de claim
                    await i.update({
                        content: '¡Este ticket ha sido reclamado!',
                        embeds: [updatedEmbed],
                        components: [
                            new ActionRowBuilder().addComponents(
                                new ButtonBuilder()
                                    .setCustomId('claim_ticket')
                                    .setLabel('💼 Claim')
                                    .setStyle(ButtonStyle.Primary)
                                    .setDisabled(true),  // Deshabilitar el botón
                                new ButtonBuilder()
                                    .setCustomId('delete_ticket')
                                    .setLabel('🗑️ Borrar Ticket')
                                    .setStyle(ButtonStyle.Danger)
                            )
                        ]
                    });

                    // Guardar los cambios en el archivo
                    fs.writeFileSync('./tickets.json', JSON.stringify(ticketsData, null, 2));

                }

                if (i.customId === 'delete_ticket') {
                    try {
                        // Primero responder a la interacción antes de eliminar el canal
                        await i.reply({ content: 'El ticket será eliminado ahora.', ephemeral: true });

                        const deleteEmbed = new EmbedBuilder()
                            .setColor('#ff0000')
                            .setTitle('🗑️ Ticket Borrado')
                            .setDescription('Este ticket ha sido completamente eliminado.')
                            .setFooter({ text: 'Gracias por usar nuestro sistema de soporte.' });

                        await ticketChannel.send({ embeds: [deleteEmbed] });

                        // Borrar el canal de ticket
                        await ticketChannel.delete();

                        // Eliminar el ticket del archivo .json
                        delete ticketsData[interaction.user.id];
                        fs.writeFileSync('./tickets.json', JSON.stringify(ticketsData, null, 2));

                    } catch (error) {
                        console.error('Error al eliminar el ticket:', error);
                        await i.reply({ content: 'Hubo un error al intentar eliminar el ticket.', ephemeral: true });
                    }
                }
            });
        });
    },
};
