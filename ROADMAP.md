# DYSTOPIA roadmap

Honest snapshot of `/release-v2/`. This is the build friends and family can play. It is not a date.

## Playable now

- Single-player run from the yard into Server Hall G, through the fence, to the win and the epilogue.
- Sentinel 1 stands in the center of the hall at 28 m. It is the original dark-armor colossus (red eye, chest core), with a level leg step and no side sway. EMP still drops its shield. Weak points, footfalls, the shockwave, and the wreck are the existing colossus systems.
- Three Triage Mechs on floor G. They use the military mech and can be broken with the cannon.
- Extra ways out of the hall: east bay, west breach, and east service door, plus the old dock and airlock. An enemy who has the player outside paths through the opening.

## Known bugs

- Headless frame traces still show occasional long frames. Those are shader compiles on the software GPU. Phones warm shaders when the floor is built, and a hitch can still land if a new material shows up mid-fight.
- Sentinel 1’s red eye is a small block on the head bone. It is not a modeled visor. A concept image exists and is not in this build.
- The new openings are full-height cuts in the south wall, with a header and jambs. They are not fitted doors.
- Packs can still jam in a narrow rack aisle. The new doorways themselves stay open.
- The minimap does not draw the new doors.
- Destroying a knee still adds a small wreck-time roll. That is the limp, not the old side-to-side walk.

## Missing from the earlier design

- No custom sculpt of Sentinel 1. The hall boss is the original procedural colossus again. Darcy’s concept image is still not in the build.
- The boss bar still says Moses Colossus.
- Floors below G still use the smaller military-mech colossi, not unique machines.
- The yard skyline is still instanced blocks, not a city mesh.
- Nothing in the HUD teaches the grenade-and-run out a side door.

## Next

- Watch a real phone session for hitches and for enemies that stop in a doorway.
- If the CC0 walk reads wrong at 28 m, tune the clip speed, not the mesh.
- Name the boss Sentinel 1 on the bar once the look is accepted.
- A custom model only after the concept is approved, and only if the file stays albedo-only and under the phone budget.
