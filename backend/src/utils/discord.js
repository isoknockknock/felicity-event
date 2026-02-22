const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args)).catch(() => {
    // node-fetch not available, try native fetch (Node 18+)
    return globalThis.fetch(...args);
});

/**
 * Post a new event announcement to a Discord channel via webhook.
 */
async function postToDiscord(webhookUrl, event) {
    if (!webhookUrl) return null;

    const embed = {
        title: `🎉 New Event: ${event.name}`,
        description: event.description || "No description provided.",
        color: event.type === "MERCHANDISE" ? 0xf59e0b : 0x3b82f6,
        fields: [
            { name: "Type", value: event.type, inline: true },
            { name: "Eligibility", value: event.eligibility || "All", inline: true },
            {
                name: "Registration Fee",
                value: event.registrationFee === 0 ? "Free" : `₹${event.registrationFee}`,
                inline: true
            },
            {
                name: "Start Date",
                value: event.startDate
                    ? new Date(event.startDate).toLocaleString()
                    : "TBD",
                inline: true
            },
            {
                name: "End Date",
                value: event.endDate
                    ? new Date(event.endDate).toLocaleString()
                    : "TBD",
                inline: true
            },
            {
                name: "Registration Deadline",
                value: event.registrationDeadline
                    ? new Date(event.registrationDeadline).toLocaleString()
                    : "TBD",
                inline: true
            }
        ],
        footer: { text: "Felicity EMS" },
        timestamp: new Date().toISOString()
    };

    if (event.tags && event.tags.length > 0) {
        embed.fields.push({
            name: "Tags",
            value: event.tags.join(", "),
            inline: false
        });
    }

    try {
        const response = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                content: "📢 A new event has been published!",
                embeds: [embed]
            })
        });

        if (!response.ok) {
            console.error("Discord webhook failed:", response.status, await response.text().catch(() => ""));
        }

        return response.ok;
    } catch (err) {
        console.error("Discord webhook error:", err.message);
        return false;
    }
}

module.exports = { postToDiscord };
