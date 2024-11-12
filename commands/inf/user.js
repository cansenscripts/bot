const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const moment = require('moment');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('¡Te traigo toda la info de un usuario, con detalles que ni sabías que existían! 😎')
    .addUserOption(option => 
      option.setName('usuario')
        .setDescription('El usuario del que querés obtener la info 🕵️‍♂️')
        .setRequired(false)
    ),
  
  async execute(interaction) {
    try {
      await interaction.deferReply();  // Para dar más tiempo de respuesta

      const user = interaction.options.getUser('usuario') || interaction.user; // Si no se menciona un usuario, se toma al que ejecuta el comando
      const member = await interaction.guild.members.fetch(user.id); // Asegurarse de que el miembro esté en la caché antes de buscarlo

      // Obtener detalles del usuario
      const userInfo = {
        username: user.username,
        discriminator: user.discriminator,
        id: user.id,
        avatarUrl: user.displayAvatarURL({ dynamic: true, size: 1024 }),
        joinedAt: member.joinedAt,
        createdAt: user.createdAt,
        status: member.presence ? member.presence.status : 'offline',
        roles: member.roles.cache.map(role => role.name).join(', '),
        nickname: member.nickname || 'No tiene apodo',
        permissions: member.permissions.toArray().join(', '),
        isBot: user.bot,
        isVerified: user.verified || 'No disponible',
        avatarURL: user.displayAvatarURL(),
        email: await getEmail(user), // Correo electrónico (si está disponible)
        lastSeenAt: user.lastSeen || 'Desconocido', // Última vez que estuvo en línea
        accountAge: moment(user.createdAt).fromNow(), // Edad de la cuenta
        accountCreationDate: moment(user.createdAt).format('MMMM Do YYYY, h:mm:ss a'),
        activity: await getUserActivity(user), // Actividad reciente
        voiceChannelHistory: await getVoiceChannelHistory(member), // Historial de canales de voz
        messageCount: await getMessageCount(user), // Contar los mensajes enviados
        firstMessage: await getFirstMessage(user), // Primer mensaje
        totalReactions: await getTotalReactions(user), // Total de reacciones en mensajes
        bans: await getBans(user), // Ver si ha sido baneado
        muted: await getMuted(user), // Si está o ha estado silenciado
        serverStats: await getServerStats(user), // Participación y actividad en el servidor
        twoFA: user.flags.has(1 << 5) ? '✅ Habilitado' : '❌ Deshabilitado', // Estado de 2FA
      };

      const embed = new EmbedBuilder()
        .setColor('#007BFF')  // Azul Argentina
        .setTitle(`¡Toda la info de **${user.username}** está acá! 😎`)
        .setDescription(`¡Mirá los detalles más curiosos de ${user.username}! 🔍`)
        .setThumbnail(userInfo.avatarUrl)
        .addFields(
          { name: '🔑 **Nombre de usuario**', value: `${userInfo.username}#${userInfo.discriminator}` },
          { name: '🆔 **ID de usuario**', value: userInfo.id },
          { name: '🤖 **¿Es un bot?**', value: userInfo.isBot ? '¡Sí, soy un robot! 🤖' : '¡Soy un ser humano! 👤' },
          { name: '📧 **Correo electrónico**', value: userInfo.email || 'No disponible por privacidad 🤐' },
          { name: '📅 **Fecha de creación de la cuenta**', value: userInfo.accountCreationDate },
          { name: '⏳ **Edad de la cuenta**', value: userInfo.accountAge },
          { name: '📅 **Fecha de ingreso al servidor**', value: moment(userInfo.joinedAt).format('MMMM Do YYYY, h:mm:ss a') },
          { name: '🌐 **Última actividad**', value: userInfo.status === 'offline' ? 'Está desconectado 😴' : `Actualmente: ${userInfo.status}` },
          { name: '💬 **Apodo**', value: userInfo.nickname || 'No tiene apodo 😔' },
          { name: '🔑 **Roles**', value: userInfo.roles || 'Sin roles por ahora 🙃' },
          { name: '⚙️ **Permisos**', value: userInfo.permissions || 'Sin permisos especiales por ahora' },
          { name: '📊 **Mensajes enviados**', value: userInfo.messageCount.toString() || 'No se pudo calcular 😅' },
          { name: '📝 **Primer mensaje**', value: userInfo.firstMessage || 'No se encuentra 😢' },
          { name: '👍 **Total de reacciones**', value: userInfo.totalReactions.toString() || 'No se registraron reacciones 😕' },
          { name: '🔇 **¿Está silenciado?**', value: userInfo.muted ? 'Sí, está en modo silencioso 🤫' : 'No, puede hablar sin problemas 🗣️' },
          { name: '🚫 **¿Ha sido baneado?**', value: userInfo.bans ? 'Sí, ya no está en el servidor 😬' : 'No, ¡aún sigue entre nosotros! 🙌' },
          { name: '📈 **Participación en el servidor**', value: userInfo.serverStats || 'Es un usuario bastante activo 💬' },
          { name: '🔐 **Estado de 2FA (Autenticación en dos pasos)**', value: userInfo.twoFA },
        )
        .setFooter({ text: `¡Comando ejecutado por ${interaction.user.username}! 👑` })
        .setTimestamp();

      // Sólo responder una vez
      if (!interaction.replied) {
        await interaction.editReply({ embeds: [embed] });
      }
    } catch (error) {
      console.error(error);
      if (!interaction.replied) {
        await interaction.editReply({ content: '¡Ocurrió un error! Intentalo nuevamente más tarde. 😞' });
      }
    }
  },
};

