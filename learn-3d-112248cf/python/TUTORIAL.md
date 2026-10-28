# Learn 3D games in Python (Ursina), in 7 tiny steps

Install with `pip install ursina` (Mac: `pip3`), then run `python stepN.py`. Each step file runs by itself.

## Step 1: The app, Entities and the update loop

`Ursina()` opens a window, every visible thing is an `Entity`, and a function called `update()` runs every frame. Multiply by `time.dt` so speed is the same on fast and slow computers.

```python
# STEP 1 - The app and your first Entity
from ursina import *

app = Ursina()                         # opens the game window

cube = Entity(model='cube', color=color.orange, texture='white_cube')

def update():                          # runs every frame (~60x per second)
    cube.rotation_y += 90 * time.dt    # time.dt = seconds since last frame

EditorCamera()                         # right-drag to orbit, scroll to zoom
app.run()
```

**You should see:** A spinning orange cube (right-drag to orbit).

**Try changing:** Change `90` to `400`, or `rotation_y` to `rotation_x`.

## Step 2: Models, textures, position & scale

An Entity's `model` is its shape, `texture` is the picture on it, and `position`/`scale` are (x, y, z): x = right, y = up, z = forward.

```python
# STEP 2 - Models, textures, position & scale
from ursina import *

app = Ursina()

floor = Entity(model='plane', scale=(20, 1, 20), texture='grass', texture_scale=(10, 10))
wall  = Entity(model='cube', position=(0, 1.5, 5), scale=(10, 3, 0.3),
               texture='brick', texture_scale=(5, 2), color=color.rgb32(200, 120, 100))

EditorCamera()
app.run()
```

**You should see:** A brick wall standing on grass.

**Try changing:** Set `texture_scale=(20, 8)` and see the bricks get tiny.

## Step 3: Rooms from cubes, with colliders

A wall is just a stretched cube. The `wall()` helper turns two corner points into one, and `collider='box'` makes it solid. Leaving a gap makes a doorway.

```python
# STEP 3 - Build two rooms + a hallway out of cubes (with colliders)
from ursina import *

app = Ursina()
H = 3  # wall height

def wall(x1, z1, x2, z2):
    """A brick wall from corner (x1,z1) to corner (x2,z2)."""
    sx, sz = max(abs(x2 - x1), 0.3), max(abs(z2 - z1), 0.3)
    return Entity(model='cube', collider='box', texture='brick',
                  texture_scale=(max(sx, sz) / 2, H / 2), color=color.rgb32(210, 130, 110),
                  position=((x1 + x2) / 2, H / 2, (z1 + z2) / 2), scale=(sx, H, sz))

Entity(model='plane', scale=(40, 1, 20), texture='white_cube', texture_scale=(40, 20),
       color=color.gray, collider='box')

for side in (-1, 1):                    # side=-1 -> left room, side=+1 -> right room
    inner, outer = 3 * side, 13 * side  # room spans x 3..13 (mirrored)
    wall(inner, 5, outer, 5)            # back wall
    wall(inner, -5, outer, -5)          # front wall
    wall(outer, -5, outer, 5)           # far wall
    wall(inner, 1.5, inner, 5)          # doorway wall, upper part
    wall(inner, -5, inner, -1.5)        # doorway wall, lower part

wall(-3, 1.5, 3, 1.5)                   # hallway walls
wall(-3, -1.5, 3, -1.5)

EditorCamera(rotation=(45, 0, 0))
camera.position = (0, 0, -40)
app.run()
```

**You should see:** Two brick rooms joined by a hallway, seen from above.

**Try changing:** Add `wall(-13, 0, -8, 0)` to split the left room in half.

## Step 4: The FirstPersonController

This ready-made player does WASD movement, mouse-look, gravity and jumping, and bumps into colliders.

