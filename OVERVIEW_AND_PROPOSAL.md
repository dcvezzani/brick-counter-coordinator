## Introduction and Overview

I love Legos.  I love building them.  I love discovering bricks and minifigs I have never seen before.  I have a Lego business that includes several tasks.  One of those tasks that tasks quite a bit of time is sorting out and counting legos.  Currently, we have one or two who count legos while one person logs them in.

Problems:
- two people may separate Legos in separate cups and not know there are cups with "duplicate" cups that exist
- usually, the process requires one loop for sorting and another for counting; again, inefficient use of time
- there is dead time for the person entering data in the system
- there are lots of interruptions for those who are counting while reporting to the person who is logging in

Proposal:
- more people work together to accellerate the sorting/counting process
- workers put Lego parts in a cup; these parts might be of one or multiple colors
- there can be multiple cups in existence that contain the same parts; most of the time, cups should represent distinct parts
- provide the option to count and sort in cups at the same time, potentially saving time
- each worker is recording counts on their own device
- a central server is responsible for capturing counts from each user, keeping the data consolidated
- each worker is notified when a virtual cup with Lego parts already exists
- when the sorting/counting is done, the server provides a list of parts
- that list can then be compared with the official part-out list to identify discrepancies
- workers work through the descrepancies
- the final, reconciled part-out list is submitted to Bricklink
- the part-out list is divided up between the workers, each having their own parts to distribute to their respective organizer container

## UI

I enjoy a good UI, but I am not a front end or UX engineer.  I hate pushing pixels, but I strongly value an engaging and elegant interface.  I would like to use ShadCN to handle UX/UI implementation. I have been told it is a great way to be used by AI to create engaging sand elegant interfaces.

## Tech Stack

### clients
- html:5 web application run on a browser on a mobile device (e.g., phone, ipad)
- JavaScript
- css

#### features
- this is what workers use to enter each Lego piece, their color and condition
- it should be a form that includes a text field for the lego part number, a part picker input control, a color picker input control, a condition switch (new, used), a text field for the count and a submit button
  - a part picker input control should be used to populate the lego part number text field
- the form controls should all fit in the device display without the need to scroll
- messages may be displayed per cup based on certain conditions
  - if the lego/color/condition (aka "lot") already exists, indicate who created the lot? how many legos in each cup
  - cups may consist of one or multiple colors

### client (current — see [docs/tech-stack.md](docs/tech-stack.md))
- Vue 3 + Vite
- shadcn-vue + Tailwind CSS v4
- Lucide icons (replaces Font Awesome)
- Vue Router
- JavaScript on the client (`components.json` → `typescript: false`)
- **Unit 0 storyboard:** navigable UI, fixture data, no backend yet

### server (planned — `/design`)
- Node.js
- WebSockets
- BrickLink via AJAX/fetch (no iframes)

#### features
- handle client requests from worker devices
- create a part-out session by submitting part-out details for a given set
- worker clients may select the session id from a list which should result in a form where lego parts for a given color and condition may be added
- collect data (lego part id, color condition) for a given part out set from worker client requests
- create a reconciliation report which includes part entries that are an exact match and entries that do not; include a filter to optionally focus on the entries that do not match
  - a worker will use this to resolve any discrepancies in the reconciliation process
- once reconciliation is final and issues have been resolved, a button can be pressed to split up the part out list into relatively even numbers of set entries for each worker associated with the session
- these lists can either be printed by a printer or pushed out to workers who are currently in a related session page
  - these should be used by each worker to know where parts should be put, using the location value associated with the organization drawers and containers
  - each entry should have a checkbox the worker may use to keep track of which Lego parts have already been put in their respective organization drawer or bin
