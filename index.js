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

function logEmbed(guild, title, desc, color = 0x7c3cff) {
  const ch = guild.channels.cache.get(process.env.LOG_CHANNEL_ID);
  if (!ch) return;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(desc)
    .setFooter({ text: "VENOM RP • Logs" })
    .setTimestamp();

  ch.send({ embeds: [embed] }).catch(() => {});
}

client.on("guildMemberAdd", async (member) => {
  try {
  const roleId = process.env.COMMUNITY_ROLE_ID;

  if (!roleId) {
    console.log("❌ COMMUNITY_ROLE_ID مش موجود في ملف .env");
  } else {
    const role = await member.guild.roles.fetch(roleId);

    if (!role) {
      console.log("❌ الرول مش موجود، راجع ID الرول");
    } else {
      await member.roles.add(role);
      console.log(`✅ تم إعطاء رول ${role.name} لـ ${member.user.tag}`);
    }
  }
} catch (err) {
  console.log("❌ فشل إعطاء الرول:");
  console.log(err.message);
}

  const channel = member.guild.channels.cache.get(process.env.WELCOME_CHANNEL_ID);
  const serverIcon = member.guild.iconURL({ dynamic: true, size: 1024 });
  const userAvatar = member.user.displayAvatarURL({ dynamic: true, size: 1024 });

  if (channel) {
    const embed = new EmbedBuilder()
      .setColor(0x7c3cff)
      .setAuthor({ name: `Welcome to ${member.guild.name}`, iconURL: serverIcon || userAvatar })
      .setTitle("👋 نورت مدينة VENOM RP")
      .setDescription(`
أهلًا بيك يا ${member} 🔥

📜 اقرأ قوانين السيرفر والمدينة  
🏙️ تابع أخبار المدينة  
🚔 تقديم الشرطة من التذاكر  
🚑 تقديم الإسعاف من التذاكر  
🛠️ الدعم الفني من التذاكر  

✅ تم إعطاؤك رول المجتمع تلقائيًا

⚜️ **VENOM RP**
✍️ **المنوفي**
`)
      .setThumbnail(userAvatar)
      .setImage(serverIcon)
      .setTimestamp();

    channel.send({ embeds: [embed] }).catch(() => {});
  }

  logEmbed(member.guild, "✅ دخول عضو", `👤 العضو: ${member}\n🆔 ${member.user.tag}`, 0x20e080);
});

client.on("guildMemberRemove", async (member) => {
  let executor = "غير معروف";
  try {
    const logs = await member.guild.fetchAuditLogs({ type: AuditLogEvent.MemberKick, limit: 1 });
    const entry = logs.entries.first();
    if (entry && entry.target?.id === member.id && Date.now() - entry.createdTimestamp < 5000) {
      executor = entry.executor.tag;
      return logEmbed(member.guild, "👢 Kick", `👤 العضو: ${member.user.tag}\n👮 بواسطة: ${executor}`, 0xff3c68);
    }
  } catch {}

  logEmbed(member.guild, "❌ خروج عضو", `👤 العضو: ${member.user.tag}`, 0xffc857);
});

client.on("guildBanAdd", async (ban) => {
  let executor = "غير معروف";
  let reason = ban.reason || "بدون سبب";

  try {
    const logs = await ban.guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd, limit: 1 });
    const entry = logs.entries.first();
    if (entry && entry.target?.id === ban.user.id) {
      executor = entry.executor.tag;
      reason = entry.reason || reason;
    }
  } catch {}

  logEmbed(ban.guild, "🔨 Ban", `👤 العضو: ${ban.user.tag}\n👮 بواسطة: ${executor}\n📌 السبب: ${reason}`, 0xff3c68);
});

client.on("guildMemberUpdate", async (oldMember, newMember) => {
  const oldRoles = oldMember.roles.cache;
  const newRoles = newMember.roles.cache;

  const added = newRoles.filter(role => !oldRoles.has(role.id));
  const removed = oldRoles.filter(role => !newRoles.has(role.id));

  let executor = "غير معروف";
  try {
    const logs = await newMember.guild.fetchAuditLogs({ type: AuditLogEvent.MemberRoleUpdate, limit: 1 });
    const entry = logs.entries.first();
    if (entry && entry.target?.id === newMember.id) executor = entry.executor.tag;
  } catch {}

  added.forEach(role => {
    logEmbed(newMember.guild, "➕ رول اتضاف", `👤 العضو: ${newMember}\n🎭 الرول: ${role}\n👮 بواسطة: ${executor}`, 0x20e080);
  });

  removed.forEach(role => {
    logEmbed(newMember.guild, "➖ رول اتشال", `👤 العضو: ${newMember}\n🎭 الرول: ${role}\n👮 بواسطة: ${executor}`, 0xffc857);
  });
});

client.on("messageDelete", (message) => {
  if (!message.guild || message.author?.bot) return;
  logEmbed(
    message.guild,
    "🗑️ رسالة اتحذفت",
    `👤 الكاتب: ${message.author.tag}\n📍 الروم: ${message.channel}\n💬 الرسالة: ${message.content || "لا يوجد محتوى"}`,
    0xff3c68
  );
});

client.on("messageUpdate", (oldMessage, newMessage) => {
  if (!oldMessage.guild || oldMessage.author?.bot) return;
  if (oldMessage.content === newMessage.content) return;

  logEmbed(
    oldMessage.guild,
    "✏️ رسالة اتعدلت",
    `👤 الكاتب: ${oldMessage.author.tag}\n📍 الروم: ${oldMessage.channel}\n\n**قبل:** ${oldMessage.content || "فارغ"}\n**بعد:** ${newMessage.content || "فارغ"}`,
    0x00e5ff
  );
});

