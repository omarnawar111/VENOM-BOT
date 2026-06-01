require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  PermissionFlagsBits,
  AuditLogEvent
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildVoiceStates
  ]
});

client.once("clientReady", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

function getChannel(guild, envName) {
  const id = process.env[envName] || process.env.LOG_CHANNEL_ID;
  if (!id) return null;
  return guild.channels.cache.get(id);
}

async function sendLog(guild, envName, title, description, color = 0x7c3cff) {
  const channel = getChannel(guild, envName);

  if (!channel) {
    console.log(`❌ Channel not found for ${envName}`);
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .setFooter({ text: "VENOM RB • Logs" })
    .setTimestamp();

  try {
    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.log(`❌ Failed sending log to ${envName}: ${err.message}`);
  }
}

async function getAuditLog(guild, type, targetId = null) {
  try {
    const logs = await guild.fetchAuditLogs({ type, limit: 5 });
    const entry = logs.entries.find(e => {
      if (Date.now() - e.createdTimestamp > 15000) return false;
      if (targetId && e.target?.id !== targetId) return false;
      return true;
    });

    return entry || null;
  } catch {
    return null;
  }
}

function cleanText(text) {
  if (!text) return "لا يوجد محتوى";
  if (text.length > 900) return text.slice(0, 900) + "...";
  return text;
}

// =======================
// Welcome + Auto Role
// =======================
client.on("guildMemberAdd", async (member) => {
  const serverRules = process.env.SERVER_RULES_CHANNEL_ID
    ? `<#${process.env.SERVER_RULES_CHANNEL_ID}>`
    : "روم قوانين السيرفر";

  const rpRules = process.env.RP_RULES_CHANNEL_ID
    ? `<#${process.env.RP_RULES_CHANNEL_ID}>`
    : "روم قوانين الرول بلاي";

  try {
    const roleId = process.env.COMMUNITY_ROLE_ID;
    if (roleId) {
      const role = await member.guild.roles.fetch(roleId);
      if (role) {
        await member.roles.add(role);
        console.log(`✅ Auto role added: ${role.name} to ${member.user.tag}`);
      } else {
        console.log("❌ COMMUNITY_ROLE_ID role not found");
      }
    }
  } catch (err) {
    console.log("❌ Auto role failed:", err.message);
  }

  const welcomeChannel = getChannel(member.guild, "WELCOME_CHANNEL_ID");
  const avatar = member.user.displayAvatarURL({ dynamic: true, size: 1024 });
  const serverIcon = member.guild.iconURL({ dynamic: true, size: 1024 });

  if (welcomeChannel) {
    const embed = new EmbedBuilder()
      .setColor(0x7c3cff)
      .setAuthor({
        name: `Welcome to ${member.guild.name}`,
        iconURL: serverIcon || avatar
      })
      .setTitle("👋 نورت مدينة VENOM RB")
      .setDescription(`
أهلًا بيك يا ${member} 🔥

📜 قبل ما تبدأ لازم تقرأ:
${serverRules}
${rpRules}

🏙️ تابع أخبار المدينة والتحديثات
🎫 التقديمات والدعم الفني من خلال التذاكر

✅ تم إعطاؤك رول المجتمع تلقائيًا

⚜️ **VENOM RB**
✍️ **المنوفي**
`)
      .setThumbnail(avatar)
      .setImage(serverIcon)
      .setTimestamp();

    welcomeChannel.send({ embeds: [embed] }).catch(() => {});
  }

  sendLog(
    member.guild,
    "JOIN_LOG_CHANNEL_ID",
    "✅ دخول عضو",
    `👤 العضو: ${member}\n🆔 الاسم: ${member.user.tag}\n📅 الحساب اتعمل: <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
    0x20e080
  );
});

// =======================
// Leave + Kick Log
// =======================
client.on("guildMemberRemove", async (member) => {
  const kickEntry = await getAuditLog(
    member.guild,
    AuditLogEvent.MemberKick,
    member.id
  );

  if (kickEntry) {
    await sendLog(
      member.guild,
      "KICK_LOG_CHANNEL_ID",
      "👢 كيك | عضو اتطرد",
      `👤 العضو: **${member.user.tag}**
🆔 ID: \`${member.id}\`
👮 بواسطة: **${kickEntry.executor?.tag || "غير معروف"}**
📌 السبب: ${kickEntry.reason || "بدون سبب"}`,
      0xff3c68
    );
    return;
  }

  const leaveChannel = getChannel(member.guild, "LEAVE_CHANNEL_ID");
  const avatar = member.user.displayAvatarURL({ dynamic: true, size: 1024 });

  if (leaveChannel) {
    const embed = new EmbedBuilder()
      .setColor(0xffc857)
      .setTitle("👋 عضو غادر السيرفر")
      .setDescription(`خرج من السيرفر: **${member.user.tag}**`)
      .setThumbnail(avatar)
      .setTimestamp();

    leaveChannel.send({ embeds: [embed] }).catch(() => {});
  }

  sendLog(
    member.guild,
    "LEAVE_LOG_CHANNEL_ID",
    "❌ مغادرة عضو",
    `👤 العضو: **${member.user.tag}**\n🆔 ID: \`${member.id}\``,
    0xffc857
  );
});

// =======================
// Ban Log
// =======================
client.on("guildBanAdd", async (ban) => {
  const entry = await getAuditLog(
    ban.guild,
    AuditLogEvent.MemberBanAdd,
    ban.user.id
  );

  await sendLog(
    ban.guild,
    "BAN_LOG_CHANNEL_ID",
    "🔨 بان | عضو اتبند",
    `👤 العضو: **${ban.user.tag}**
🆔 ID: \`${ban.user.id}\`
👮 بواسطة: **${entry?.executor?.tag || "غير معروف"}**
📌 السبب: ${entry?.reason || ban.reason || "بدون سبب"}`,
    0xff3c68
  );

  console.log(`BAN LOG: ${ban.user.tag}`);
});

// =======================
// Role Log
// =======================
client.on("guildMemberUpdate", async (oldMember, newMember) => {
  const oldRoles = oldMember.roles.cache;
  const newRoles = newMember.roles.cache;

  const addedRoles = newRoles.filter(role => !oldRoles.has(role.id));
  const removedRoles = oldRoles.filter(role => !newRoles.has(role.id));

  if (!addedRoles.size && !removedRoles.size) return;

  const entry = await getAuditLog(
    newMember.guild,
    AuditLogEvent.MemberRoleUpdate,
    newMember.id
  );

  const executor = entry?.executor?.tag || "غير معروف";

  for (const role of addedRoles.values()) {
    await sendLog(
      newMember.guild,
      "ROLE_LOG_CHANNEL_ID",
      "➕ رول اتضاف",
      `👤 العضو: ${newMember}
🎭 الرول: ${role}
👮 بواسطة: **${executor}**`,
      0x20e080
    );
  }

  for (const role of removedRoles.values()) {
    await sendLog(
      newMember.guild,
      "ROLE_LOG_CHANNEL_ID",
      "➖ رول اتشال",
      `👤 العضو: ${newMember}
🎭 الرول: ${role}
👮 بواسطة: **${executor}**`,
      0xffc857
    );
  }
});

// =======================
// Message Logs
// =======================
client.on("messageDelete", async (message) => {
  if (!message.guild || message.author?.bot) return;

  const entry = await getAuditLog(
    message.guild,
    AuditLogEvent.MessageDelete,
    message.author.id
  );

  await sendLog(
    message.guild,
    "MESSAGE_LOG_CHANNEL_ID",
    "🗑️ رسالة اتحذفت",
    `👤 صاحب الرسالة: **${message.author.tag}**
🆔 ID: \`${message.author.id}\`
👮 اللي مسح: **${entry?.executor?.tag || "غير معروف / يمكن صاحب الرسالة"}**
📍 الروم: ${message.channel}
💬 الرسالة:
\`\`\`
${cleanText(message.content)}
\`\`\``,
    0xff3c68
  );
});

client.on("messageUpdate", async (oldMessage, newMessage) => {
  if (!oldMessage.guild || oldMessage.author?.bot) return;
  if (oldMessage.content === newMessage.content) return;

  await sendLog(
    oldMessage.guild,
    "MESSAGE_LOG_CHANNEL_ID",
    "✏️ رسالة اتعدلت",
    `👤 العضو: **${oldMessage.author.tag}**
📍 الروم: ${oldMessage.channel}

**قبل:**
\`\`\`
${cleanText(oldMessage.content)}
\`\`\`

**بعد:**
\`\`\`
${cleanText(newMessage.content)}
\`\`\``,
    0x00e5ff
  );
});

// =======================
// Voice Logs
// دخول، خروج، نقل، طرد، ميوت، ديفن، فيديو، ستريم
// =======================
client.on("voiceStateUpdate", async (oldState, newState) => {
  const guild = newState.guild || oldState.guild;
  const member = newState.member || oldState.member;
  if (!guild || !member) return;

  const oldChannel = oldState.channel;
  const newChannel = newState.channel;

  if (!oldChannel && newChannel) {
    await sendLog(
      guild,
      "VOICE_LOG_CHANNEL_ID",
      "🔊 دخول فويس",
      `👤 العضو: ${member}
📍 الروم: **${newChannel.name}**`,
      0x20e080
    );
    return;
  }

  if (oldChannel && !newChannel) {
    const disconnectEntry = await getAuditLog(
      guild,
      AuditLogEvent.MemberDisconnect,
      member.id
    );

    if (disconnectEntry) {
      await sendLog(
        guild,
        "VOICE_LOG_CHANNEL_ID",
        "🚫 طرد من الفويس",
        `👤 العضو: ${member}
📍 من روم: **${oldChannel.name}**
👮 بواسطة: **${disconnectEntry.executor?.tag || "غير معروف"}**`,
        0xff3c68
      );
      return;
    }

    await sendLog(
      guild,
      "VOICE_LOG_CHANNEL_ID",
      "🔇 خروج من الفويس",
      `👤 العضو: ${member}
📍 الروم: **${oldChannel.name}**`,
      0xffc857
    );
    return;
  }

  if (oldChannel && newChannel && oldChannel.id !== newChannel.id) {
    const moveEntry = await getAuditLog(
      guild,
      AuditLogEvent.MemberMove,
      member.id
    );

    await sendLog(
      guild,
      "VOICE_LOG_CHANNEL_ID",
      "🔁 نقل فويس",
      `👤 العضو: ${member}
📤 من: **${oldChannel.name}**
📥 إلى: **${newChannel.name}**
👮 بواسطة: **${moveEntry?.executor?.tag || "غير معروف / تحرك بنفسه"}**`,
      0x7c3cff
    );
    return;
  }

  if (oldState.serverMute !== newState.serverMute) {
    const entry = await getAuditLog(guild, AuditLogEvent.MemberUpdate, member.id);

    await sendLog(
      guild,
      "VOICE_LOG_CHANNEL_ID",
      newState.serverMute ? "🎙️ ميوت فويس" : "🎙️ فك ميوت فويس",
      `👤 العضو: ${member}
👮 بواسطة: **${entry?.executor?.tag || "غير معروف"}**
📍 الروم: **${newChannel?.name || oldChannel?.name || "غير معروف"}**`,
      newState.serverMute ? 0xff3c68 : 0x20e080
    );
  }

  if (oldState.serverDeaf !== newState.serverDeaf) {
    const entry = await getAuditLog(guild, AuditLogEvent.MemberUpdate, member.id);

    await sendLog(
      guild,
      "VOICE_LOG_CHANNEL_ID",
      newState.serverDeaf ? "🔇 ديفن فويس" : "🔊 فك ديفن فويس",
      `👤 العضو: ${member}
👮 بواسطة: **${entry?.executor?.tag || "غير معروف"}**
📍 الروم: **${newChannel?.name || oldChannel?.name || "غير معروف"}**`,
      newState.serverDeaf ? 0xff3c68 : 0x20e080
    );
  }

  if (oldState.selfVideo !== newState.selfVideo) {
    await sendLog(
      guild,
      "VOICE_LOG_CHANNEL_ID",
      newState.selfVideo ? "📹 فتح كاميرا" : "📹 قفل كاميرا",
      `👤 العضو: ${member}
📍 الروم: **${newChannel?.name || oldChannel?.name || "غير معروف"}**`,
      0x00e5ff
    );
  }

  if (oldState.streaming !== newState.streaming) {
    await sendLog(
      guild,
      "VOICE_LOG_CHANNEL_ID",
      newState.streaming ? "🟣 بدأ بث شاشة" : "⚫ أنهى بث الشاشة",
      `👤 العضو: ${member}
📍 الروم: **${newChannel?.name || oldChannel?.name || "غير معروف"}**`,
      0x7c3cff
    );
  }
});

// =======================
// Server / Channel Logs
// =======================
client.on("guildUpdate", async (oldGuild, newGuild) => {
  const entry = await getAuditLog(newGuild, AuditLogEvent.GuildUpdate);

  await sendLog(
    newGuild,
    "SERVER_LOG_CHANNEL_ID",
    "⚙️ تعديل السيرفر",
    `👮 بواسطة: **${entry?.executor?.tag || "غير معروف"}**

**الاسم قبل:** ${oldGuild.name}
**الاسم بعد:** ${newGuild.name}`,
    0x00e5ff
  );
});

client.on("channelCreate", async (channel) => {
  if (!channel.guild) return;

  const entry = await getAuditLog(
    channel.guild,
    AuditLogEvent.ChannelCreate,
    channel.id
  );

  await sendLog(
    channel.guild,
    "SERVER_LOG_CHANNEL_ID",
    "📁 روم اتعمل",
    `📍 الروم: ${channel}
👮 بواسطة: **${entry?.executor?.tag || "غير معروف"}**`,
    0x20e080
  );
});

client.on("channelDelete", async (channel) => {
  if (!channel.guild) return;

  const entry = await getAuditLog(
    channel.guild,
    AuditLogEvent.ChannelDelete,
    channel.id
  );

  await sendLog(
    channel.guild,
    "SERVER_LOG_CHANNEL_ID",
    "🗑️ روم اتحذف",
    `📍 الاسم: **${channel.name}**
👮 بواسطة: **${entry?.executor?.tag || "غير معروف"}**`,
    0xff3c68
  );
});

client.on("channelUpdate", async (oldChannel, newChannel) => {
  if (!newChannel.guild) return;

  const entry = await getAuditLog(
    newChannel.guild,
    AuditLogEvent.ChannelUpdate,
    newChannel.id
  );

  await sendLog(
    newChannel.guild,
    "SERVER_LOG_CHANNEL_ID",
    "✏️ تعديل روم",
    `📍 الروم: ${newChannel}
👮 بواسطة: **${entry?.executor?.tag || "غير معروف"}**

**الاسم قبل:** ${oldChannel.name}
**الاسم بعد:** ${newChannel.name}`,
    0x00e5ff
  );
});

// =======================
// Basic Commands
// =======================
client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;

  if (message.content === "!ping") {
    return message.reply("🏓 البوت شغال ✅");
  }

  if (message.content === "!help") {
    const embed = new EmbedBuilder()
      .setColor(0x7c3cff)
      .setTitle("🤖 أوامر VENOM RB BOT")
      .setDescription(`
**!ping** اختبار البوت
**!help** عرض الأوامر
**!clear رقم** مسح رسائل
`)
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }

  if (message.content.startsWith("!clear ")) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return message.reply("❌ ليس لديك صلاحية مسح الرسائل");
    }

    const amount = Number(message.content.split(" ")[1]);

    if (!amount || amount < 1 || amount > 100) {
      return message.reply("❌ اكتب رقم من 1 إلى 100");
    }

    await message.channel.bulkDelete(amount, true);

    const msg = await message.channel.send(`✅ تم مسح ${amount} رسالة`);
    setTimeout(() => msg.delete().catch(() => {}), 3000);

    await sendLog(
      message.guild,
      "MESSAGE_LOG_CHANNEL_ID",
      "🧹 مسح رسائل",
      `👤 بواسطة: **${message.author.tag}**
📍 الروم: ${message.channel}
🔢 العدد: **${amount}**`,
      0x00e5ff
    );
  }
});

client.login(process.env.TOKEN);