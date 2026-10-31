# player.gd - you! Moves, looks around and shoots.
extends CharacterBody3D

# --- TWEAK ME ---
var speed = 6.0            # walking speed (meters per second)
var look_speed = 0.004     # how fast dragging/mouse turns the camera
var health = 100
var gun_damage = 25

var camera
var ray
var flash
var flash_timer = 0.0
var move_input = Vector2.ZERO   # set by the HUD joystick
var gravity = 20.0

func _ready():
	add_to_group("player")
	# Body shape so we bump into walls
	var shape = CollisionShape3D.new()
	shape.shape = CapsuleShape3D.new()
	add_child(shape)
	# Camera = your eyes
	camera = Camera3D.new()
	camera.position = Vector3(0, 0.6, 0)
	add_child(camera)
	# Ray = invisible laser pointer that tells us what we hit
	ray = RayCast3D.new()
	ray.target_position = Vector3(0, 0, -100)
	ray.add_exception(self)
	camera.add_child(ray)
	# Muzzle flash = a yellow light that blinks when you fire
	flash = OmniLight3D.new()
	flash.light_color = Color(1, 0.8, 0.3)
	flash.light_energy = 0.0
	flash.position = Vector3(0.3, -0.2, -0.8)
	camera.add_child(flash)

# Turn the camera. Called by mouse or by the HUD drag.
func look(amount):
	rotate_y(-amount.x * look_speed)
	camera.rotate_x(-amount.y * look_speed)
	camera.rotation.x = clamp(camera.rotation.x, -1.4, 1.4)

func shoot():
	flash.light_energy = 6.0
	flash_timer = 0.06
	ray.force_raycast_update()
	var thing = ray.get_collider()
	if thing and thing.has_method("take_damage"):
		thing.take_damage(gun_damage)

func take_damage(amount):
	health = max(health - amount, 0)
	if health == 0:
		get_tree().reload_current_scene()   # you died: restart

# Keyboard + mouse
func _unhandled_input(event):
	if event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		look(event.relative)
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
		shoot()
	if event is InputEventKey and event.keycode == KEY_ESCAPE:
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE

func _physics_process(delta):
	# Read WASD, then add the touch joystick
	var dir = move_input
	if Input.is_physical_key_pressed(KEY_W): dir.y -= 1
	if Input.is_physical_key_pressed(KEY_S): dir.y += 1
	if Input.is_physical_key_pressed(KEY_A): dir.x -= 1
	if Input.is_physical_key_pressed(KEY_D): dir.x += 1
	dir = dir.limit_length(1.0)
	var move = transform.basis * Vector3(dir.x, 0, dir.y)
	velocity.x = move.x * speed
	velocity.z = move.z * speed
	velocity.y -= gravity * delta
	move_and_slide()
	# Fade out the muzzle flash
	flash_timer -= delta
	if flash_timer <= 0:
		flash.light_energy = 0.0
