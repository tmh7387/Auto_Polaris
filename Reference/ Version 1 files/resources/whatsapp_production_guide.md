# Production WhatsApp Setup Guide

To ensure WhatsApp notifications are delivered reliably without manual "join" messages, you must move from the **Twilio Sandbox** to a **Production WhatsApp Business Profile**.

## The Core Concept: Out-of-Session Messaging
In WhatsApp, you can only send a message to a user if:
1.  **In-Session**: The user has messaged you within the last 24 hours.
2.  **Out-of-Session**: You use a pre-approved **Message Template**.

By moving to production, you can use **Message Templates** to send notifications (like our flight alerts) at any time.

---

## Step 1: Register a WhatsApp Business Profile
In your Twilio Console, follow these steps:
1.  Go to **Messaging > Senders > WhatsApp Senders**.
2.  Click **Register a WhatsApp Sender**.
3.  You will need to connect a **Meta Business Manager** account. If you don't have one, you'll need to create it.
4.  Verify your business (this usually takes 24-48 hours).

## Step 2: Create a Message Template
Once your profile is approved, you can create a template for the flight notifications.
1.  Go to **Messaging > Content Editor**.
2.  Create a "New Content" item.
3.  **Suggested Template Text**:
    > "Hi WESTPAC FDM Team, BSS has identified Level 3 event – {{1}} - {{2}} - {{3}}. The link to the event is below: {{4}}"
4.  Submit this for approval (Meta usually approves in minutes to hours).

## Step 3: Update our Code
Once you have an approved **Content SID** from Step 2, our code will use the Twilio `Content` API instead of the basic `Body` API. This will look like this:

```typescript
const message = await client.messages.create({
    contentSid: 'HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', // Your approved Template SID
    contentVariables: JSON.stringify({
        "1": "ETB300",
        "2": "Eng Torque Low",
        "3": "Feb 03, 2026",
        "4": "https://polaris..."
    }),
    from: 'whatsapp:+1XXXXXXXXXX', // Your production number
    to: 'whatsapp:+66917378705'
});
```

---

## Summary of Changes
| Feature | Sandbox (Current) | Production (Goal) |
| :--- | :--- | :--- |
| **Recipient Setup** | User must text "join ..." | No user action required |
| **24h Window** | Required for free-text | Bypassed by **Templates** |
| **Number** | Shared pool (+1 415...) | Your own dedicated number |

**Recommendation**: Start the "WhatsApp Sender" registration in your Twilio Console today, as the business verification can take a day or two.
