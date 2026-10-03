# Staff Guide: Advert Dashboard and Student Accounts

This guide is for adult staff running the event. It covers:

- [Signing in](#signing-in)
- [Advert Dashboard](#advert-dashboard) (reviewing uploads and controlling the projector)
- [Event Communications](#event-communications-staff-images-and-messages) (staff images, urgent messages, FLASH)
- [Projector settings](#projector-settings)
- [End of Day](#end-of-day-clear-down)
- [Student Account Dashboard](#student-account-dashboard)
- [Staff Account Dashboard](#staff-account-dashboard)
- [Safeguarding](#safeguarding)

---

## Signing in

1. Open the address you've been given and choose **Staff Console** (or go straight to `/staff`).
2. Enter your **Staff Username** and **Password**. These are given to you by the event organiser.
3. Select **Sign In**.

You'll see **Staff Access Granted** and land on the **Advert Dashboard**. A failed sign-in shows **Access Denied**.

- The username is not case-sensitive. The password is.
- After **5 wrong passwords in a row**, your staff account is locked for **15 minutes**.
- Staff passwords must be at least 10 characters, with a capital letter and a number. Don't share your staff login with students.
- Your session lasts about an hour. When it expires you are taken back to the staff sign-in page.
- Signing in to the student portal in the same browser (e.g. to test it) doesn't sign you out of the staff app.
- To sign out, use the **Logout** icon at the top right.

---

## Advert Dashboard

The Advert Dashboard (`/staff`) is where you review student uploads before they reach the projector. Lists refresh automatically every 15 seconds.

### Tabs

| Tab | What's in it |
|---|---|
| **New** | Uploads waiting for review. |
| **Approved** | Approved items, in the order the projector plays them. |
| **Rejected** | Items you have turned down. |
| **Event Communications** | Staff information images and the urgent free-text message. |
| **Projector** | [Projector settings](#projector-settings): how often staff content appears, how long it shows, and how often the projector refreshes. |
| **End of Day** | The **Clear Down** tool. |

Each tab shows a count. Use **Search by student name…** to filter the current tab by uploader.

Each card shows the uploader, how long ago it was uploaded, and the student's chosen priority (P1–P4), duration (10/20/30s) and total cost. Click a card to open a larger preview with the same actions.

### Reviewing new uploads

1. Open the **New** tab.
2. Click the card to see the image at a larger size. Check it carefully (see [Safeguarding](#safeguarding)).
3. Select **Approve** or **Reject**.

**Important:** Approving an item can put it **on the projector straight away** (within a few seconds). Students choose this when uploading:

- **Most adverts** go on screen as soon as you approve them.
- **Some adverts wait:** the student chose to publish it themselves later (for example, for a timed special offer). These stay in **Approved** but hidden until the student taps **Publish now** on their phone.

Either way, only approve what you are happy to show to the whole room: approval means the student can put it on screen whenever they like.

### Changing your mind

- An **Approved** item can be moved to **Rejected** with **Reject**. It is removed from the projector.
- A **Rejected** item can be moved back with **Approve**. It goes straight back on the projector.
- Items can never be moved back to **New**.

### Show or hide on the projector

On the **Approved** tab, each card has a **Hide** / **Display** button. (In the large preview it reads **Hide from Projector** / **Display on Projector**.)

- **Hide** keeps the item approved but takes it off the projector.
- **Display** puts it back on.
- Only approved items can be displayed.
- Students can also **publish** and **withdraw** their own approved adverts, so a student can put back an advert you hid. **To keep something off the screen for good, select Reject**: rejected adverts can't be published.

Students can see whether their item is currently **On Projector**.

### Reordering

On the **Approved** tab you can change the order of items:

- Use the **Up** and **Down** buttons on each card, or
- Drag a card and drop it onto another card (on a computer).

You'll see **Order updated**. The projector plays student adverts in this order.

**Priority (what students paid for):** an advert appears once per priority point in each rotation. A priority-4 advert appears four times as often as a priority-1 advert, with its repeats spread out. Each appearance lasts the 10, 20 or 30 seconds the student chose. See the [Projector Guide](projector-guide.md#how-rotation-works).

### Deleting an item

Deleting removes the record and the image file permanently.

1. If the item is **New** or **Approved**, first select **Reject**.
2. On the **Rejected** tab, select **Delete** (on the card or in the preview).
3. Confirm with **Yes, Delete Permanently**.

Students can also delete their own uploads from the student portal.

---

## Event Communications: staff images and messages

Open the **Event Communications** tab. Items here show an **INFO** badge. They are approved automatically because they come from staff.

### Urgent Free Text (FLASH)

Use this for urgent announcements. It **immediately takes over the projector** in FLASH MODE.

1. Type your message in the **Urgent Free Text** box.
2. Select **Send Urgent Message**.

The projector shows the text with an **Urgent Announcement** label.

- There is only ever **one** free-text message. Sending a new one replaces the old text.
- To remove it, select the bin icon next to **Send Urgent Message** and confirm with **Yes, Delete Permanently**, or
- Select **Flash** on its card to switch FLASH off. The message then becomes normal staff content: it slips in between student adverts (see [Projector settings](#projector-settings)) until you **Hide** or **Delete** it.

### Upload Information (staff images)

Use this to add your own images (for example, a schedule or a sponsor slide).

1. Under **Upload Information**, choose an image file.
2. Decide on **Flash Mode** (see warning below).
3. Select **Upload Info Image**.

Without Flash Mode (the default), the image is added **hidden**. Select **Display** on its card when you want it on the projector. Displayed staff content slips in between student adverts. See [Projector settings](#projector-settings).

> **Careful:** if you tick **Flash Mode**, the image takes over the projector straight away, even though it's marked hidden.

Staff images follow the same file rules as student uploads: JPEG, PNG, GIF or WebP, up to 10 MB.

### How FLASH works

- While **any** item has FLASH switched on, the projector shows **only** FLASH items, and normal adverts pause.
- Toggle FLASH on or off with the **Flash** button on an info card (on the **Event Communications** or **Approved** tab). A card in FLASH shows a red **FLASH** badge.
- When the last FLASH item is switched off or deleted, normal rotation resumes.

Info items can be deleted at any time with **Delete** on their card, and confirmed with **Yes, Delete Permanently**.

---

## Projector settings

Open the **Projector** tab on the Advert Dashboard. Changes reach the projector within a minute.

| Setting | What it does | Allowed |
|---|---|---|
| **Staff content interval** | Displayed **Event Communications** items slip in between student adverts once this many seconds of adverts have played. `0` = after every advert. | 0 to 3600 seconds |
| **Staff item display time** | How long each staff item stays on screen. (Student adverts always get the time the student paid for.) | 3 to 120 seconds |
| **Projector refresh** | How often the projector checks for newly approved, hidden or removed items. | 2 to 60 seconds |

Staff items take turns, so with several displayed, each slot shows the next one.

---

## End of Day: Clear Down

Use this once the event is over.

1. Open the **End of Day** tab.
2. Select **Clear Down**.
3. Type `clear down` in the box.
4. Select **Confirm Clear Down**.

**What it deletes:** every student upload (new, approved and rejected) and its image file.

**What it keeps:**

- Staff information items from **Event Communications** (info images and the free-text message).
- All student accounts.

Delete info items individually if you don't want them next time. This cannot be undone.

---

## Student Account Dashboard

Students sign in to the upload portal with accounts you manage here.

- **To open it:** select **Student accounts** in the top banner (shown as **Students** on smaller screens).
- The banner on every staff page also has **Advert Dashboard** (**Adverts**) and **Staff accounts** (**Staff**).

### The overview

Four totals appear at the top: **Total accounts**, **Active**, **Locked** and **Seen at least once**. **Select a total to show just those accounts** in the table (it's highlighted while selected). Select **Total accounts**, or **Show all**, to see everyone again. The Staff Account Dashboard works the same way.

On a phone, each account appears as a card with large buttons instead of a table.

The **Student accounts** table shows, for each account:

- **Username** and when it was created
- **Status**: **Active** or **Locked**, plus **Temp lock until …** after too many failed sign-ins
- **Last login**: date and time ("Never" if never used)
- **IP address**: the address of the device used for the most recent sign-in

The list refreshes every 15 seconds.

### Adding an account

1. In **Add a student account**, enter a **Username** and **Password**.
2. Select **Add student account**.

The account can be used straight away. Give the student the username and password. They type them into the **Username** and **Password** boxes on the student sign-in page.

**Username rules:** letters, numbers, dots, dashes and underscores only. Usernames are stored in lower case and must be unique.

### Password rules

- At least 6 characters
- At least one capital letter and at least one number
- Very common passwords (for example "password1" or "qwerty123") are refused

### Locking and unlocking

- **Lock** stops the student signing in. It also blocks a student who is already signed in from uploading.
- **Unlock** lets them sign in again.

**Automatic temporary lock:** after **5 wrong passwords in a row**, an account locks for **15 minutes**. It shows as **Locked** with **Temp lock until …**. Selecting **Unlock** clears the temporary lock immediately and resets the failed-attempt count.

A temporary lock also affects anyone already signed in to that account until it expires or you unlock it. This matters if a team shares one account.

### Resetting a password

1. Select **Password** on the account's row.
2. Enter the **New password** (same rules as above).
3. Select **Save password**.

This does not unlock a locked account. Select **Unlock** as well if needed.

### Renaming an account

Useful when a company changes its name, or a username was mistyped.

1. Select **Rename** on the account's row (or card, on a phone).
2. The box starts with the current username. Type the new one.
3. Select **Save username**.

- Usernames use letters, numbers, dots, dashes and underscores only, and can't match **any** other account, **including locked ones**. Capitals don't count as different ("Team1" and "team1" clash). If the name is taken you'll be told, and nothing changes.
- The student's **adverts move to the new name**, so they can still see, publish and delete them.
- If they're signed in, they're taken back to the sign-in page and must use the **new** username. Their password stays the same.

### Deleting an account

1. Select **Delete** on the account's row.
2. Confirm with **Delete account**.

The student can no longer sign in. **Their existing uploads stay in the system.** Remove those from the Advert Dashboard if needed.

**Note on old built-in accounts:** older versions created built-in `student` and `guest` accounts. They are no longer created, and if they still have their original passwords they are **locked automatically** when the system starts. If you need one, select **Password** to set a new password, then **Unlock** it. Otherwise you can delete it.

---

## Staff Account Dashboard

Manage who can sign in to the staff app. Select **Staff accounts** in the top banner (**Staff** on smaller screens).

It works like the Student Account Dashboard: the same totals, table, **Lock** / **Unlock**, **Rename**, **Password** and **Delete** buttons, and last login time and IP address. If you rename your own account, you'll be signed out and need to sign in with the new name.

- **Adding a colleague:** enter a **Username** and **Password** under **Add a staff account** and select **Add staff account**. Staff passwords need at least 10 characters, with a capital letter and a number. Give them their login in person.
- **You can't lock or delete your own account.** Your row is marked **(you)** and those buttons are greyed out, so there's always at least one working staff login. You can still change your own password.
- **Locking or deleting takes effect immediately.** If that person is signed in, their next action is refused and they'll need to sign in again (which won't work while locked).
- Deleting a staff account keeps everything they approved or uploaded.

---

## Quick links

At the bottom of every staff page, **Student portal** and **Projector** open those pages in a new tab, so you can see what students and the big screen see.

---

## Safeguarding

All uploads are made by children and shown publicly on the big screen.

- **Always check every upload yourself before approving.** Approving shows it on the projector right away.
- The automatic image checker on the student page is a helper, not a guarantee. If it can't run, it lets images through.
- Check for faces, names, school uniforms or other personal details. Students are asked to confirm that everyone in the photo is happy to be featured. If in doubt, reject.
- If something inappropriate gets onto the screen, select **Reject** immediately (**Hide** can be undone by the student publishing it again). For a fast takeover, send an **Urgent Free Text** message.
- The uploader's username appears on screen under each item. Choose student usernames that don't reveal full names.
- Lock or delete any account that is misused, and follow your school's safeguarding procedures.