```python
# STEP 4 - Walk around: the FirstPersonController
from ursina import *
from ursina.prefabs.first_person_controller import FirstPersonController

app = Ursina()
H = 3  # wall height

def wall(x1, z1, x2, z2):
    """A brick wall from corner (x1,z1) to corner (x2,z2)."""
    sx, sz = max(abs(x2 - x1), 0.3), max(abs(z2 - z1), 0.3)
    return Entity(model='cube', collider='box', texture='brick',
                  texture_scale=(max(sx, sz) / 2, H / 2), color=color.rgb32(210, 130, 110),
                  position=((x1 + x2) / 2, H / 2, (z1 + z2) / 2), scale=(sx, H, sz))

Entity(model='plane', scale=(40, 1, 20), texture='white_cube', texture_scale=(40, 20),
       color=color.gray, collider='box')

for side in (-1, 1):                    # side=-1 -> left room, side=+1 -> right room
    inner, outer = 3 * side, 13 * side  # room spans x 3..13 (mirrored)
    wall(inner, 5, outer, 5)            # back wall
    wall(inner, -5, outer, -5)          # front wall
    wall(outer, -5, outer, 5)           # far wall
    wall(inner, 1.5, inner, 5)          # doorway wall, upper part
    wall(inner, -5, inner, -1.5)        # doorway wall, lower part

wall(-3, 1.5, 3, 1.5)                   # hallway walls
wall(-3, -1.5, 3, -1.5)

player = FirstPersonController(position=(-8, 1, 0), speed=6)  # WASD + mouse, space = jump
# colliders on the walls stop you walking through them. Press Esc to quit.
app.run()
```

**You should see:** You walk around inside. Walls stop you. Esc quits.

**Try changing:** Try `speed=15` and `jump_height=4`.

## Step 5: A hand on the camera (viewmodel)

Setting `parent=camera` glues the hand to your view, so it turns when you look around. It's built from small cubes parented to one `hand` Entity, so moving `hand` moves them all.

```python
# STEP 5 - A first-person hand (viewmodel)
from ursina import *
from ursina.prefabs.first_person_controller import FirstPersonController

app = Ursina()
H = 3  # wall height

def wall(x1, z1, x2, z2):
    """A brick wall from corner (x1,z1) to corner (x2,z2)."""
    sx, sz = max(abs(x2 - x1), 0.3), max(abs(z2 - z1), 0.3)
    return Entity(model='cube', collider='box', texture='brick',
                  texture_scale=(max(sx, sz) / 2, H / 2), color=color.rgb32(210, 130, 110),
                  position=((x1 + x2) / 2, H / 2, (z1 + z2) / 2), scale=(sx, H, sz))

Entity(model='plane', scale=(40, 1, 20), texture='white_cube', texture_scale=(40, 20),
       color=color.gray, collider='box')

for side in (-1, 1):                    # side=-1 -> left room, side=+1 -> right room
    inner, outer = 3 * side, 13 * side  # room spans x 3..13 (mirrored)
    wall(inner, 5, outer, 5)            # back wall
    wall(inner, -5, outer, -5)          # front wall
    wall(outer, -5, outer, 5)           # far wall
    wall(inner, 1.5, inner, 5)          # doorway wall, upper part
    wall(inner, -5, inner, -1.5)        # doorway wall, lower part

wall(-3, 1.5, 3, 1.5)                   # hallway walls
wall(-3, -1.5, 3, -1.5)

player = FirstPersonController(position=(-8, 1, 0), speed=6)  # WASD + mouse, space = jump
# colliders on the walls stop you walking through them. Press Esc to quit.

# The hand: parented to the CAMERA so it follows your view (a 'viewmodel')
skin = color.rgb32(230, 180, 140)
hand = Entity(parent=camera, position=(0.45, -0.45, 0.9), rotation=(10, -15, 0))
Entity(parent=hand, model='cube', scale=(0.25, 0.1, 0.3), color=skin)           # palm
for i in range(4):                                                               # fingers
    Entity(parent=hand, model='cube', scale=(0.05, 0.06, 0.18), color=skin,
           position=(-0.09 + i * 0.06, 0, 0.22))
Entity(parent=hand, model='cube', scale=(0.06, 0.06, 0.14), color=skin,
       position=(-0.15, 0, 0.05), rotation=(0, -40, 0))                         # thumb
Entity(parent=hand, model='cube', scale=(0.2, 0.09, 0.4), color=color.rgb32(40, 40, 60),
       position=(0, 0, -0.3))                                                    # sleeve
app.run()
```

