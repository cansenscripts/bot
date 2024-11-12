const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Ruta al nuevo archivo JSON
const staffFilePath = path.join(__dirname, '..', '..', 'miembros_staff.json'); // Asegúrate de que esta ruta sea correcta

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
        .setName('setstaff')
        .setDescription('Agrega o modifica el rol de un usuario en el staff')
        .addUserOption(option => 
            option.setName('usuario')
                .setDescription('Selecciona el usuario para agregar al staff')
                .setRequired(true)
        )
        .addStringOption(option => 
            option.setName('rango')
                .setDescription('Selecciona el tipo de staff que será el usuario')
                .setRequired(true)
                .addChoices(
                    { name: 'Low Staff', value: 'Low Staff' },
                    { name: 'Mid Staff', value: 'Mid Staff' },
                    { name: 'High Staff', value: 'High Staff' },
                    { name: 'Head Staff', value: 'Head Staff' },
                    { name: 'Buy Manager', value: 'Buy Manager' },
                    { name: 'Developer', value: 'Developer' },
                    { name: 'CO', value: 'CO' },
                    { name: 'CEO', value: 'CEO' }
                )
        ),

    async execute(interaction) {
        // Solo el dueño del bot o administradores pueden usar este comando
        if (interaction.user.id !== '806747477793177661' && !interaction.member.permissions.has('Administrator')) {
            return interaction.reply({ content: '❌ No tienes permisos para usar este comando.', ephemeral: true });
        }

        const usuario = interaction.options.getUser('usuario');
        const rango = interaction.options.getString('rango');
        const staff = cargarStaff();

        // Verificar si el usuario ya está en la lista de staff
        const existingStaff = staff.find(member => member.id === usuario.id);

        if (existingStaff) {
            // Si el usuario ya tiene roles de staff, agregamos el nuevo rango sin duplicarlo
            if (!existingStaff.rangos.includes(rango)) {
                existingStaff.rangos.push(rango);
            } else {
                return interaction.reply({ content: `El usuario **${usuario.tag}** ya tiene el rol **${rango}** asignado.`, ephemeral: true });
            }
        } else {
            // Si el usuario no tiene ningún rol, lo agregamos con el rango especificado
            staff.push({ id: usuario.id, tag: usuario.tag, rangos: [rango] });
        }

        // Guardar los cambios
        guardarStaff(staff);

        // Crear un embed visual atractivo
        const embed = new EmbedBuilder()
            .setColor('#28A745')
            .setTitle('✨ Miembro Agregado o Modificado en el Staff')
            .setDescription(`**${usuario.tag}** ha sido agregado/modificado en el staff con el rango **${rango}**.`)
            .setThumbnail(usuario.displayAvatarURL())
            .setFooter({ text: '¡La lista de staff ha sido actualizada!' })
            .setTimestamp();

        // Responder con el embed
        await interaction.reply({ embeds: [embed] });
    }
};
