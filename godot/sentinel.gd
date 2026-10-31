# sentinel.gd - an AI Sentinel robot. Chases you, hurts you, dies when shot.
extends CharacterBody3D

# --- TWEAK ME ---
var speed = 3.0
var health = 100
var attack_damage = 10
var eye_color = Color(1, 0, 0)

var attack_timer = 0.0
var body_mat

func _ready():
	# Body: a dark metal capsule
	var body = MeshInstance3D.new()
	body.mesh = CapsuleMesh.new()
	body_mat = StandardMaterial3D.new()
	body_mat.albedo_color = Color(0.3, 0.3, 0.35)
	body_mat.metallic = 0.8
	body.mesh.material = body_mat
	add_child(body)
	# Eye: a glowing sphere on the front (front = -Z)
	var eye = MeshInstance3D.new()
	var ball = SphereMesh.new()
	ball.radius = 0.15
	ball.height = 0.3
	var eye_mat = StandardMaterial3D.new()
	eye_mat.albedo_color = eye_color
	eye_mat.emission_enabled = true
	eye_mat.emission = eye_color
	eye_mat.emission_energy_multiplier = 4.0
	ball.material = eye_mat
	eye.mesh = ball
	eye.position = Vector3(0, 0.5, -0.45)
	add_child(eye)
	# Little red light so the eye glows on the world too
	var glow = OmniLight3D.new()
	glow.light_color = eye_color
	glow.omni_range = 3.0
	glow.position = eye.position
	add_child(glow)
	# Collision so bullets and walls hit it
	var shape = CollisionShape3D.new()
	shape.shape = CapsuleShape3D.new()
	add_child(shape)

func _physics_process(delta):
	var player = get_tree().get_first_node_in_group("player")
	if player == null:
		return
	var to_player = player.global_position - global_position
	to_player.y = 0
	# Face the player
	if to_player.length() > 0.1:
		look_at(global_position + to_player, Vector3.UP)
	# Chase, or attack when close
	attack_timer -= delta
	if to_player.length() > 1.8:
		var dir = to_player.normalized()
		velocity = dir * speed
		move_and_slide()
	elif attack_timer <= 0:
		player.take_damage(attack_damage)
		attack_timer = 1.0   # one hit per second

func take_damage(amount):
	health -= amount
	body_mat.albedo_color = Color(1, 1, 1)   # flash white when hit
	await get_tree().create_timer(0.08).timeout
	if not is_instance_valid(self):
		return
	body_mat.albedo_color = Color(0.3, 0.3, 0.35)
	if health <= 0:
		var hud = get_tree().root.get_node_or_null("Main/HUD")
		if hud: hud.kills += 1
		queue_free()