**You should see:** A blocky hand with a sleeve in the bottom-right.

**Try changing:** Move it to the left side with `position=(-0.45, -0.45, 0.9)`.

## Step 6: Bobbing with time.dt

`sin()` swings smoothly between -1 and 1. Pushing `t` forward only while a WASD key is held makes the hand bob as you walk and settle when you stop.

```python
# STEP 6 - Hand bob with time.dt
from ursina import *
from ursina.prefabs.first_person_controller import FirstPersonController

app = Ursina()
H = 3  # wall height

def wall(x1, z1, x2, z2):
    """A brick wall from corner (x1,z1) to corner (x2,z2)."""
    sx, sz = max(abs(x2 - x1), 0.3), max(abs(z2 - z1), 0.3)
    return Entity(model='cube', collider='box', texture='brick',
                  texture_scale=(max(sx, sz) / 2, H / 2), color=color.rgb32(210, 130, 110),
                  position=((x1 + x2) / 2, H / 2, (z1 + z2) / 2), scale=(sx, H, sz))

Entity(model='plane', scale=(40, 1, 20), texture='white_cube', texture_scale=(40, 20),
       color=color.gray, collider='box')

for side in (-1, 1):                    # side=-1 -> left room, side=+1 -> right room
    inner, outer = 3 * side, 13 * side  # room spans x 3..13 (mirrored)
    wall(inner, 5, outer, 5)            # back wall
    wall(inner, -5, outer, -5)          # front wall
    wall(outer, -5, outer, 5)           # far wall
    wall(inner, 1.5, inner, 5)          # doorway wall, upper part
    wall(inner, -5, inner, -1.5)        # doorway wall, lower part

wall(-3, 1.5, 3, 1.5)                   # hallway walls
wall(-3, -1.5, 3, -1.5)

player = FirstPersonController(position=(-8, 1, 0), speed=6)  # WASD + mouse, space = jump
# colliders on the walls stop you walking through them. Press Esc to quit.

# The hand: parented to the CAMERA so it follows your view (a 'viewmodel')
skin = color.rgb32(230, 180, 140)
hand = Entity(parent=camera, position=(0.45, -0.45, 0.9), rotation=(10, -15, 0))
Entity(parent=hand, model='cube', scale=(0.25, 0.1, 0.3), color=skin)           # palm
for i in range(4):                                                               # fingers
    Entity(parent=hand, model='cube', scale=(0.05, 0.06, 0.18), color=skin,
           position=(-0.09 + i * 0.06, 0, 0.22))
Entity(parent=hand, model='cube', scale=(0.06, 0.06, 0.14), color=skin,
       position=(-0.15, 0, 0.05), rotation=(0, -40, 0))                         # thumb
Entity(parent=hand, model='cube', scale=(0.2, 0.09, 0.4), color=color.rgb32(40, 40, 60),
       position=(0, 0, -0.3))                                                    # sleeve

# Bobbing: move the hand along a sine wave, but only while walking
t = 0
def update():
    global t
    moving = held_keys['w'] or held_keys['a'] or held_keys['s'] or held_keys['d']
    if moving:
        t += time.dt * 10
    else:
        t = lerp(t, round(t / 3.1416) * 3.1416, time.dt * 5)   # ease back to rest
    hand.y = -0.45 + abs(sin(t)) * -0.04
    hand.x = 0.45 + sin(t) * 0.03
app.run()
```

**You should see:** The hand bobs left and right while you walk.

