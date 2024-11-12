const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, Embed } = require('discord.js');
const { token, clientId, guildId } = require('./config.json');
const fs = require('fs');
const path = require('path');

// Crear un cliente de Discord con los intents necesarios
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// Crear una nueva instancia de REST con la versión 10 de la API de Discord
const rest = new REST({ version: '10' }).setToken(token);

// Crear un Map para almacenar los comandos
client.commands = new Map();

// Función para cargar los comandos desde las carpetas y subcarpetas
function loadCommandFiles(commandPath) {
  const commandFiles = fs.readdirSync(commandPath);
  commandFiles.forEach((file) => {
    const filePath = path.join(commandPath, file);
    const stat = fs.statSync(filePath);

    // Si es una carpeta, lo cargamos recursivamente
    if (stat.isDirectory()) {
      loadCommandFiles(filePath);
    } else if (file.endsWith('.js')) {
      // Si es un archivo .js, cargamos el comando
      const command = require(filePath);
      client.commands.set(command.data.name, command);
    }
  });
}

// Cargar los comandos desde la carpeta 'commands'
const commandsPath = path.join(__dirname, 'commands');
loadCommandFiles(commandsPath);

// Cargar eventos desde la carpeta 'events'
const eventsPath = path.join(__dirname, 'events');
fs.readdirSync(eventsPath).forEach(file => {
  if (file.endsWith('.js')) {
    const event = require(path.join(eventsPath, file));
    const eventName = file.split('.')[0];  // Usamos el nombre del archivo para el nombre del evento
    client.on(eventName, event.bind(null, client));  // Registramos el evento
  }
});

// Registrar los comandos cuando el bot se inicie
(async () => {
  try {
    console.log('Comenzando a registrar comandos...');
    
    // Registra los comandos en un servidor específico (para pruebas)
    const commands = loadCommands(path.join(__dirname, 'commands'));
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });

    console.log('Comandos registrados exitosamente!');
  } catch (error) {
    console.error('Hubo un error al registrar los comandos:', error);
  }
})();

// Función para cargar todos los comandos en formato JSON
function loadCommands(commandPath) {
  const commandFiles = fs.readdirSync(commandPath);
  let commands = [];

  commandFiles.forEach((file) => {
    const filePath = path.join(commandPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Si es un directorio, se llama recursivamente
      commands = commands.concat(loadCommands(filePath));
    } else if (file.endsWith('.js')) {
      // Si es un archivo de comando, lo importamos
      const command = require(filePath);
      commands.push(command.data.toJSON());  // Asegúrate de que el comando exporte `data` como SlashCommandBuilder
    }
  });

  return commands;
}

const CHANNEL_ID = '1305559465956741140';  // Reemplaza con el ID del canal donde el bot escuchará los mensajes
let currentCount = 1; // Contador que sigue el número correcto

// Evento para manejar los mensajes
client.on('messageCreate', async (message) => {
  // Evitar que el bot reaccione a sus propios mensajes
  if (message.author.bot) return;

  // Asegurarse de que el mensaje sea en el canal correcto
  if (message.channel.id !== CHANNEL_ID) return;

  // Verificar si el mensaje solo contiene números
  const userInput = message.content.trim();
  const isNumeric = /^[0-9]+$/.test(userInput);  // Verifica si el mensaje solo contiene números

  if (!isNumeric) {
    // Si el mensaje no es un número, eliminar el mensaje y evitar procesamiento
    try {
      await message.delete();
    } catch (error) {
      console.error('Error al eliminar el mensaje:', error);
    }
    return; // No procesar el mensaje
  }

  // Convertir el mensaje en un número
  const userNumber = parseInt(userInput, 10);

  if (userNumber === currentCount) {
    // Si el número es correcto, se añade la reacción
    try {
      await message.react('✅');
      currentCount++; // Incrementar el contador para el siguiente número
    } catch (error) {
      console.error('Error al agregar la reacción:', error);
    }
  } else {
    // Si el número es incorrecto, reiniciar el conteo y enviar mensaje estilizado
    try {
      // Crear el embed para anunciar el error
      const embed = new EmbedBuilder()
        .setColor('#FF5733')  // Color del embed (naranja)
        .setTitle('¡Error en el conteo! ❌')
        .setDescription(`El usuario ${message.author.tag} se equivocó. El conteo empieza de nuevo. \n\n**Número esperado:** \`${currentCount}\` 📊`)
        .setThumbnail(message.author.displayAvatarURL())  // Avatar del usuario que se equivocó
        .addFields(
          { name: '¡Vuelve a intentarlo! 💪', value: 'Envía el siguiente número: `1` correcto para continuar el conteo.' }
        )
        .setTimestamp()  // Hora de la notificación
        .setFooter({ text: '¡El conteo sigue! 🚀' });

      // Enviar el embed al canal
      await message.channel.send({ embeds: [embed] });

      // Añadir la reacción de error
      await message.react('❌');
    } catch (error) {
      console.error('Error al enviar el embed de error:', error);
    }

    // Reiniciar el conteo a 1
    currentCount = 1;
  }

  // Eliminar el mensaje del usuario después de 10 segundos
  setTimeout(() => {
    message.delete().catch(err => console.log('No se pudo borrar el mensaje:', err));
  }, 10000);  // 10 segundos en milisegundos
});

// Iniciar sesión en Discord con el token del bot
client.login(token);