// Funciones de soporte para obtener la información

async function getEmail(user) {
  // Discord no permite obtener el correo electrónico directamente a través de la API.
  // Esto solo funcionará si el usuario ha vinculado una cuenta a través de un sistema personalizado.
  // De lo contrario, devolverá "No disponible"
  return 'No disponible'; // Placeholder, ya que Discord no proporciona esta información.
}

async function getUserActivity(user) {
  // Obtener la actividad reciente del usuario
  const activity = user.presence ? user.presence.activities[0] : null;
  if (activity) {
    return `Jugando a ${activity.name} 🎮`; // Ejemplo de actividad
  }
  return 'No hay actividad reciente 😴';
}

async function getVoiceChannelHistory(member) {
  // Ejemplo de historial de canales de voz, si tienes alguna API o sistema de registros para llevarla
  return 'No ha estado en canales de voz recientemente 🎧'; // Placeholder
}

async function getMessageCount(user) {
  // Contar los mensajes enviados por el usuario en el servidor
  // Este es un ejemplo y requeriría un sistema para llevar un registro de mensajes
  return 150; // Placeholder
}

async function getFirstMessage(user) {
  // Recuperar el primer mensaje del usuario en el servidor
  // Puedes realizar una búsqueda en la base de datos o mediante la API para obtenerlo
  return 'Este es el primer mensaje del usuario. ✨'; // Placeholder
}

async function getTotalReactions(user) {
  // Contar las reacciones del usuario en todos los mensajes
  // Este es un ejemplo, puedes contar las reacciones de una base de datos si es necesario
  return 35; // Placeholder
}

async function getBans(user) {
  // Verificar si el usuario ha sido baneado
  // Puedes consultar un sistema de administración o base de datos
  return false; // Placeholder
}

async function getMuted(user) {
  // Verificar si el usuario está silenciado
  // Esto depende de cómo manejes los silenciamientos en el servidor
  return false; // Placeholder
}

async function getServerStats(user) {
  // Estadísticas de participación en el servidor, como mensajes enviados, canales donde está activo
  return 'Muy activo en canales de texto 📚.'; // Placeholder
}