**Try changing:** Change `* 10` to `* 25` for a sprint bob.

## Step 7: Lighting

A `DirectionalLight` is the sun and `AmbientLight` is soft fill. The `lit_with_shadows_shader` makes entities react to light, and `Sky()` adds a sky.

```python
# STEP 7 - Lighting (the finished project!)
from ursina import *
from ursina.prefabs.first_person_controller import FirstPersonController

app = Ursina()
H = 3  # wall height

def wall(x1, z1, x2, z2):
    """A brick wall from corner (x1,z1) to corner (x2,z2)."""
    sx, sz = max(abs(x2 - x1), 0.3), max(abs(z2 - z1), 0.3)
    return Entity(model='cube', collider='box', texture='brick',
                  texture_scale=(max(sx, sz) / 2, H / 2), color=color.rgb32(210, 130, 110),
                  position=((x1 + x2) / 2, H / 2, (z1 + z2) / 2), scale=(sx, H, sz))

Entity(model='plane', scale=(40, 1, 20), texture='white_cube', texture_scale=(40, 20),
       color=color.gray, collider='box')

for side in (-1, 1):                    # side=-1 -> left room, side=+1 -> right room
    inner, outer = 3 * side, 13 * side  # room spans x 3..13 (mirrored)
    wall(inner, 5, outer, 5)            # back wall
    wall(inner, -5, outer, -5)          # front wall
    wall(outer, -5, outer, 5)           # far wall
    wall(inner, 1.5, inner, 5)          # doorway wall, upper part
    wall(inner, -5, inner, -1.5)        # doorway wall, lower part

wall(-3, 1.5, 3, 1.5)                   # hallway walls
wall(-3, -1.5, 3, -1.5)

player = FirstPersonController(position=(-8, 1, 0), speed=6)  # WASD + mouse, space = jump
# colliders on the walls stop you walking through them. Press Esc to quit.

# The hand: parented to the CAMERA so it follows your view (a 'viewmodel')
skin = color.rgb32(230, 180, 140)
hand = Entity(parent=camera, position=(0.45, -0.45, 0.9), rotation=(10, -15, 0))
Entity(parent=hand, model='cube', scale=(0.25, 0.1, 0.3), color=skin)           # palm
for i in range(4):                                                               # fingers
    Entity(parent=hand, model='cube', scale=(0.05, 0.06, 0.18), color=skin,
           position=(-0.09 + i * 0.06, 0, 0.22))
Entity(parent=hand, model='cube', scale=(0.06, 0.06, 0.14), color=skin,
       position=(-0.15, 0, 0.05), rotation=(0, -40, 0))                         # thumb
Entity(parent=hand, model='cube', scale=(0.2, 0.09, 0.4), color=color.rgb32(40, 40, 60),
       position=(0, 0, -0.3))                                                    # sleeve

# Bobbing: move the hand along a sine wave, but only while walking
t = 0
def update():
    global t
    moving = held_keys['w'] or held_keys['a'] or held_keys['s'] or held_keys['d']
    if moving:
        t += time.dt * 10
    else:
        t = lerp(t, round(t / 3.1416) * 3.1416, time.dt * 5)   # ease back to rest
    hand.y = -0.45 + abs(sin(t)) * -0.04
    hand.x = 0.45 + sin(t) * 0.03

# Lighting: a sun that casts shadows + soft ambient fill + a sky
from ursina.shaders import lit_with_shadows_shader
for e in scene.entities:              # make everything react to light
    if e.model: e.shader = lit_with_shadows_shader
sun = DirectionalLight(shadows=True, color=color.rgb32(255, 235, 200))
sun.look_at(Vec3(1, -1, 1))
AmbientLight(color=color.rgba32(90, 90, 110, 255))
Sky()


app.run()
```

**You should see:** Shaded brick walls with sunlight, shadows and a sky.

**Try changing:** Change `Vec3(1, -1, 1)` to `Vec3(-1, -0.3, 0)` for a sunset angle.