client.on("voiceStateUpdate", (oldState, newState) => {
  const member = newState.member || oldState.member;

  if (!oldState.channel && newState.channel) {
    logEmbed(newState.guild, "🔊 دخول فويس", `👤 العضو: ${member}\n📍 الروم: ${newState.channel.name}`, 0x20e080);
  }

  if (oldState.channel && !newState.channel) {
    logEmbed(oldState.guild, "🔇 خروج من فويس", `👤 العضو: ${member}\n📍 الروم: ${oldState.channel.name}`, 0xffc857);
  }

  if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
    logEmbed(newState.guild, "🔁 نقل فويس", `👤 العضو: ${member}\nمن: ${oldState.channel.name}\nإلى: ${newState.channel.name}`, 0x7c3cff);
  }
});

client.on("channelCreate", async (channel) => {
  let executor = "غير معروف";
  try {
    const logs = await channel.guild.fetchAuditLogs({ type: AuditLogEvent.ChannelCreate, limit: 1 });
    const entry = logs.entries.first();
    if (entry) executor = entry.executor.tag;
  } catch {}

  logEmbed(channel.guild, "📁 روم اتعمل", `📍 الروم: ${channel}\n👮 بواسطة: ${executor}`, 0x20e080);
});

client.on("channelDelete", async (channel) => {
  let executor = "غير معروف";
  try {
    const logs = await channel.guild.fetchAuditLogs({ type: AuditLogEvent.ChannelDelete, limit: 1 });
    const entry = logs.entries.first();
    if (entry) executor = entry.executor.tag;
  } catch {}

  logEmbed(channel.guild, "🗑️ روم اتحذف", `📍 الاسم: ${channel.name}\n👮 بواسطة: ${executor}`, 0xff3c68);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;

  if (message.content === "!ping") {
    return message.reply("🏓 البوت شغال يا منوفي ✅");
  }

  if (message.content === "!help") {
    const embed = new EmbedBuilder()
      .setColor(0x7c3cff)
      .setTitle("🤖 أوامر VENOM RP BOT")
      .setDescription(`
**!ping** اختبار البوت  
**!rules-server** قوانين السيرفر  
**!rules-rp** قوانين الرول بلاي  
**!announce نص** إعلان  
**!clear رقم** مسح رسائل  
`)
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }

  if (message.content === "!rules-server") {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;

    const embed = new EmbedBuilder()
      .setColor(0xff3c68)
      .setTitle("📜 قوانين السيرفر | VENOM RP")
      .setDescription(`
**1️⃣ الاحترام**
يمنع السب والشتم والعنصرية والتنمر.

**2️⃣ الإعلانات**
يمنع نشر روابط أو إعلانات بدون إذن الإدارة.

**3️⃣ التذاكر**
يمنع فتح تذاكر عشوائية أو بلاغات كاذبة.

**4️⃣ الغش والثغرات**
يمنع استخدام هاكات أو استغلال ثغرات.

**5️⃣ Vencord والقنوات المخفية**
أي محاولة لرؤية القنوات المخفية أو الوصول لمحتوى غير مصرح به سيتم التعامل معها بشكل رسمي.

**6️⃣ العقوبات**
الإدارة لها حق اتخاذ القرار المناسب.

⚜️ **VENOM RP**
✍️ **المنوفي**
`)
      .setTimestamp();

    return message.channel.send({ embeds: [embed] });
  }

  if (message.content === "!rules-rp") {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;

    const embed = new EmbedBuilder()
      .setColor(0x00e5ff)
      .setTitle("🎭 قوانين الرول بلاي | VENOM RP")
      .setDescription(`
**RDM** يمنع القتل العشوائي.  
**VDM** يمنع الدهس العشوائي.  
**Fail RP** يمنع التصرفات غير الواقعية.  
**Meta Gaming** يمنع استخدام معلومات خارج اللعبة.  
**Power Gaming** يمنع إجبار لاعب على شيء غير منطقي.  
**Fear RP** لازم تخاف على حياتك.  
**Combat Logging** يمنع الخروج أثناء السيناريو.  
**NLR** بعد الموت تنسى السيناريو السابق.  
**Cop Baiting** يمنع استفزاز الشرطة بدون سبب.

⚜️ **VENOM RP**
✍️ **المنوفي**
`)
      .setTimestamp();

    return message.channel.send({ embeds: [embed] });
  }

  if (message.content.startsWith("!announce ")) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;

    const text = message.content.replace("!announce ", "");
    const embed = new EmbedBuilder()
      .setColor(0x7c3cff)
      .setTitle("📢 إعلان هام | VENOM RP")
      .setDescription(text)
      .setFooter({ text: "VENOM RP • المنوفي" })
      .setTimestamp();

    await message.delete().catch(() => {});
    return message.channel.send({ embeds: [embed] });
  }

  if (message.content.startsWith("!clear ")) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return;

    const amount = Number(message.content.split(" ")[1]);
    if (!amount || amount < 1 || amount > 100) return message.reply("❌ اكتب رقم من 1 لـ 100");

    await message.channel.bulkDelete(amount, true);
    const msg = await message.channel.send(`✅ تم مسح ${amount} رسالة`);
    setTimeout(() => msg.delete().catch(() => {}), 3000);

    logEmbed(message.guild, "🧹 مسح رسائل", `👤 بواسطة: ${message.author.tag}\n📍 الروم: ${message.channel}\n🔢 العدد: ${amount}`, 0x00e5ff);
  }
});

client.login(process.env.TOKEN);