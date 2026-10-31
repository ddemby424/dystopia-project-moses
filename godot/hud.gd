# hud.gd - screen stuff: health, kills, joystick (left), look drag (right), FIRE button.
extends CanvasLayer

var kills = 0
var label
var stick_finger = -1      # which finger is on the joystick (-1 = none)
var stick_center = Vector2.ZERO
var look_finger = -1
var stick_radius = 120.0   # TWEAK ME: joystick size in pixels
var fire_button

func _ready():
	label = Label.new()
	label.position = Vector2(20, 20)
	label.add_theme_font_size_override("font_size", 32)
	label.add_theme_color_override("font_color", Color(0, 1, 1))
	add_child(label)
	# Crosshair
	var cross = Label.new()
	cross.text = "+"
	cross.add_theme_font_size_override("font_size", 40)
	cross.set_anchors_preset(Control.PRESET_CENTER)
	add_child(cross)
	# FIRE button, bottom right
	fire_button = Button.new()
	fire_button.text = "FIRE"
	fire_button.add_theme_font_size_override("font_size", 40)
	fire_button.size = Vector2(200, 200)
	fire_button.set_anchors_preset(Control.PRESET_BOTTOM_RIGHT)
	fire_button.position = get_viewport().get_visible_rect().size - Vector2(240, 240)
	fire_button.pressed.connect(_on_fire)
	add_child(fire_button)

func player():
	return get_tree().get_first_node_in_group("player")

func _on_fire():
	if player(): player().shoot()

func _process(_delta):
	if player():
		label.text = "HEALTH %d   KILLS %d" % [player().health, kills]

# Touch: left half = joystick, right half = look
func _input(event):
	var p = player()
	if p == null:
		return
	var half = get_viewport().get_visible_rect().size.x / 2
	if event is InputEventScreenTouch:
		if event.pressed:
			if fire_button.get_global_rect().has_point(event.position):
				return   # the button handles itself
			if event.position.x < half and stick_finger == -1:
				stick_finger = event.index
				stick_center = event.position
			elif event.position.x >= half and look_finger == -1:
				look_finger = event.index
		else:
			if event.index == stick_finger:
				stick_finger = -1
				p.move_input = Vector2.ZERO
			if event.index == look_finger:
				look_finger = -1
	if event is InputEventScreenDrag:
		if event.index == stick_finger:
			p.move_input = ((event.position - stick_center) / stick_radius).limit_length(1.0)
		elif event.index == look_finger:
			p.look(event.relative)
