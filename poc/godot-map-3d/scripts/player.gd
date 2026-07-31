extends CharacterBody3D

@export var speed := 3.2
@export var mouse_sensitivity := 0.0022
@export var gravity := 18.0
@onready var head: Node3D = $Head
@onready var mobile_controls: Control = get_node_or_null("../HUD/MobileControls")

func _ready() -> void:
    if not DisplayServer.is_touchscreen_available() and not OS.has_feature("mobile"):
        Input.mouse_mode = Input.MOUSE_MODE_CAPTURED

func _unhandled_input(event: InputEvent) -> void:
    if event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
        _apply_look(event.relative, mouse_sensitivity)
    if event is InputEventKey and event.pressed and event.keycode == KEY_ESCAPE:
        Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
    if event is InputEventMouseButton and event.pressed:
        Input.mouse_mode = Input.MOUSE_MODE_CAPTURED

func _physics_process(delta: float) -> void:
    var keyboard_input := Vector2(
        float(Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT)) - float(Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT)),
        float(Input.is_key_pressed(KEY_S) or Input.is_key_pressed(KEY_DOWN)) - float(Input.is_key_pressed(KEY_W) or Input.is_key_pressed(KEY_UP))
    )
    var touch_input := Vector2.ZERO
    if mobile_controls != null:
        touch_input = mobile_controls.get_move_vector()
        _apply_look(mobile_controls.consume_look_delta(), mobile_controls.look_sensitivity)

    var input := (keyboard_input + touch_input).limit_length(1.0)
    var direction := (transform.basis * Vector3(input.x, 0.0, input.y)).normalized()
    velocity.x = direction.x * speed
    velocity.z = direction.z * speed
    velocity.y = 0.0 if is_on_floor() else velocity.y - gravity * delta
    move_and_slide()

func _apply_look(delta: Vector2, sensitivity: float) -> void:
    rotate_y(-delta.x * sensitivity)
    head.rotate_x(-delta.y * sensitivity)
    head.rotation.x = clamp(head.rotation.x, -1.45, 1.45)
