# main.gd - builds the whole level when the game starts.
# Everything is made from code so you can read it top to bottom.
extends Node3D

# --- TWEAK ME ---
var fog_color = Color(0.25, 0.08, 0.06)   # reddish smog
var fog_density = 0.04                    # bigger = thicker fog
var floor_size = 60.0                     # meters

func _ready():
	make_world_mood()
	make_floor()
	# A few walls: position (x, z) and size (width, depth)
	make_wall(Vector3(0, 2, -30), Vector3(60, 4, 1))
	make_wall(Vector3(0, 2, 30), Vector3(60, 4, 1))
	make_wall(Vector3(-30, 2, 0), Vector3(1, 4, 60))
	make_wall(Vector3(30, 2, 0), Vector3(1, 4, 60))
	make_wall(Vector3(-6, 1.5, -8), Vector3(4, 3, 1))
	make_wall(Vector3(7, 1.5, -12), Vector3(1, 3, 6))

	# The player
	var player = CharacterBody3D.new()
	player.name = "Player"
	player.set_script(load("res://player.gd"))
	player.position = Vector3(0, 1, 10)
	add_child(player)

	# One Sentinel enemy
	var sentinel = CharacterBody3D.new()
	sentinel.set_script(load("res://sentinel.gd"))
	sentinel.position = Vector3(0, 1, -20)
	add_child(sentinel)

	# The HUD (health, kills, joystick, fire button)
	var hud = CanvasLayer.new()
	hud.name = "HUD"
	hud.set_script(load("res://hud.gd"))
	add_child(hud)

# Sky color, fog and lights
func make_world_mood():
	var env = Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = fog_color
	env.ambient_light_color = Color(0.4, 0.3, 0.3)
	env.ambient_light_energy = 0.5
	env.fog_enabled = true
	env.fog_light_color = fog_color
	env.fog_density = fog_density
	var world_env = WorldEnvironment.new()
	world_env.environment = env
	add_child(world_env)

	var sun = DirectionalLight3D.new()
	sun.light_color = Color(1.0, 0.6, 0.4)   # orange, smoky sun
	sun.light_energy = 0.8
	sun.rotation_degrees = Vector3(-50, 30, 0)
	add_child(sun)

	# A red warning lamp in the middle of the arena
	var lamp = OmniLight3D.new()
	lamp.light_color = Color(1, 0.1, 0.1)
	lamp.light_energy = 3.0
	lamp.omni_range = 15.0
	lamp.position = Vector3(0, 4, -5)
	add_child(lamp)

# Helper: make a solid box (something you can see AND bump into)
func make_box(pos, size, color):
	var body = StaticBody3D.new()
	body.position = pos
	var mesh = MeshInstance3D.new()
	var box = BoxMesh.new()
	box.size = size
	var mat = StandardMaterial3D.new()
	mat.albedo_color = color
	mat.roughness = 0.8
	box.material = mat
	mesh.mesh = box
	body.add_child(mesh)
	var shape = CollisionShape3D.new()
	var box_shape = BoxShape3D.new()
	box_shape.size = size
	shape.shape = box_shape
	body.add_child(shape)
	add_child(body)

func make_floor():
	make_box(Vector3(0, -0.5, 0), Vector3(floor_size, 1, floor_size), Color(0.12, 0.12, 0.13))

func make_wall(pos, size):
	make_box(pos, size, Color(0.22, 0.2, 0.2))
