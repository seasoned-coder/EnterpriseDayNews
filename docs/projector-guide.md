# Projector Guide: Running the Big Screen

This guide is for whoever sets up the screen at the event. The projector page (`/projector`) shows approved adverts and staff messages full-screen. No sign-in is needed.

---

## Setting up

1. On the computer connected to the projector, open a web browser. (At the event this computer joins the private event Wi-Fi, or better, plugs into the router with a cable. See **Setup** in the README.)
2. Go to the address you've been given, followed by `/projector`. Or open the home page and choose **Live Projector**.
3. Make the browser full screen. On most Windows browsers press **F11**. Press it again to exit.
4. Move the mouse pointer to the edge of the screen so it isn't over the picture.
5. Turn off the computer's screen saver and sleep settings so the display doesn't go blank during the event.

The page updates by itself. You don't need to refresh it when staff approve new items.

---

## What it shows

The projector shows:

- **Student adverts** that staff have **approved** and that are on screen (straight away, or when the student taps **Publish now**), and
- **Staff content**: **Event Communications** items (information images and messages) set to **Display**, which slip in between the adverts.

Each item fills the screen. Wide (landscape) images fit best, and tall images are cropped. Images slowly zoom, and items fade from one to the next.

Along the bottom you'll see **Enterprise Day · Live** and, for student adverts, the username of the student company that uploaded it.

### Screens you might see

| Screen | Meaning |
|---|---|
| **Loading the feed…** | The page is fetching items. This should only last a moment. |
| **Waiting for approved adverts…** | Nothing is currently approved and set to display. |
| Text with **Urgent Announcement** | An urgent FLASH message from staff (see below). |
| Adverts with a small **OFFLINE MODE** label at the top | The projector can't reach the server. It keeps playing the adverts it already has, and carries on normally once the connection is back (see below). |
| **Back shortly** (with **OFFLINE MODE**) | The projector can't reach the server and has nothing saved to play yet. |

### If the server or Wi-Fi drops out

The projector is built to keep going on its own:

- **It keeps playing** the adverts it already had, with their pictures, so the room still sees adverts rather than an error.
- **OFFLINE MODE** appears, small, at the top middle, after a couple of failed checks (about 10 seconds). It's there so staff know: new approvals and changes won't appear until the connection is back.
- **It keeps trying** every few seconds. When the server answers again, the label disappears and new items appear. You don't need to do anything.
- **Reloading is safe.** If someone refreshes the page during an outage, it carries on with the adverts it last had.

If OFFLINE MODE stays up for more than a minute or two, check the projector computer's cable or Wi-Fi, and that the server is still running.

---

## How rotation works

Students pay (in event money) for **priority** and **duration**, and the rotation is built around that:

- **Order:** student adverts play in the order staff set on the **Approved** tab.
- **Priority = appearances:** in each rotation an advert appears once per priority point. Priority 1 appears once and priority 4 appears four times, with repeats spread out so the same advert doesn't show twice in a row.
- **Duration:** each appearance lasts what the student paid for: **10, 20 or 30 seconds**.
- **Staff content:** once enough student advert time has played (the **staff content interval**, 60 seconds by default), the next displayed staff item slips in for the **staff item display time** (10 seconds by default). Staff items take turns.
- **Checking for changes:** every few seconds (the **projector refresh**, 3 seconds by default). If staff hide or reject what's on screen, the projector moves on straight away.

Staff change these three settings on the **Projector** tab of the Advert Dashboard. There are no settings on the projector page itself.

---

## FLASH mode

Staff can use FLASH for urgent messages or key slides.

- While anything is in FLASH, the projector shows **only** FLASH items, and normal adverts pause.
- The switch happens within a few seconds (at the next refresh).
- An urgent text message appears large on a dark background under a flashing red **Urgent Announcement** label.
- When staff switch FLASH off or delete the item, normal rotation resumes automatically.

FLASH is controlled from the Advert Dashboard, not from the projector.

---

## Manual controls

Move the mouse and a small toolbar appears at the top right. It hides again after 3 seconds.

| Control | Toolbar button | Keyboard |
|---|---|---|
| Previous item | Left arrow | **Left arrow** key |
| Pause / resume | Pause / Play | **Space** |
| Next item | Right arrow | **Right arrow** key |

If the rotation seems stuck on one item, check it hasn't been paused. Press **Space** to resume.

---

## Troubleshooting

**"Waiting for approved adverts…" or a blank rotation**

1. On the Advert Dashboard, open the **Approved** tab.
2. Check items are set to display. The button should read **Hide**. If it reads **Display**, the item is hidden, so select **Display**.
3. Check for items still waiting in the **New** tab that need approving.

**The screen isn't changing, or shows old items**

1. Check the page isn't paused. Press **Space**.
2. Hard-refresh the page: **Ctrl + F5** (or **Ctrl + Shift + R**).
3. Re-enter full screen with **F11**.

**Stuck on "Loading the feed…", or changes never arrive**

- Check the projector computer's network or Wi-Fi connection.
- Open the address in another browser tab. If the home page won't load either, the problem is the network or the server. Contact whoever is running the system.
- If the connection drops, the page keeps playing what it already had, shows **OFFLINE MODE**, and catches up by itself once it's back (see [If the server or Wi-Fi drops out](#if-the-server-or-wi-fi-drops-out)).

**Only one message shows and adverts have stopped**

- A FLASH item is active. Ask staff to switch FLASH off or delete the item from the Advert Dashboard.

**Something inappropriate appears**

- Ask a member of staff to select **Hide** or **Reject** on the Advert Dashboard immediately. It leaves the screen within a few seconds.
- Pausing does not hide the current item. In an emergency, press the **Right arrow** key to move on, or blank the projector while staff act.
