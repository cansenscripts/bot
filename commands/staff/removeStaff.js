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

// Función para guardar el archivo miembros_staff.json
function guardarStaff(staff) {
    try {
        console.log('Guardando los datos en miembros_staff.json:', JSON.stringify(staff, null, 2)); // Verificar los datos antes de guardar
        fs.writeFileSync(staffFilePath, JSON.stringify(staff, null, 2));
    } catch (error) {
        console.error('Error al guardar el archivo miembros_staff.json:', error);
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removestaff')
        .setDescription('Remueve a un usuario del staff')
        .addUserOption(option => 
            option.setName('usuario')
                .setDescription('Selecciona el usuario que quieres remover del staff')
                .setRequired(true)
        ),

    async execute(interaction) {
        // Solo el dueño del bot o administradores pueden usar este comando
        if (interaction.user.id !== '806747477793177661' && !interaction.member.permissions.has('Administrator')) {
            return interaction.reply({ content: '❌ No tienes permisos para usar este comando.', ephemeral: true });
        }

        const usuario = interaction.options.getUser('usuario');
        const staff = cargarStaff();

        // Buscar al usuario en la lista de staff
        const index = staff.findIndex(miembro => miembro.id === usuario.id);

        if (index === -1) {
            return interaction.reply({ content: `❌ **${usuario.tag}** no está en el staff.`, ephemeral: true });
        }

        // Eliminar al usuario del staff
        staff.splice(index, 1);
        guardarStaff(staff);

        // Crear el embed de éxito
        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('🔴 Miembro Removido del Staff')
            .setDescription(`**${usuario.tag}** ha sido removido del staff correctamente.`)
            .setThumbnail(usuario.displayAvatarURL())
            .setFooter({ text: '¡La lista de staff se ha actualizado!' });

        // Responder con el embed
        await interaction.reply({ embeds: [embed] });
    }
};
